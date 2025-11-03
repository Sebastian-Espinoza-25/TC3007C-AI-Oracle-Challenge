import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

// Demo store helpers (sin backend)
const CART_STORE_KEY = "demo_cart_data";
function readStore() { try { return JSON.parse(localStorage.getItem(CART_STORE_KEY)) || null; } catch { return null; } }
function writeStore(data) { localStorage.setItem(CART_STORE_KEY, JSON.stringify(data)); }
function ensureCart() {
  const now = readStore();
  if (now) return now;
  const seed = { id: crypto.randomUUID(), items: [], subtotal: 0, count: 0 };
  writeStore(seed);
  return seed;
}
function delay(ms = 450) { return new Promise(r => setTimeout(r, ms)); }

// API simulada
async function apiFetch(path, { method = "GET", body } = {}) {
  await delay();
  let cart = ensureCart();
  if (path === "/cart" && method === "GET") return cart;
  if (path === "/cart" && method === "DELETE") {
    cart = { id: cart.id, items: [], subtotal: 0, count: 0 };
    writeStore(cart);
    return cart;
  }
  if (path === "/cart/items" && method === "POST") {
    const { productId, qty = 1 } = body;
    const catalog = window.DEMO_CATALOG || [];
    const p = catalog.find(x => x.id === productId);
    if (!p) throw new Error("Producto no encontrado");
    const idx = cart.items.findIndex(i => i.productId === productId);
    if (idx >= 0) cart.items[idx].qty += qty;
    else cart.items.push({ id: crypto.randomUUID(), productId, title: p.title, price: p.price, image: p.image, qty });
  }
  if (path.startsWith("/cart/items/") && method === "PUT") {
    const itemId = path.split("/").pop();
    const { qty } = body;
    cart.items = cart.items.map(i => i.id === itemId ? { ...i, qty } : i);
  }
  if (path.startsWith("/cart/items/") && method === "DELETE") {
    const itemId = path.split("/").pop();
    cart.items = cart.items.filter(i => i.id !== itemId);
  }
  cart.subtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
  cart.count = cart.items.reduce((c, i) => c + i.qty, 0);
  writeStore(cart);
  return cart;
}

// Toasts context esperado desde App
const ToastContext = React.createContext(null);
function useToasts() { return useContext(ToastContext); }

// Cart context
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
      const data = await apiFetch("/cart");
      setCart(data);
      setError(null);
    } catch (e) {
      setError(e.message);
      toasts?.error("No se pudo cargar el carrito");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { syncFromServer(); }, []);

  const setOptimistic = updater => setCart(prev => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    return { ...prev, ...next };
  });

  const addItem = async ({ productId, title, price, image, qty = 1 }) => {
    setOptimistic(prev => {
      const idx = prev.items.findIndex(i => i.productId === productId);
      let items;
      if (idx >= 0) items = prev.items.map((i,k)=>k===idx?{...i,qty:i.qty+qty}:i);
      else items = [...prev.items,{ id: crypto.randomUUID(), productId, title, price, image, qty }];
      const subtotal = items.reduce((s,i)=>s+i.price*i.qty,0);
      return { items, subtotal, count: items.reduce((c,i)=>c+i.qty,0) };
    });
    try {
      await apiFetch("/cart/items",{method:"POST",body:{productId,qty}});
      await syncFromServer();
      toasts?.success("Producto agregado");
    } catch {
      toasts?.error("Error al agregar");
      await syncFromServer();
    }
  };

  const updateQty = async (itemId, qty) => {
    if (qty <= 0) return removeItem(itemId);
    setOptimistic(prev => {
      const items = prev.items.map(i=>i.id===itemId?{...i,qty}:i);
      const subtotal = items.reduce((s,i)=>s+i.price*i.qty,0);
      return { items, subtotal, count: items.reduce((c,i)=>c+i.qty,0)};
    });
    try{
      await apiFetch(`/cart/items/${itemId}`,{method:"PUT",body:{qty}});
      await syncFromServer();
    }catch{
      toasts?.error("Error al actualizar cantidad");
      await syncFromServer();
    }
  };

  const removeItem = async itemId => {
    setOptimistic(prev => {
      const items = prev.items.filter(i=>i.id!==itemId);
      const subtotal = items.reduce((s,i)=>s+i.price*i.qty,0);
      return { items, subtotal, count: items.reduce((c,i)=>c+i.qty,0)};
    });
    try{
      await apiFetch(`/cart/items/${itemId}`,{method:"DELETE"});
      await syncFromServer();
    }catch{
      toasts?.error("Error al eliminar");
      await syncFromServer();
    }
  };

  const clearCart = async () => {
    const backup = cart;
    setCart({ id:cart.id,items:[],subtotal:0,count:0 });
    try{
      await apiFetch("/cart",{method:"DELETE"});
      await syncFromServer();
    }catch{
      setCart(backup);
      toasts?.error("Error al vaciar");
    }
  };

  const value = useMemo(()=>({cart,loading,error,addItem,updateQty,removeItem,clearCart,refresh:syncFromServer}),[cart,loading,error]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
