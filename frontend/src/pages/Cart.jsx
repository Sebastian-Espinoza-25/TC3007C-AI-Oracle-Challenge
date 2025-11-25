import { useState, useEffect } from "react";
import { CartProvider, useCart } from "../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/UI/Spinner";
import CustomButton from "../components/UI/CustomButton";
import { FiTrash2 } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

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

// Sidebar de promos (izquierda)
function PromoSidebar({ appliedPromo, setAppliedPromo }) {
  const { token } = useAuth();
  const { cart } = useCart();

  const [promoData, setPromoData] = useState(null);
  const [loadingPromo, setLoadingPromo] = useState(false);
  const [errorPromo, setErrorPromo] = useState("");
  const [bank, setBank] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [applying, setApplying] = useState(false);

  const bankOptions = [
    "BBVA",
    "Santander",
    "Banorte",
    "HSBC",
    "American Express",
    "Citibanamex",
  ];

  const canFetchPromo = token && cart && cart.items.length > 0;

  const fetchPromo = async () => {
    if (!canFetchPromo) return;
    setLoadingPromo(true);
    setErrorPromo("");

    try {
      const res = await fetch(`${API_URL}/promos/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      console.log("🔎 Respuesta /promos/cart:", data);

      if (!res.ok) {
        throw new Error(
          data.error || data.message || "No se pudo obtener la promoción."
        );
      }

      setPromoData(data);
      if (data.bank_name) setBank(data.bank_name);
    } catch (err) {
      console.error(err);
      setErrorPromo(err.message || "Error al obtener promociones.");
    } finally {
      setLoadingPromo(false);
    }
  };

  useEffect(() => {
    fetchPromo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, cart?.subtotal]);

  const handleBankChange = async (e) => {
    const value = e.target.value;
    setBank(value);
    setAppliedPromo(null); // reset promo aplicada al cambiar banco

    if (!value || !token) return;

    setSavingBank(true);
    setErrorPromo("");

    try {
      // Guardamos un método de pago dummy con la marca = banco elegido
      const res = await fetch(`${API_URL}/payments/methods`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          brand: value,
          type: "card",
          last4: "0000",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "No se pudo guardar el banco como método de pago."
        );
      }

      // Recalcular promo con el nuevo banco
      await fetchPromo();
    } catch (err) {
      console.error(err);
      setErrorPromo(err.message || "Error al actualizar banco.");
    } finally {
      setSavingBank(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!token) return;
    setApplying(true);
    setErrorPromo("");

    try {
      const res = await fetch(`${API_URL}/promos/cart/apply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      console.log("✅ Respuesta /promos/cart/apply:", data);

      if (!res.ok) {
        throw new Error(
          data.error || data.message || "No se pudo aplicar la promoción."
        );
      }

      setAppliedPromo(data); // tiene discount_amount, final_amount, etc.
    } catch (err) {
      console.error(err);
      setErrorPromo(err.message || "Error al aplicar promoción.");
    } finally {
      setApplying(false);
    }
  };

  const currentPromo = promoData?.current_promo;
  const nextPromo = promoData?.next_promo;
  const mixMessage = promoData?.mix_message;
  const hasCurrentPromo = !!currentPromo && currentPromo.meets_minimum;
  const promoAlreadyApplied = appliedPromo != null;

  return (
    <aside className="rounded-xl bg-white p-5 shadow-lg border h-fit">
      <h2 className="mb-3 text-lg font-semibold">Promociones con tu banco</h2>

      {!token && (
        <p className="text-sm text-slate-500">
          Inicia sesión para ver promociones personalizadas con tu banco.
        </p>
      )}

      {token && (
        <>
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Banco de tu tarjeta
            </label>
            <select
              value={bank}
              onChange={handleBankChange}
              disabled={savingBank}
              className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/50"
            >
              <option value="">Selecciona tu banco</option>
              {bankOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              Usamos tu banco y el monto del carrito para buscar la mejor
              promoción disponible.
            </p>
          </div>

          {loadingPromo ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner inline text="Buscando promociones..." />
            </div>
          ) : (
            <>
              {errorPromo && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {errorPromo}
                </div>
              )}

              {currentPromo && (
                <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs">
                  <div className="mb-1 text-[13px] font-semibold text-emerald-800">
                    Promo actual
                  </div>
                  <div className="text-[13px] font-medium text-emerald-900">
                    {currentPromo.promo_title}
                  </div>
                  <div className="mt-1 text-[12px] text-emerald-900/80">
                    {currentPromo.message}
                  </div>
                </div>
              )}

              {nextPromo && nextPromo.required_amount > 0 && (
                <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs">
                  <div className="mb-1 text-[13px] font-semibold text-sky-800">
                    Siguiente promo
                  </div>
                  <div className="text-[12px] text-sky-900/80">
                    Agrega{" "}
                    <span className="font-semibold">
                      <Price value={nextPromo.required_amount} />
                    </span>{" "}
                    más para alcanzar:{" "}
                    <span className="font-semibold">
                      {nextPromo.promo_title || "la siguiente promoción"}
                    </span>
                    .
                  </div>
                </div>
              )}

              {mixMessage && mixMessage.message && (
                <div className="mb-3 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-700">
                  {mixMessage.message}
                </div>
              )}

              <button
                type="button"
                disabled={!hasCurrentPromo || applying || promoAlreadyApplied}
                onClick={handleApplyPromo}
                className="mt-1 flex h-10 w-full items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {applying
                  ? "Aplicando promoción..."
                  : promoAlreadyApplied
                  ? "Promoción aplicada"
                  : hasCurrentPromo
                  ? "Aplicar promoción al carrito"
                  : "Aún no alcanzas el mínimo"}
              </button>

              {appliedPromo && (
                <p className="mt-2 text-[11px] text-emerald-700">
                  Descuento aplicado:{" "}
                  <b>
                    <Price value={appliedPromo.discount_amount} />
                  </b>
                  . Nuevo subtotal:{" "}
                  <b>
                    <Price value={appliedPromo.final_amount} />
                  </b>
                </p>
              )}
            </>
          )}
        </>
      )}
    </aside>
  );
}

