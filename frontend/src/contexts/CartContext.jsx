// src/contexts/CartContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {toast} from 'react-toastify';


const API_URL = import.meta.env.VITE_API_URL;
const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const { token, isLoggedIn } = useAuth();


  const [cart, setCart] = useState({ items: [], subtotal: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Header autorization with token
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch wrapper with auth headers
  const authedFetch = useCallback(
    async (url, options = {}) => {
      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            ...authHeaders,
          },
          // NO credentials included
          // mode: "cors" // default
        });
        return res;
      } catch (e) {
        // Network / CORS error
        const err = new Error("Network error / CORS");
        err.cause = e;
        throw err;
      }
    },
    [token]
  );

  // Normalize cart data from API to frontend format
  function normalizeCart(data) {
    const items = (data?.items ?? []).map((row) => {
      const articleId = String(row.ARTICLE_ID);
      const title = row.PROD_NAME ?? "Producto";
      const price = Number(row.PRICE ?? 0);
      const qty = Number(row.QUANTITY ?? 1);
      const lineTotal = Number(row.LINE_TOTAL ?? price * qty);

      // Image fallbacks: IMAGE_URL > IMAGE_KEY > placeholder
      const image =
        row.IMAGE_URL ??
        row.IMAGE_KEY ??
        "/placeholder.png";

      return {
        id: articleId,               // key for PATCH/DELETE /items/<ARTICLE_ID>
        articleId,
        cartItemId: Number(row.CART_ITEM_ID ?? 0),
        title,
        image,
        price,
        qty,
        lineTotal,
      };
    });

    const subtotal = Number(
      data?.total ??
      items.reduce((s, it) => s + it.price * it.qty, 0)
    );
    const count = items.reduce((s, it) => s + it.qty, 0);

    return { items, subtotal, count };
  }

// CRUD API calls

  // GET /api/cart
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
  async function addItem({ productId, qty = 1,onUnauthenticated }) {
    if (!token){
      toast.info("Debes iniciar sesión para agregar productos al carrito.", {icon: '🔒',});
      setError("No hay sesión activa.");
      if(onUnauthenticated) onUnauthenticated();
      return;
    }

    //Active session
    const body = { article_id: String(productId), quantity: Number(qty) };

    const res = await authedFetch(`${API_URL}/cart/items`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await buildHttpError(res, "POST /cart/items");
    await fetchCart();

    toast.success("Producto agregado al carrito.", { icon: '🛒' });
  }

  // PATCH /api/cart/items/<product_ID>  { quantity }
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
      setError("");
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

// Error helpers
async function buildHttpError(res, label) {
  let detail = "";
  try {
    const json = await res.json();
    detail = json?.error || json?.message || JSON.stringify(json);
  } catch {
    // no JSON
  }
  const err = new Error(`${label} -> ${res.status}${detail ? ` | ${detail}` : ""}`);
  err.status = res.status;
  err.detail = detail;
  return err;
}

function messageFromError(e, fallback) {
  if (!e) return fallback;
  if (e.message === "Network error / CORS") return "Fallo de red/CORS (revisa CORS del backend y URL).";
  if (e.detail) return e.detail;
  if (e.message) return e.message;
  return fallback;
}
