import React, { createContext, useContext, useEffect, useMemo, useState } from "react";


// CartContext con backend + access_token
const API_URL = import.meta.env.VITE_API_URL

// Obtención del token: usa una de estas fuentes
function getAccessToken() {
  // 1) AuthProvider que expone window.getAccessToken
  const w = typeof window !== "undefined" ? window : undefined;
  const fromFn = w && typeof w.getAccessToken === "function" ? w.getAccessToken() : null;
  // 2) localStorage
  const fromLS = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
  return fromFn || fromLS || null;
}

async function http(path, { method = "GET", body } = {}) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    mode: "cors",
    credentials: "include",
  });

  if (res.status === 401) {
    // No autorizado: devuelve un error explícito para que la UI redirija al login
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "No autorizado. Inicia sesión para ver tu carrito.");
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (res.status === 204) return {};
  const raw = await res.text();
  if (!raw || !raw.trim()) return {};
  if (ct.includes("application/json")) {
    try { return JSON.parse(raw); } catch (e) { throw new Error(`Respuesta JSON inválida: ${e.message}`); }
  }
  try { return JSON.parse(raw); } catch { return { __raw: raw }; }
}

// Endpoints del backend
async function apiGetCart() { return http("/cart"), { method: "GET" }; }

async function apiAddItems({ articleId, quantity }) {
  return http("/cart/items", { method: "POST", body: { article_id: [String(articleId)], quantity: [Number(quantity)] } });
}
async function apiPatchItem(productId, qty) {
  return http(`/cart/items/${productId}`, { method: "PATCH", body: { quantity: Number(qty) } });
}
async function apiDeleteItem(productId) {
  // Algunos backends requieren quantity también en DELETE; manda 0 por convención.
  return http(`/cart/items/${productId}`, { method: "DELETE", body: { quantity: 0 } });
}
async function apiClearCart() { return http(`/cart/`, { method: "DELETE", body: { quantity: 0 } }); }

// Adaptador de respuesta -> shape interno del UI
function adaptCart(apiCart) {
  if (apiCart && apiCart.__raw) throw new Error(apiCart.__raw);
  const items = (apiCart?.items || []).map((it) => ({
    id: String(it.article_id ?? it.id ?? crypto.randomUUID()),
    productId: String(it.article_id ?? it.id ?? ""),
    title: it.title ?? it.name ?? "Producto",
    price: Number(it.price ?? 0),
    image: it.image ?? it.thumbnail ?? "https://via.placeholder.com/80x80.png?text=Producto",
    qty: Number(it.quantity ?? it.qty ?? 1),
  }));
  const subtotal = typeof apiCart?.total === "number" ? apiCart.total : items.reduce((s,i)=>s+i.price*i.qty,0);
  const count = items.reduce((c,i)=>c+i.qty,0);
  return { id: apiCart?.cart_id ?? apiCart?.id ?? null, items, subtotal, count };
}

// Toasts context opcional
const ToastContext = React.createContext(null);
function useToasts() { return useContext(ToastContext); }

// ===============================
// Cart Context
// ===============================
const CartContext = createContext(null);
export function useCart() { return useContext(CartContext); }

export function CartProvider({ children }) {
  const toasts = useToasts();
  const [cart, setCart] = useState({ id: null, items: [], subtotal: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const syncFromServer = async () => {
    setLoading(true);
    try {
      const data = await apiGetCart();
      setCart(adaptCart(data));
      setError(null);
    } catch (e) {
      setError(e.message);
      toasts?.error(e.message.includes("No autorizado") ? "Inicia sesión para ver tu carrito" : "No se pudo cargar el carrito");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { syncFromServer(); }, []);

  const setOptimistic = (updater) => setCart((prev) => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    return { ...prev, ...next };
  });

  const addItem = async ({ productId, title, price, image, qty = 1 }) => {
    setOptimistic((prev) => {
      const idx = prev.items.findIndex((i) => i.productId === productId);
      let items;
      if (idx >= 0) items = prev.items.map((i, k) => (k === idx ? { ...i, qty: i.qty + qty } : i));
      else items = [...prev.items, { id: crypto.randomUUID(), productId, title: title ?? "Producto", price: price ?? 0, image, qty }];
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      return { items, subtotal, count: items.reduce((c, i) => c + i.qty, 0) };
    });
    try {
      await apiAddItems({ articleId: productId, quantity: qty });
      const fresh = await apiGetCart();
      setCart(adaptCart(fresh));
      toasts?.success("Producto agregado");
    } catch (e) {
      toasts?.error(e.message);
      await syncFromServer();
    }
  };

  const updateQty = async (itemId, qty) => {
    if (qty <= 0) return removeItem(itemId);
    const productId = cart.items.find((i) => i.id === itemId)?.productId ?? itemId;
    setOptimistic((prev) => {
      const items = prev.items.map((i) => (i.id === itemId ? { ...i, qty } : i));
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      return { items, subtotal, count: items.reduce((c, i) => c + i.qty, 0) };
    });
    try {
      await apiPatchItem(productId, qty);
      const fresh = await apiGetCart();
      setCart(adaptCart(fresh));
      toasts?.success("Cantidad actualizada");
    } catch (e) {
      toasts?.error(e.message);
      await syncFromServer();
    }
  };

  const removeItem = async (itemId) => {
    const productId = cart.items.find((i) => i.id === itemId)?.productId ?? itemId;
    setOptimistic((prev) => {
      const items = prev.items.filter((i) => i.id !== itemId);
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      return { items, subtotal, count: items.reduce((c, i) => c + i.qty, 0) };
    });
    try {
      await apiDeleteItem(productId);
      const fresh = await apiGetCart();
      setCart(adaptCart(fresh));
      toasts?.success("Producto eliminado");
    } catch (e) {
      toasts?.error(e.message);
      await syncFromServer();
    }
  };

  const clearCart = async () => {
    const backup = cart;
    setCart({ id: cart.id, items: [], subtotal: 0, count: 0 });
    try {
      await apiClearCart();
      const fresh = await apiGetCart();
      setCart(adaptCart(fresh));
      toasts?.success("Carrito vaciado");
    } catch (e) {
      setCart(backup);
      toasts?.error(e.message);
    }
  };

  const value = useMemo(
    () => ({ cart, loading, error, addItem, updateQty, removeItem, clearCart, refresh: syncFromServer }),
    [cart, loading, error]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
