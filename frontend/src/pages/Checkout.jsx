import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import Spinner from "../components/UI/Spinner";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ===================== STRIPE INIT =====================
const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!pk) {
  console.error("❌ VITE_STRIPE_PUBLISHABLE_KEY no está definido.");
}

const stripePromise = pk ? loadStripe(pk) : null;

const Price = ({ value }) => (
  <span>${Number(value ?? 0).toFixed(2)}</span>
);

// ===================== MAIN PAGE =====================

function Checkout() {
  const { cart, clearCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  // Guardamos un objeto ya NORMALIZADO: { client_secret: string, order_id, payment_method }
  const [intentData, setIntentData] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [error, setError] = useState("");

  const shipping = 0;
  const taxes = useMemo(
    () => Math.round(cart.subtotal * 0.09 * 100) / 100,
    [cart.subtotal]
  );
  const total = useMemo(
    () => cart.subtotal + shipping + taxes,
    [cart.subtotal, taxes]
  );

  const clientSecret = intentData?.client_secret ?? null;
  const orderId = intentData?.order_id ?? null;

  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate("/cart");
    }
  }, [cart, navigate]);

  useEffect(() => {
    if (!cart || cart.items.length === 0) return;
    if (!token) {
      navigate("/login");
      return;
    }

    const createPaymentIntent = async () => {
      setLoadingIntent(true);
      setError("");

      try {
        const res = await fetch(`${API_URL}/payments/intent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: total,
          }),
        });

        const data = await res.json();
        console.log("🔎 Respuesta /payments/intent cruda:", data);

        if (!res.ok) {
          throw new Error(
            data.error || data.message || "No se pudo iniciar el pago."
          );
        }

        // ===================== NORMALIZACIÓN =====================
        // data puede ser:
        // 1) { client_secret: "pi_..._secret_...", order_id, payment_method }
        // 2) { client_secret: { client_secret: "pi_..._secret_...", order_id, payment_method } }
        let normalized = null;

        if (data && data.client_secret) {
          if (typeof data.client_secret === "string") {
            // Caso 1: ya viene plano
            normalized = {
              client_secret: data.client_secret,
              order_id: data.order_id ?? null,
              payment_method: data.payment_method ?? null,
            };
          } else if (typeof data.client_secret === "object") {
            // Caso 2: viene anidado
            const inner = data.client_secret;
            normalized = {
              client_secret:
                inner.client_secret ?? inner.clientSecret ?? null,
              order_id:
                inner.order_id ??
                inner.orderId ??
                data.order_id ??
                null,
              payment_method:
                inner.payment_method ??
                inner.paymentMethod ??
                data.payment_method ??
                null,
            };
          }
        }

        console.log("✅ IntentData normalizado:", normalized);

        if (
          !normalized ||
          typeof normalized.client_secret !== "string" ||
          !normalized.client_secret.startsWith("pi_")
        ) {
          throw new Error(
            "La API no devolvió un client_secret válido para Stripe."
          );
        }

        setIntentData(normalized);
      } catch (err) {
        console.error(err);
        setError(err.message || "Ocurrió un error al crear el pago.");
      } finally {
        setLoadingIntent(false);
      }
    };

    createPaymentIntent();
  }, [API_URL, cart, token, total, navigate]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="rounded-2xl border p-6 text-center text-slate-600">
          Tu carrito está vacío. Agrega algunos productos antes de realizar el pago.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <div className="text-sm text-slate-600">
          Total a pagar:{" "}
          <span className="font-semibold">
            <Price value={total} />
          </span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr),minmax(0,1.2fr)]">
        {/* Columna izquierda: pago */}
        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Datos de pago</h2>

          <p className="mb-3 text-xs text-slate-500">
            Pagos procesados de forma segura con Stripe. Solo tarjetas de
            crédito y débito.
          </p>

          {loadingIntent && (
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
              <Spinner inline text="Preparando el pago seguro" />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Solo montamos Elements si tenemos clientSecret string */}
          {clientSecret &&
            typeof clientSecret === "string" &&
            stripePromise && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: clientSecret,
                  appearance: { theme: "stripe" },
                }}
              >
                <CardCheckoutForm
                  total={total}
                  clientSecret={clientSecret}
                  clearCart={clearCart}
                  onSuccess={() => navigate("/")}
                  orderId={orderId}
                />
              </Elements>
            )}

          {!clientSecret && !loadingIntent && !error && (
            <p className="text-sm text-slate-500">
              No se pudo inicializar el pago. Intenta recargar la página.
            </p>
          )}
        </section>

        {/* Columna derecha: resumen */}
        <aside className="rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Resumen del pedido</h2>

          <div className="mb-4 max-h-64 space-y-3 overflow-y-auto pr-2">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-slate-500">
                    {item.qty} × <Price value={item.price} />
                  </span>
                </div>
                <div className="font-semibold">
                  <Price value={item.price * item.qty} />
                </div>
              </div>
            ))}
          </div>

          <hr className="my-3" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium">
                <Price value={cart.subtotal} />
              </span>
            </div>
            <div className="flex justify-between">
              <span>Envío</span>
              <span className="font-medium">Gratis</span>
            </div>
            <div className="flex justify-between">
              <span>Impuestos</span>
              <span className="font-medium">
                <Price value={taxes} />
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>
                <Price value={total} />
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ===================== CARD FORM =====================

function CardCheckoutForm({ total, clientSecret, clearCart, onSuccess, orderId }) {
  const stripe = useStripe();
  const elements = useElements();

  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState("");

  const stripeNotReady = !stripe || !elements;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setCardError("");

    const cardElement = elements.getElement(CardElement);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: billingName || undefined,
              email: billingEmail || undefined,
            },
          },
        }
      );

      if (error) {
        console.error(error);
        setCardError(error.message || "Error al procesar el pago.");
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        await clearCart();
        onSuccess?.();
      } else {
        setCardError("No se pudo completar el pago. Inténtalo de nuevo.");
      }
    } catch (err) {
      console.error(err);
      setCardError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Datos de facturación */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Nombre en la tarjeta
          </label>
          <input
            type="text"
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
            className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/50"
            placeholder="Nombre completo"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Correo electrónico
          </label>
          <input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/50"
            placeholder="tucorreo@ejemplo.com"
          />
        </div>
      </div>

      {/* CardElement */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">
          Datos de la tarjeta
        </label>
        <div className="rounded-xl border px-3 py-3 bg-white">
          <CardElement
            options={{
              hidePostalCode: true,
              style: {
                base: {
                  fontSize: "16px",
                  color: "#0f172a",
                  "::placeholder": {
                    color: "#9ca3af",
                  },
                },
                invalid: {
                  color: "#ef4444",
                },
              },
            }}
            onReady={(el) => {
              console.log("✅ Stripe CardElement READY", el);
            }}
            onChange={(event) => {
              console.log("CardElement change:", event);
              if (event.error) {
                setCardError(event.error.message);
              } else {
                setCardError("");
              }
            }}
          />
        </div>
        {stripeNotReady && (
          <p className="text-xs text-amber-600 mt-1">
            Stripe todavía no está listo (stripe o elements es null).
          </p>
        )}
      </div>

      {cardError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {cardError}
        </div>
      )}

      <button
        type="submit"
        disabled={stripeNotReady || processing}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? (
          <div className="flex items-center gap-2">
            <Spinner inline text="Procesando pago" />
          </div>
        ) : (
          <>
            Pagar <span className="ml-1"><Price value={total} /></span>
          </>
        )}
      </button>
    </form>
  );
}

export default Checkout;
