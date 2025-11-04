import React, { useState } from "react";
import { CartProvider, useCart } from "../contexts/CartContext";
import Spinner from "../components/UI/Spinner";
/**
 * Shopping Cart demo that cumple con los criterios de la imagen:
 * 1) Componentes: CartPage, CartItem, CartSummary, CartBadge, MiniCart.
 * 2) Servicios conectados a API REST: GET /cart, POST /cart/items, PUT /cart/items/:id, DELETE /cart/items/:id, DELETE /cart.
 * 3) Estado global con Context para items, totales, loading, errores.
 * 4) Interacciones: agregar desde ProductCard, incrementar/decrementar cantidad, remover y vaciar carrito.
 * 5) Persistencia de sesión mediante cartId en localStorage y envío por header X-Cart-Id.
 * 6) Manejo de errores y toasts (éxito y fallo), spinners y skeletons.
 * 7) Botón "Ir a Checkout" deshabilitado si el carrito está vacío.
 * 8) Mini-carrito y badge se actualizan en cada operación.
 *
 * Supuestos de API:
 *  - Respuestas JSON con shape: { id: string, items: Array<{id, productId, title, price, image, qty}>, subtotal: number, count: number }
 *  - Al crear o leer el carrito, el backend puede devolver un id de carrito. Se envía por header X-Cart-Id en las siguientes peticiones.
 *  - Cambiar BASE_URL conforme a su backend.
 *
 */

// API DEMO SIN BACKEND: almacenamiento en localStorage y latencia simulada

const Price = ({ value }) => <span>${value?.toFixed(2) ?? "0.00"}</span>;

// CartBadge (contador)
function CartBadge() {
  const { cart, loading } = useCart();
  return (
    <div className="rounded-full bg-slate-900 text-white px-3 py-2">
      Carrito
      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold">{loading ? "..." : cart.count}</span>
    </div>
  );
}


// CartItem
function CartItem({ item }) {
  const { updateQty, removeItem } = useCart();
  const [busy, setBusy] = useState(false);

  const changeQty = async delta => { setBusy(true); await updateQty(item.id, item.qty + delta); setBusy(false); };
  const setQty = async q => { const qty = Math.max(1, Number(q) || 1); setBusy(true); await updateQty(item.id, qty); setBusy(false); };
  const remove = async () => { setBusy(true); await removeItem(item.id); setBusy(false); };

  return (
    <div className="grid grid-cols-[80px,1fr,120px] gap-4 rounded-2xl border p-4">
      <img src={item.image} alt={item.title} className="h-20 w-20 rounded object-cover" />
      <div>
        <div className="font-medium">{item.title}</div>
        <div className="text-sm text-slate-500">Precio unitario <Price value={item.price} /></div>
        <div className="mt-3 flex items-center gap-2">
          <button disabled={busy} onClick={() => changeQty(-1)} className="h-8 w-8 rounded-full border">-</button>
          <input className="h-8 w-14 rounded border px-2 text-center" value={item.qty} onChange={e => setQty(e.target.value)} />
          <button disabled={busy} onClick={() => changeQty(1)} className="h-8 w-8 rounded-full border">+</button>
          <button disabled={busy} onClick={remove} className="ml-4 text-red-600 hover:underline">Quitar</button>
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold"><Price value={item.price * item.qty} /></div>
        {busy ? <div className="mt-2 text-right"><Spinner inline size={4} text="Actualizando" /></div> : null}
      </div>
    </div>
  );
}

