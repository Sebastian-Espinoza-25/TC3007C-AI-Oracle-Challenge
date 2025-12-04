import { useState, useEffect } from "react";
import { CartProvider, useCart } from "../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/UI/Spinner";
import CustomButton from "../components/UI/CustomButton";
import { FiTrash2 } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

// Simple component to format prices in a consistent way
const Price = ({ value }) => <span>${value?.toFixed(2) ?? "0.00"}</span>;

// Shows cart count in the header
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

// Card used in the catalog grid with real backend data
export function ProductCard({ product, onAdded }) {
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // Backend can send article_id or id depending on source, so this normalizes the identifier
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
    if (onAdded) onAdded();
  };

  const goToDetail = () => navigate(`/detail/${articleId}`);

  return (
    <div className="rounded-2xl border p-3">
      <div onClick={goToDetail} className="cursor-pointer">
        <img
          src={product.image}
          alt={product.title}
          className="h-40 w-full rounded object-cover"
        />
      </div>

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

// Single cart line item with quantity controls
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

  const remove = async () => {
    setBusy(true);
    await removeItem(item.id);
    setBusy(false);
  };

  return (
    <div className="grid grid-cols-[80px,1fr,120px] gap-4 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-200 p-4">
      <div onClick={goToDetail} className="cursor-pointer">
        <img
          src={item.image}
          alt={item.title}
          className="h-20 w-20 rounded object-cover"
        />
      </div>

      <div onClick={goToDetail} className="cursor-pointer">
        <div className="font-medium hover:text-primary-500">{item.title}</div>

        <div className="text-sm text-slate-500">
          Precio unitario <Price value={item.price} />
        </div>

        <div
          className="mt-3 flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left control: decrement or delete when qty is 1 */}
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
              className="h-8 w-8 rounded-full border flex items-center justify-center text-red-400 hover:bg-red-50"
              title="Eliminar"
            >
              <FiTrash2 size={18} />
            </button>
          )}

          {/* Visible quantity so user knows how many units are selected */}
          <span className="min-w-[28px] text-center text-sm font-semibold">
            {item.qty}
          </span>

          {/* Right control: increment quantity */}
          <button
            disabled={busy}
            onClick={() => changeQty(1)}
            className="h-8 w-8 rounded-full border flex items-center justify-center"
          >
            +
          </button>

          {/* Text link to remove item regardless of quantity */}
          <button
            disabled={busy}
            onClick={remove}
            className="ml-3 text-red-500 hover:underline"
          >
            Quitar
          </button>
        </div>
      </div>

      <div className="text-right">
        <div className="font-semibold">
          <Price value={item.price * item.qty} />
        </div>

        {busy && (
          <div className="mt-2">
            <Spinner inline size={4} text="Actualizando" />
          </div>
        )}
      </div>
    </div>
  );
}

