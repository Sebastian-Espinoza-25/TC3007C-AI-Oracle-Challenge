import React, { useState } from "react";
import { CartProvider, useCart } from "../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/UI/Spinner";

const Price = ({ value }) => <span>${value?.toFixed(2) ?? "0.00"}</span>;

// Show the current cart count so the user has quick feedback on how many items are in the cart
function CartBadge() {
  const { cart, loading } = useCart();
  return (
    <div className="rounded-full bg-slate-900 text-white px-3 py-2">
      Carrito
      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold">
        {loading ? "..." : cart.count}
      </span>
    </div>
  );
}


// ProductCard with real backend data
export function ProductCard({ product, onAdded }) {
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // Support both shapes of backend data (article_id from catalog vs id from other sources)
  const articleId = product.article_id ?? product.id;

  const handleAdd = async () => {
    // Lock UI while the async cart update is in progress to avoid double-submits
    setBusy(true);
    await addItem({
      productId: String(articleId),
      title: product.title,
      price: Number(product.price ?? 0),
      image: product.image,
      qty: 1,
    });
    setBusy(false);
    onAdded?.();
  };

  // Centralize navigation logic so it can be reused by multiple clickable elements
  const goToDetail = () => navigate(`/detail/${articleId}`);

  return (
    <div className="rounded-2xl border p-3">

      {/* "rapping the image lets the whole visual area act as a link to the detail page */}
      <div onClick={goToDetail} className="cursor-pointer">
        <img
          src={product.image}
          alt={product.title}
          className="h-40 w-full rounded object-cover"
        />
      </div>

      {/* Making the title clickable matches common e-commerce behavior and improves discoverability */}
      <div
        onClick={goToDetail}
        className="mt-2 font-medium line-clamp-1 cursor-pointer hover:text-primary-500"
      >
        {product.title}
      </div>

      <div className="text-sm text-slate-500">
        ${Number(product.price ?? 0).toFixed(2)}
      </div>

      <button
        disabled={busy}
        onClick={handleAdd}
        className="mt-3 h-10 w-full rounded-xl bg-slate-900 text-white disabled:opacity-50"
      >
        {busy ? "Agregando..." : "Agregar al carrito"}
      </button>
    </div>
  );
}

// CartItem
function CartItem({ item }) {
  const { updateQty, removeItem } = useCart();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // Reuse the same detail route pattern used in ProductCard, but based on the cart item id
  const goToDetail = () => navigate(`/detail/${item.id}`);

  const changeQty = async delta => { 
    // Prevent the user from spamming +/- while the quantity update is being persisted
    setBusy(true); 
    await updateQty(item.id, item.qty + delta); 
    setBusy(false); 
  };

  const setQty = async q => { 
    // Enforce a minimum of 1 item and sanitize invalid input before sending to the cart context
    const qty = Math.max(1, Number(q) || 1); 
    setBusy(true); 
    await updateQty(item.id, qty); 
    setBusy(false); 
  };

  const remove = async () => { 
    // Keep UI consistent while the remove operation is processed
    setBusy(true); 
    await removeItem(item.id); 
    setBusy(false); 
  };

  return (
    <div
      className="grid grid-cols-[80px,1fr,120px] gap-4 rounded-xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-200 p-4"
    >
      
      {/* Allow the user to open the detail page directly from the thumbnail */}
      <div onClick={goToDetail} className="cursor-pointer">
        <img 
          src={item.image} 
          alt={item.title} 
          className="h-20 w-20 rounded object-cover"
        />
      </div>

      {/* Make the main text area behave like a link while still embedding interactive controls inside */}
      <div onClick={goToDetail} className="cursor-pointer">
        <div className="font-medium hover:text-primary-500">
          {item.title}
        </div>

        <div className="text-sm text-slate-500">
          Precio unitario <Price value={item.price} />
        </div>

        <div
          className="mt-3 flex items-center gap-2"
          onClick={e => e.stopPropagation()} 
          // Stop the click from bubbling to the parent so using the controls does not trigger navigation
        >
          <button disabled={busy} onClick={() => changeQty(-1)} className="h-8 w-8 rounded-full border">-</button>
          <input 
            className="h-8 w-14 rounded border px-2 text-center" 
            value={item.qty} 
            onChange={e => setQty(e.target.value)} 
          />
          <button disabled={busy} onClick={() => changeQty(1)} className="h-8 w-8 rounded-full border">+</button>
          <button disabled={busy} onClick={remove} className="ml-4 text-secondary-400 hover:underline">Quitar</button>
        </div>
      </div>

      {/* Show the line total so the user understands the cost impact of this item */}
      <div className="text-right">
        <div className="font-semibold">
          <Price value={item.price * item.qty} />
        </div>
        {busy ? (
          <div className="mt-2 text-right">
            <Spinner inline size={4} text="Actualizando" />
          </div>
        ) : null}
      </div>
    </div>
  );
}


// CartSummary
function CartSummary() {
  const { cart, clearCart } = useCart();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const onClear = async () => { 
    // Avoid accidental double-click clear while the operation is being applied
    setBusy(true); 
    await clearCart(); 
    setBusy(false); 
  };

  const shipping = 0;
  // Apply a simple fixed tax rate to simulate totals without hard-coding decimal artifacts
  const taxes = Math.round(cart.subtotal * 0.09 * 100) / 100;
  const total = cart.subtotal + shipping + taxes;

  return (
    <aside className="rounded-xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-200 p-6 w-full">
      <h3 className="mb-4 text-lg font-semibold">Resumen del pedido</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span className="font-medium"><Price value={cart.subtotal} /></span>
        </div>
        <div className="flex items-center justify-between">
          <span>Envío</span>
          <span className="font-medium">Gratis</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Impuestos</span>
          <span className="font-medium"><Price value={taxes} /></span>
        </div>
        <hr className="my-2" />
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span><Price value={total} /></span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {/* Prevent navigating to checkout with an empty cart or during a pending operation */}
        <button
          disabled={cart.items.length === 0 || busy}
          onClick={() => navigate('/checkout')}
          className="h-11 rounded-xl bg-primary-500 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ir a Checkout
        </button>
        <button
          onClick={onClear}
          disabled={cart.items.length === 0 || busy}
          className="h-11 rounded-xl border"
        >
          Vaciar carrito
        </button>
        {busy && (
          <div className="text-center">
            <Spinner inline text="Procesando" />
          </div>
        )}
      </div>
    </aside>
  );
}


// Main Cart Page
export default function CartPage({ products = [] }) {
  return (
    <CartProvider>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tu Carrito</h1>
          <CartBadge />
        </header>

        {products.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Catálogo</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {products.map(p => (
                <ProductCard key={p.article_id ?? p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        <MainCartContent />
      </div>
    </CartProvider>
  );
}

function MainCartContent() {
  const { cart, loading, error } = useCart();

  if (loading) return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
      <SkeletonSummary />
    </div>
  );

  if (error) return <div className="rounded-2xl border p-6 text-red-700">{error}</div>;

  if (cart.items.length === 0) return (
    <div className="rounded-2xl border p-10 text-center">
      <p className="text-slate-600">Tu carrito está vacío.</p>
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
