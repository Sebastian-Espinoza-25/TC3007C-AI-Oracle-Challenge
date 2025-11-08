// src/contexts/CartContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";

const API_URL = import.meta.env.VITE_API_URL; // p. ej., http://127.0.0.1:8080/api
const CartCtx = createContext(null);

/**
 * CartProvider
 * - Normaliza la respuesta del backend
 * - Inyecta Authorization: Bearer <token> en todas las solicitudes
 * - Expone CRUD del carrito: fetchCart, addItem, updateQty, removeItem, clearCart
 */
export function CartProvider({ children }) {
  const { token, isLoggedIn } = useAuth();

  const [cart, setCart] = useState({ items: [], subtotal: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Headers con Bearer si hay token
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Wrapper de fetch autenticado (sin cookies)
  const authedFetch = useCallback(
    async (url, options = {}) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          ...authHeaders,
        },
        // credentials: "omit", // explícito si quieres forzarlo
      });
      return res;
    },
    [token]
  );

  // -----------------------------
  // Normalización de estructura
  // -----------------------------
  function normalizeCart(data) {
    const items = (data?.items ?? []).map((row) => ({
      id: String(row.ARTICLE_ID),                 // clave para PATCH/DELETE /items/<ARTICLE_ID>
      articleId: String(row.ARTICLE_ID),
      cartItemId: Number(row.CART_ITEM_ID ?? 0),  // opcional si lo usas
      title: row.PROD_NAME ?? "Producto",
      price: Number(row.PRICE ?? 0),
      qty: Number(row.QUANTITY ?? 1),
      lineTotal: Number(row.LINE_TOTAL ?? 0),
    }));

    // Puedes confiar en data.total o recalcular
    const subtotal = Number(
      data?.total ??
      items.reduce((s, it) => s + it.price * it.qty, 0)
    );
    const count = items.reduce((s, it) => s + it.qty, 0);

    return { items, subtotal, count };
  }

  // --------------------------------
  // Operaciones expuestas (CRUD)
  // --------------------------------
  async function fetchCart() {
    if (!isLoggedIn || !token) {
      setCart({ items: [], subtotal: 0, count: 0 });
      setLoading(false);
      setError("No hay sesión activa.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await authedFetch(`${API_URL}/cart/`, { method: "GET" });
      if (!res.ok) throw await buildHttpError(res, "GET /cart");
      const data = await res.json();
      setCart(normalizeCart(data));
    } catch (e) {
      setError(messageFromError(e, "No se pudo cargar el carrito."));
    } finally {
      setLoading(false);
    }
  }

  // POST /api/cart/items  { article_id, quantity }
  async function addItem({ productId, qty = 1 }) {
    if (!token) throw new Error("No hay sesión activa.");
    const body = { article_id: String(productId), quantity: Number(qty) };

    const res = await authedFetch(`${API_URL}/cart/items`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await buildHttpError(res, "POST /cart/items");
    await fetchCart();
  }

  // PATCH /api/cart/items/<product_ID>  { quantity }
  // product_ID == ARTICLE_ID
  async function updateQty(articleId, quantity) {
    if (!token) throw new Error("No hay sesión activa.");
    const res = await authedFetch(`${API_URL}/cart/items/${articleId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: Number(quantity) }),
    });
    if (!res.ok) throw await buildHttpError(res, "PATCH /cart/items/<id>");
    await fetchCart();
  }

  // DELETE /api/cart/items/<product_ID>
  async function removeItem(articleId) {
    if (!token) throw new Error("No hay sesión activa.");
    const res = await authedFetch(`${API_URL}/cart/items/${articleId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw await buildHttpError(res, "DELETE /cart/items/<id>");
    await fetchCart();
  }

  // DELETE /api/cart/
  async function clearCart() {
    if (!token) throw new Error("No hay sesión activa.");
    const res = await authedFetch(`${API_URL}/cart/`, { method: "DELETE" });
    if (!res.ok) throw await buildHttpError(res, "DELETE /cart");
    await fetchCart();
  }

  useEffect(() => {
    if (token) fetchCart();
    else {
      setCart({ items: [], subtotal: 0, count: 0 });
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = {
    cart,
    loading,
    error,
    fetchCart,
    addItem,
    updateQty,
    removeItem,
    clearCart,
  };

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);

// -----------------------------
// Helpers de error legible
// -----------------------------
async function buildHttpError(res, label) {
  let detail = "";
  try {
    const json = await res.json();
    detail = json?.error || json?.message || JSON.stringify(json);
  } catch {
    // ignora si no es JSON
  }
  const err = new Error(`${label} -> ${res.status}${detail ? ` | ${detail}` : ""}`);
  err.status = res.status;
  err.detail = detail;
  return err;
}

function messageFromError(e, fallback) {
  if (!e) return fallback;
  if (e.detail) return e.detail;
  if (e.message) return e.message;
  return fallback;
}