// Cart summary using CustomButton, ahora considerando promo aplicada
function CartSummary({ appliedPromo }) {
  const { cart, clearCart } = useCart();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const shipping = 0;
  const promoDiscount = appliedPromo?.discount_amount ?? 0;
  const subtotalBase = cart.subtotal;
  const subtotalWithPromo = Math.max(0, subtotalBase - promoDiscount);
  const taxes =
    Math.round(subtotalWithPromo * 0.09 * 100) / 100;
  const total = subtotalWithPromo + shipping + taxes;

  const checkoutDisabled = cart.items.length === 0 || busy;
  const clearDisabled = cart.items.length === 0 || busy;

  const handleCheckout = () => {
    if (checkoutDisabled) return;
    // Mandamos el total con promo al checkout
    navigate("/checkout", {
      state: {
        totalWithPromo: total,
        appliedPromo,
      },
    });
  };

  const handleClear = async () => {
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
            <Price value={subtotalBase} />
          </span>
        </div>

        {promoDiscount > 0 && (
          <div className="flex items-center justify-between text-emerald-700">
            <span>Descuento promo</span>
            <span className="font-medium">
              -<Price value={promoDiscount} />
            </span>
          </div>
        )}

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
  const [appliedPromo, setAppliedPromo] = useState(null);

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,2fr)]">
      {/* Sidebar de promos a la izquierda */}
      <PromoSidebar
        appliedPromo={appliedPromo}
        setAppliedPromo={setAppliedPromo}
      />

      {/* Items + resumen a la derecha */}
      <div className="space-y-6">
        <div className="space-y-4">
          {cart.items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>
        <CartSummary appliedPromo={appliedPromo} />
      </div>
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