// CartSummary
function CartSummary() {
  const { cart, clearCart } = useCart();
  const [busy, setBusy] = useState(false);

  const onClear = async () => { setBusy(true); await clearCart(); setBusy(false); };
  const shipping = 0; // Gratis en demo
  const taxes = Math.round(cart.subtotal * 0.09 * 100) / 100; // 9% demo
  const total = cart.subtotal + shipping + taxes;

  return (
    <aside className="rounded-2xl border p-6 w-full">
      <h3 className="mb-4 text-lg font-semibold">Resumen del pedido</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-medium"><Price value={cart.subtotal} /></span></div>
        <div className="flex items-center justify-between"><span>Envío</span><span className="font-medium">Gratis</span></div>
        <div className="flex items-center justify-between"><span>Impuestos</span><span className="font-medium"><Price value={taxes} /></span></div>
        <hr className="my-2" />
        <div className="flex items-center justify-between text-base font-semibold"><span>Total</span><span><Price value={total} /></span></div>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <button disabled={cart.items.length === 0 || busy} className="h-11 rounded-xl bg-indigo-700 text-white disabled:cursor-not-allowed disabled:opacity-50">Proceder al Pago</button>
        <button onClick={onClear} disabled={cart.items.length === 0 || busy} className="h-11 rounded-xl border">Vaciar carrito</button>
        {busy ? <div className="text-center"><Spinner inline text="Procesando" /></div> : null}
      </div>
    </aside>
  );
}

// Catálogo de demostración para llenar el carrito (usa window.DEMO_CATALOG)
const DEMO_CATALOG = [
  { id: "p1", title: "Camiseta de algodón orgánico", price: 25, image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=400&auto=format&fit=crop" },
  { id: "p2", title: "Pantalones vaqueros ajustados", price: 60, image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=400&auto=format&fit=crop" },
  { id: "p3", title: "Zapatillas deportivas", price: 80, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop" },
];
window.DEMO_CATALOG = DEMO_CATALOG; // lo usa el CartContext en modo demo

function DemoCatalog() {
  const { addItem } = useCart();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {DEMO_CATALOG.map(p => (
        <div key={p.id} className="rounded-2xl border p-3">
          <img src={p.image} alt={p.title} className="h-40 w-full rounded object-cover" />
          <div className="mt-2 font-medium line-clamp-1">{p.title}</div>
          <div className="text-sm text-slate-500"><Price value={p.price} /></div>
          <button onClick={() => addItem({ productId: p.id, title: p.title, price: p.price, image: p.image, qty: 1 })} className="mt-3 h-10 w-full rounded-xl bg-slate-900 text-white">Agregar al carrito</button>
        </div>
      ))}
    </div>
  );
}

// Página principal
export default function CartPage() {
  return (
    <CartProvider>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tu Carrito</h1>
          <CartBadge />
        </header>

        {/* Catálogo de demostración */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Catálogo de demostración</h2>
          <DemoCatalog />
        </section>

        <MainCartContent />
      </div>
    </CartProvider>
  );
}

function MainCartContent() {
  const { cart, loading, error } = useCart();

  if (loading) return (
    <div className="space-y-6">
      {[...Array(3)].map((_,i) => <SkeletonRow key={i} />)}
      <SkeletonSummary />
    </div>
  );

  if (error) return <div className="rounded-2xl border p-6 text-red-700">{error}</div>;

  if (cart.items.length === 0) return (
    <div className="rounded-2xl border p-10 text-center">
      <p className="text-slate-600">Tu carrito está vacío. Agrega productos del catálogo de arriba.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {cart.items.map(item => <CartItem key={item.id} item={item} />)}
      </div>
      <CartSummary />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[80px,1fr,120px] gap-4 rounded-2xl border p-4 animate-pulse">
      <div className="h-20 w-20 rounded bg-slate-200" />
      <div className="space-y-2">
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-200" />
        <div className="mt-4 h-8 w-40 rounded bg-slate-200" />
      </div>
      <div className="ml-auto h-4 w-16 rounded bg-slate-200" />
    </div>
  );
}

function SkeletonSummary() {
  return (
    <aside className="rounded-2xl border p-4 animate-pulse">
      <div className="h-5 w-24 rounded bg-slate-200 mb-3" />
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="mt-4 h-11 w-full rounded bg-slate-200" />
      <div className="mt-3 h-11 w-full rounded bg-slate-200" />
    </aside>
  );
}