// Sidebar that talks to the promo agent and lets the user apply discounts
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

  // Promo calls do not make sense without user session and at least one item in the cart
  const canFetchPromo = token && cart && cart.items.length > 0;

  const fetchPromo = async () => {
    if (!canFetchPromo) return;
    setLoadingPromo(true);
    setErrorPromo("");

    try {
      const res = await fetch(`${API_URL}/promos/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || data.message || "No se pudo obtener la promoción."
        );
      }

      setPromoData(data);
      if (data.bank_name) setBank(data.bank_name);
    } catch (err) {
      setErrorPromo(err.message || "Error al obtener promociones.");
    } finally {
      setLoadingPromo(false);
    }
  };

  useEffect(() => {
    fetchPromo();
    // Bank and subtotal are enough signals to recompute current promo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, cart?.subtotal]);

  const handleBankChange = async (e) => {
    const value = e.target.value;
    setBank(value);
    // Reset applied promo when user changes bank so calculations remain consistent
    setAppliedPromo(null);

    if (!value || !token) return;

    setSavingBank(true);
    setErrorPromo("");

    try {
      const res = await fetch(`${API_URL}/payments/methods`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bank: value,
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

      await fetchPromo();
    } catch (err) {
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
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || data.message || "No se pudo aplicar la promoción."
        );
      }

      // Cart summary needs bank info without hitting backend again
      const applied = {
        ...data,
        bank: bank || promoData?.bank_name || null,
      };
      setAppliedPromo(applied);
    } catch (err) {
      setErrorPromo(err.message || "Error al aplicar promoción.");
    } finally {
      setApplying(false);
    }
  };

  const currentPromo = promoData?.current_promo;
  const nextPromo = promoData?.next_promo;
  const mixMessage = promoData?.mix_message;

  const hasCurrentPromo = !!currentPromo && currentPromo.meets_minimum;
  const promoAlreadyApplied = !!appliedPromo;

  // This prevents new backend calls once a promo is already applied or when user has not reached the minimum
  const isApplyDisabled =
    !hasCurrentPromo || applying || promoAlreadyApplied;

  // ====== Info de beneficio aplicado (para mensajes explícitos) ======
  const appliedBenefit = appliedPromo?.applied_promo?.benefit;
  const appliedType = appliedBenefit?.type;

  const isCashbackApplied = appliedType === "cashback_fijo";
  const isPercentDiscountApplied = appliedType === "descuento_porcentaje";
  const isFixedDiscountApplied = appliedType === "descuento_fijo";

  const cashbackAmount =
    isCashbackApplied && appliedBenefit?.cashback
      ? Number(appliedBenefit.cashback) || 0
      : 0;

  const percentValue =
    isPercentDiscountApplied && appliedBenefit?.percentage
      ? Number(appliedBenefit.percentage) || 0
      : 0;

  return (
    <aside className="rounded-xl bg-white p-5 shadow-lg h-fit">
      <h2 className="mb-2 text-lg font-semibold">Promociones con tu banco</h2>

      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-500 text-white px-3 py-1 text-[11px] shadow">
        <span className="text-xs">¡Agente promotor activo!</span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        El agente promotor analiza tu carrito, tu banco y el catálogo de promociones para recomendarte los mejores descuentos disponibles.
      </p>

      {!token && (
        <p className="text-sm text-slate-500">
          Inicia sesión para ver promociones personalizadas.
        </p>
      )}

      {token && (
        <>
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700">
              Banco de tu tarjeta
            </label>
            <select
              value={bank}
              onChange={handleBankChange}
              disabled={savingBank}
              className="mt-1 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/50"
            >
              <option value="">Selecciona tu banco</option>
              {bankOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
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
                  <div className="text-[13px] font-semibold text-emerald-900">
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

              <CustomButton
                text={
                  applying
                    ? "Aplicando promoción..."
                    : promoAlreadyApplied
                    ? "Promoción aplicada"
                    : hasCurrentPromo
                    ? "Aplicar promoción al carrito"
                    : "Aún no alcanzas el mínimo"
                }
                style="primary"
                extraStyles={`h-10 w-full rounded-xl text-xs ${
                  isApplyDisabled ? "opacity-60 cursor-not-allowed" : ""
                }`}
                onClick={isApplyDisabled ? undefined : handleApplyPromo}
              />

              {/* Mensajes de resultado una vez aplicada la promo */}
              {appliedPromo?.discount_amount > 0 &&
                !isCashbackApplied && (
                  <p className="mt-2 text-[11px] text-emerald-700">
                    {isPercentDiscountApplied ? (
                      <>
                        Descuento aplicado:{" "}
                        <b>{percentValue}%</b>{" "}
                        equivalente a{" "}
                        <b>
                          <Price value={appliedPromo.discount_amount} />
                        </b>
                        .
                      </>
                    ) : isFixedDiscountApplied ? (
                      <>
                        Descuento aplicado:{" "}
                        <b>
                          <Price value={appliedPromo.discount_amount} />
                        </b>{" "}
                        directo a tu total.
                      </>
                    ) : (
                      <>
                        Descuento aplicado:{" "}
                        <b>
                          <Price value={appliedPromo.discount_amount} />
                        </b>
                        .
                      </>
                    )}
                  </p>
                )}

              {isCashbackApplied && cashbackAmount > 0 && (
                <p className="mt-2 text-[11px] text-emerald-700">
                  Cashback estimado:{" "}
                  <b>
                    <Price value={cashbackAmount} />
                  </b>{" "}
                  que se abonará a tu tarjeta
                  {appliedPromo.bank ? ` ${appliedPromo.bank}` : ""} después de la compra. El total a pagar no cambia.
                </p>
              )}
            </>
          )}
        </>
      )}
    </aside>
  );
}

// Summary card on the right side, including totals and possible MSI / cashback info
function CartSummary({ appliedPromo }) {
  const { cart, clearCart } = useCart();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const shipping = 0;

  const rawBank = appliedPromo?.bank;
  const bankName =
    rawBank && rawBank !== "EMPTY" ? rawBank : null;

  const applied = appliedPromo?.applied_promo;
  const benefit = applied?.benefit;

  const type = benefit?.type;
  const isMSI = type === "msi";
  const isCashback = type === "cashback_fijo";
  const isPercentDiscount = type === "descuento_porcentaje";
  const isFixedDiscount = type === "descuento_fijo";

  const discountAmount = Number(appliedPromo?.discount_amount ?? 0) || 0;
  const backendFinal = Number(appliedPromo?.final_amount);
  const hasBackendFinal = !Number.isNaN(backendFinal);

  const cashbackAmount =
    isCashback && benefit?.cashback
      ? Number(benefit.cashback) || 0
      : 0;

  const percentValue =
    isPercentDiscount && benefit?.percentage
      ? Number(benefit.percentage) || 0
      : 0;

  const fixedValue =
    isFixedDiscount && benefit?.amount
      ? Number(benefit.amount) || 0
      : 0;

  const subtotalBase = cart.subtotal;

  // Backend may send final_amount for discounts; MSI y cashback no cambian el total
  let subtotalWithPromo;
  if (!appliedPromo) {
    subtotalWithPromo = subtotalBase;
  } else if (isMSI || isCashback) {
    subtotalWithPromo = subtotalBase;
  } else if (hasBackendFinal) {
    subtotalWithPromo = backendFinal;
  } else {
    subtotalWithPromo = Math.max(0, subtotalBase - discountAmount);
  }

  const total = subtotalWithPromo + shipping;

  const msiMonths = isMSI ? benefit?.months ?? benefit?.meses : null;
  const monthlyPayment =
    isMSI && msiMonths ? total / msiMonths : null;

  const handleCheckout = () => {
    navigate("/checkout", {
      state: { totalWithPromo: total, appliedPromo },
    });
  };

  const handleClear = async () => {
    setBusy(true);
    await clearCart();
    setBusy(false);
  };

  return (
    <aside className="rounded-xl bg-white shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Resumen del pedido</h3>

      <div className="text-sm space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-medium">
            <Price value={subtotalBase} />
          </span>
        </div>

        {!isMSI && !isCashback && appliedPromo && discountAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Descuento promo</span>
            <span className="font-medium">
              -<Price value={discountAmount} />
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span>Envío</span>
          <span className="font-medium">Gratis</span>
        </div>

        <hr className="my-2" />

        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>
            <Price value={total} />
          </span>
        </div>

        {/* Info de MSI */}
        {isMSI && msiMonths && (
          <div className="mt-1 text-xs text-slate-600">
            Tu compra es elegible para{" "}
            <span className="font-semibold">
              {msiMonths} meses sin intereses
              {bankName ? ` con ${bankName}` : ""}
            </span>
            {monthlyPayment && (
              <>
                {" "}
                con pagos aproximados de{" "}
                <span className="font-semibold">
                  <Price value={monthlyPayment} />
                </span>
                .
              </>
            )}
          </div>
        )}

        {/* Info de cashback */}
        {isCashback && cashbackAmount > 0 && (
          <div className="mt-1 text-xs text-emerald-700">
            Recibirás un{" "}
            <span className="font-semibold">
              cashback de <Price value={cashbackAmount} />
            </span>
            {bankName ? ` en tu tarjeta ${bankName}` : ""} después de completar tu compra.
            El total a pagar en caja se mantiene igual.
          </div>
        )}

        {/* Detalle del tipo de descuento (porcentaje vs fijo) */}
        {appliedPromo && (isPercentDiscount || isFixedDiscount) && (
          <div className="mt-1 text-xs text-emerald-700">
            {isPercentDiscount ? (
              <>
                Incluye un descuento de{" "}
                <span className="font-semibold">
                  {percentValue}%
                </span>{" "}
                equivalente a{" "}
                <span className="font-semibold">
                  <Price value={discountAmount} />
                </span>
                .
              </>
            ) : (
              <>
                Incluye un descuento directo de{" "}
                <span className="font-semibold">
                  <Price value={fixedValue || discountAmount} />
                </span>{" "}
                aplicado a tu compra.
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <CustomButton
          text="Ir a Checkout"
          style="primary"
          extraStyles="h-11 w-full rounded-xl"
          onClick={handleCheckout}
        />

        <CustomButton
          text="Vaciar carrito"
          style="cancel"
          extraStyles="h-11 w-full rounded-xl"
          onClick={handleClear}
        />

        {busy && (
          <div className="text-center">
            <Spinner inline text="Procesando..." />
          </div>
        )}
      </div>
    </aside>
  );
}

// Main cart page wrapper with provider
export default function CartPage({ products = [] }) {
  return (
    <CartProvider>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tu Carrito</h1>
          <CartBadge />
        </header>

        {products.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Catálogo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

// Splits main content into promo sidebar and items plus summary
function MainCartContent() {
  const { cart, loading, error } = useCart();
  const [appliedPromo, setAppliedPromo] = useState(null);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <SkeletonRow key={i} />
        ))}
        <SkeletonSummary />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-6 text-red-700">
        {error}
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="rounded-xl border p-10 text-center text-slate-600">
        Tu carrito está vacío.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,2fr)]">
      <PromoSidebar
        appliedPromo={appliedPromo}
        setAppliedPromo={setAppliedPromo}
      />

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

// Skeleton row for loading state
function SkeletonRow() {
  return (
    <div className="grid grid-cols-[80px,1fr,120px] gap-4 border p-4 rounded-xl animate-pulse">
      <div className="bg-slate-200 h-20 w-20 rounded" />
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-3 bg-slate-200 rounded w-1/3" />
        <div className="h-8 bg-slate-200 rounded w-1/4 mt-3" />
      </div>
      <div className="bg-slate-200 h-4 w-10 rounded ml-auto" />
    </div>
  );
}

// Skeleton summary for loading state
function SkeletonSummary() {
  return (
    <aside className="border p-4 rounded-xl animate-pulse">
      <div className="h-5 bg-slate-200 rounded w-24 mb-3" />
      <div className="h-4 bg-slate-200 rounded w-32" />
      <div className="h-10 bg-slate-200 rounded mt-4" />
      <div className="h-10 bg-slate-200 rounded mt-3" />
    </aside>
  );
}
