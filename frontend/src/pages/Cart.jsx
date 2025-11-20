import { useState } from "react";
import { CartProvider, useCart } from "../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/UI/Spinner";
import CustomButton from "../components/UI/CustomButton";
import { FiTrash2 } from "react-icons/fi";

const Price = ({ value }) => <span>${value?.toFixed(2) ?? "0.00"}</span>;

// Cart badge with count
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

  const articleId = product.article_id ?? product.id;

  const handleAdd = async () => {
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

  const goToDetail = () => navigate(`/detail/${articleId}`);

  return (
    <div className="rounded-2xl border p-3">
      {/* Clickable image */}
      <div onClick={goToDetail} className="cursor-pointer">
        <img
          src={product.image}
          alt={product.title}
          className="h-40 w-full rounded object-cover"
        />
      </div>

      {/* Clickable title */}
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

// CartItem with trash icon when qty === 1
function CartItem({ item }) {
  const { updateQty, removeItem } = useCart();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const goToDetail = () => navigate(`/detail/${item.id}`);

  const changeQty = async (delta) => {
    setBusy(true);
    await updateQty(item.id, item.qty + delta);
    setBusy(false);
  };

  const setQty = async (q) => {
    const qty = Math.max(1, Number(q) || 1);
    setBusy(true);
    await updateQty(item.id, qty);
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    await removeItem(item.id);
    setBusy(false);
  };

  return (
    <div className="grid grid-cols-[80px,1fr,120px] gap-4 rounded-xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-200 p-4">
      {/* Thumbnail clickable */}
      <div onClick={goToDetail} className="cursor-pointer">
        <img
          src={item.image}
          alt={item.title}
          className="h-20 w-20 rounded object-cover"
        />
      </div>

      {/* Middle column */}
      <div onClick={goToDetail} className="cursor-pointer">
        <div className="font-medium hover:text-primary-500">{item.title}</div>

        <div className="text-sm text-slate-500">
          Precio unitario <Price value={item.price} />
        </div>

        <div
          className="mt-3 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()} // prevent navigation on controls
        >
          {/* If qty > 1 show "-", else show trash icon */}
          {item.qty > 1 ? (
            <button
              disabled={busy}
              onClick={() => changeQty(-1)}
              className="h-8 w-8 rounded-full border flex items-center justify-center"
            >
              -
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={remove}
              className="h-8 w-8 rounded-full border flex items-center justify-center text-secondary-400 hover:bg-red-50"
              title="Eliminar"
            >
              <FiTrash2 size={18} />
            </button>
          )}

          <input
            className="h-8 w-14 rounded border px-2 text-center"
            value={item.qty}
            onChange={(e) => setQty(e.target.value)}
          />

          <button
            disabled={busy}
            onClick={() => changeQty(1)}
            className="h-8 w-8 rounded-full border flex items-center justify-center"
          >
            +
          </button>

          <button
            disabled={busy}
            onClick={remove}
            className="ml-4 text-secondary-400 hover:underline"
          >
            Quitar
          </button>
        </div>
      </div>

      {/* Line total */}
      <div className="text-right">
        <div className="font-semibold">
          <Price value={item.price * item.qty} />
        </div>
        {busy && (
          <div className="mt-2 text-right">
            <Spinner inline size={4} text="Actualizando" />
          </div>
        )}
      </div>
    </div>
  );
}

// Cart summary using CustomButton
function CartSummary() {
  const { cart, clearCart } = useCart();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const shipping = 0;
  const taxes = Math.round(cart.subtotal * 0.09 * 100) / 100;
  const total = cart.subtotal + shipping + taxes;

  const checkoutDisabled = cart.items.length === 0 || busy;
  const clearDisabled = cart.items.length === 0 || busy;

  const handleCheckout = (e) => {
    // simulate disabled behavior
    if (checkoutDisabled) return;
    navigate("/checkout");
  };

  const handleClear = async (e) => {
    if (clearDisabled) return;
    setBusy(true);
    await clearCart();
    setBusy(false);
  };

  return (
    <aside className="rounded-xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-200 p-6 w-full">
      <h3 className="mb-4 text-lg font-semibold">Resumen del pedido</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span className="font-medium">
            <Price value={cart.subtotal} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Envío</span>
          <span className="font-medium">Gratis</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Impuestos</span>
          <span className="font-medium">
            <Price value={taxes} />
          </span>
        </div>
        <hr className="my-2" />
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>
            <Price value={total} />
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {/* Checkout button using CustomButton */}
        <CustomButton
          text="Ir a Checkout"
          style="primary"
          extraStyles={`h-11 w-full rounded-xl ${
            checkoutDisabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleCheckout}
        />

        {/* Clear cart button using CustomButton */}
        <CustomButton
          text="Vaciar carrito"
          style="cancel"
          extraStyles={`h-11 w-full ${
            clearDisabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleClear}
        />

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
              {products.map((p) => (
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

  if (loading)
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <SkeletonRow key={i} />
        ))}
        <SkeletonSummary />
      </div>
    );

  if (error)
    return <div className="rounded-2xl border p-6 text-red-700">{error}</div>;

  if (cart.items.length === 0)
    return (
      <div className="rounded-2xl border p-10 text-center">
        <p className="text-slate-600">Tu carrito está vacío.</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {cart.items.map((item) => (
          <CartItem key={item.id} item={item} />
        ))}
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
