import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL;
const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const { token, isLoggedIn } = useAuth();

  const [cart, setCart] = useState({ items: [], subtotal: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Use a single place to derive auth headers so token handling is consistent across all cart calls
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

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
          // Keep credentials disabled so this API stays token-based and does not depend on cookies
          // mode: "cors" // default
        });
        return res;
      } catch (e) {
        // Wrap low-level network/CORS failures into a controlled error so the UI can show a friendlier message
        const err = new Error("Network error / CORS");
        err.cause = e;
        throw err;
      }
    },
    [token]
  );

  function normalizeCart(data) {
    const items = (data?.items ?? []).map((row) => {
      // Force string IDs so they can be used safely as React keys and URL segments
      const articleId = String(row.ARTICLE_ID);
      const title = row.PROD_NAME ?? "Producto";
      const price = Number(row.PRICE ?? 0);
      const qty = Number(row.QUANTITY ?? 1);
      // Prefer backend line total but fall back to client-side calculation to keep UI usable if the API omits it
      const lineTotal = Number(row.LINE_TOTAL ?? price * qty);

      // Prefer a full URL, then a key, and finally a static placeholder so the UI never breaks on missing images
      const image =
        row.IMAGE_URL ??
        row.IMAGE_KEY ??
        "/placeholder.png";

      return {
        id: articleId, // Used as identifier for PATCH/DELETE /items/<ARTICLE_ID>
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

  // GET /api/cart
  async function fetchCart() {
    if (!isLoggedIn || !token) {
      // Reset local state when there is no active session so the UI does not show stale cart data
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
  async function addItem({ productId, qty = 1, onUnauthenticated }) {
    if (!token) {
      // Show a soft warning instead of throwing so UX is smoother when user is not logged in
      toast.info("Debes iniciar sesión para agregar productos al carrito.", { icon: "🔒" });
      setError("No hay sesión activa.");
      if (onUnauthenticated) onUnauthenticated();
      return;
    }

    const body = { article_id: String(productId), quantity: Number(qty) };

    const res = await authedFetch(`${API_URL}/cart/items`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await buildHttpError(res, "POST /cart/items");
    await fetchCart();

    toast.success("Producto agregado al carrito.", { icon: "🛒" });
  }

  // PATCH /api/cart/items/<product_ID>  { quantity }
  async function updateQty(articleId, quantity) {
    if (!token) throw new Error("No hay sesión activa.");
    const res = await authedFetch(`${API_URL}/cart/items/${articleId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: Number(quantity) }),
    });
    if (!res.ok) throw await buildHttpError(res, "PATCH /cart/items/<id>");
    // Refetch instead of mutating local state by hand to keep the source of truth in the backend
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
      // Reset cart state on logout so the UI does not keep showing data from a previous user
      setCart({ items: [], subtotal: 0, count: 0 });
      setLoading(false);
      setError("");
    }
    // Ignore other dependencies intentionally to avoid re-fetching on every function re-creation
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

async function buildHttpError(res, label) {
  let detail = "";
  try {
    const json = await res.json();
    // Try to surface the most meaningful backend message so debugging and user feedback are easier
    detail = json?.error || json?.message || JSON.stringify(json);
  } catch {
    // Swallow JSON parsing errors so we still return a usable error object
  }
  const err = new Error(`${label} -> ${res.status}${detail ? ` | ${detail}` : ""}`);
  err.status = res.status;
  err.detail = detail;
  return err;
}

function messageFromError(e, fallback) {
  if (!e) return fallback;
  // Special-case network/CORS errors to guide backend configuration troubleshooting
  if (e.message === "Network error / CORS") return "Fallo de red/CORS (revisa CORS del backend y URL).";
  if (e.detail) return e.detail;
  if (e.message) return e.message;
  return fallback;
}
