import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import Spinner from "../components/UI/Spinner";
import { toast } from "react-toastify";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Env variable keeps the publishable key out of the source code and version control
const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!pk) {
  // Generic message avoids leaking sensitive configuration details into the console
  console.error("Stripe publishable key is not configured in the environment.");
}

// Stripe is loaded once at module level to avoid creating new instances on each render
const stripePromise = pk ? loadStripe(pk) : null;

// Small helper component for consistent price formatting
const Price = ({ value }) => (
  <span>${Number(value ?? 0).toFixed(2)}</span>
);

function Checkout() {
  const { cart, clearCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL;

  // State from location keeps promo and total in sync with the cart page
  const { totalWithPromo, appliedPromo } = location.state || {};

  // Holds normalized PaymentIntent data returned by the backend
  const [intentData, setIntentData] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [error, setError] = useState("");

  const shipping = 0;

  // Subtotal comes from cart context so checkout always reflects current cart contents
  const subtotalBase = cart?.subtotal ?? 0;

  // Discount comes from appliedPromo to keep the same promotion used in the cart
  const promoDiscount = appliedPromo?.discount_amount ?? 0;

  // Memo avoids recalculating derived subtotal when inputs do not change
  const subtotalAfterPromo = useMemo(
    () => Math.max(0, subtotalBase - promoDiscount),
    [subtotalBase, promoDiscount]
  );

  const computedTotal = useMemo(
    () => subtotalAfterPromo + shipping,
    [subtotalAfterPromo, shipping]
  );

  // Cart total is treated as the main source of truth when provided
  const total =
    typeof totalWithPromo === "number" ? totalWithPromo : computedTotal;

  const clientSecret = intentData?.client_secret ?? null;
  const orderId = intentData?.order_id ?? null;

  // Prevents users from entering checkout when there are no items in the cart
  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate("/cart");
    }
  }, [cart, navigate]);

  // Creates a PaymentIntent once there is a valid cart and an authenticated user
  useEffect(() => {
    if (!cart || cart.items.length === 0) return;

    if (!token) {
      // Redirects to login because payments require authentication
      navigate("/login");
      return;
    }

    const createPaymentIntent = async () => {
      setLoadingIntent(true);
      setError("");

      try {
        // Backend computes the amount so client-side totals cannot be tampered with
        const res = await fetch(`${API_URL}/payments/intent`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error || data.message || "No se pudo iniciar el pago."
          );
        }

        // Normalization handles different possible backend response shapes
        let normalized = null;

        if (data && data.client_secret) {
          if (typeof data.client_secret === "string") {
            normalized = {
              client_secret: data.client_secret,
              order_id: data.order_id ?? null,
              payment_method: data.payment_method ?? null,
            };
          } else if (typeof data.client_secret === "object") {
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

        // Early validation catches malformed client secrets before reaching Stripe
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
        setError(err.message || "Ocurrió un error al crear el pago.");
      } finally {
        setLoadingIntent(false);
      }
    };

    createPaymentIntent();
  }, [API_URL, cart, token, navigate]);

  // Fallback view for cases where cart changed to empty while navigating
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
        {/* Left column: payment form and Stripe integration */}
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

          {clientSecret &&
            typeof clientSecret === "string" &&
            stripePromise && (
              <Elements stripe={stripePromise}>
                <PaymentCheckoutForm
                  total={total}
                  clearCart={clearCart}
                  onSuccess={() => navigate("/")}
                  orderId={orderId}
                  clientSecret={clientSecret}
                />
              </Elements>
            )}

          {!clientSecret && !loadingIntent && !error && (
            <p className="text-sm text-slate-500">
              No se pudo inicializar el pago. Intenta recargar la página.
            </p>
          )}
        </section>

        {/* Right column: summary of products and totals */}
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
                <Price value={subtotalBase} />
              </span>
            </div>

            {promoDiscount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Descuento promo</span>
                <span className="font-medium">
                  -<Price value={promoDiscount} />
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Envío</span>
              <span className="font-medium">Gratis</span>
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

function PaymentCheckoutForm({
  total,
  clearCart,
  onSuccess,
  orderId,
  clientSecret,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  // successPhase: null | 'spinner' | 'check'
  const [successPhase, setSuccessPhase] = useState(null);
  const [checkDraw, setCheckDraw] = useState(false);

  // Central flag that indicates when Stripe hooks are not yet ready
  const stripeNotReady = !stripe || !elements;

  const validateEmail = (value) => {
    if (!value) return "Ingresa tu correo electrónico.";
    // Simple pattern used only for basic email format validation
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(value)) {
      return "Ingresa un correo válido.";
    }
    return null;
  };

  const handleEmailBlur = () => {
    const err = validateEmail(email);
    setEmailError(err);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    // Errors and messages are cleared while the user edits the input
    setEmailError(null);
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    if (!clientSecret) {
      // Prevents calling confirmCardPayment without a valid clientSecret
      setMessage("No se pudo iniciar el pago. Falta el client_secret.");
      return;
    }

    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      setMessage(err);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setCardError("");

    try {
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        setMessage("No se pudo inicializar el formulario de tarjeta.");
        setIsLoading(false);
        return;
      }

      // confirmCardPayment is used because CardElement sends card data directly to Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: email || undefined,
            },
          },
        }
      );

      if (error) {
        setCardError(error.message || "Error al procesar el pago.");
        setMessage(error.message || "Error al procesar el pago.");
        setIsLoading(false);
        return;
      }

        if (paymentIntent && paymentIntent.status === "succeeded") {
          // Successful payment: DO NOT clear the cart yet (prevents redirect to empty cart)
          // Show a success overlay with animation instead of navigating immediately
          setMessage("Pago realizado con éxito.");
          toast.success("Pago realizado con éxito.");
          // Start the spinner->check sequence
          setSuccessPhase("spinner");

          setTimeout(() => {
            setSuccessPhase("check");
            setTimeout(() => setCheckDraw(true), 80);
          }, 900);

          // Keep overlay until user action (they will click "Regresar a la página principal")
      } else {
        setMessage("No se pudo completar el pago. Inténtalo de nuevo.");
      }
    } catch {
      setMessage("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email is used to attach a receipt and contact info to the payment */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="email"
          className="text-sm font-medium text-slate-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          className={`h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/50 ${
            emailError ? "border-red-400" : "border-slate-300"
          }`}
          placeholder="tucorreo@ejemplo.com"
        />
        {emailError && (
          <div className="text-xs text-red-600 mt-1" id="email-errors">
            {emailError}
          </div>
        )}
      </div>

      <h4 className="mt-4 text-sm font-semibold text-slate-800">
        Método de pago
      </h4>

      {/* CardElement renders Stripe's secure card inputs inside this container */}
      <div className="rounded-xl border px-3 py-3 bg-white">
        <CardElement
          id="card-element"
          options={{
            hidePostalCode: true,
            style: {
              base: {
                fontSize: "16px",
              },
            },
          }}
          onChange={(event) => {
            // Real-time validation errors from Stripe are shown directly to the user
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
          Stripe todavía no está listo, espera un momento...
        </p>
      )}

      {cardError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {cardError}
        </div>
      )}

      <button
        type="submit"
        disabled={stripeNotReady || isLoading}
        id="submit"
        className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-primary-400 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner inline text="Procesando pago" />
          </div>
        ) : (
          <>
            Pagar{" "}
            <span className="ml-1">
              <Price value={total} />
            </span>
          </>
        )}
      </button>

      {/* Final payment status or error message shown after attempting to pay */}
      {message && (
        <div
          id="payment-message"
          className="mt-2 text-xs text-slate-700"
        >
          {message}
        </div>
      )}

      {successPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Solid white backdrop so the checkout page underneath is fully hidden */}
          <div className="absolute inset-0 bg-white" />

          <div className="relative z-10 flex items-center justify-center">
            {/* Card modal: white background to hide the payment form underneath */}
            <div className="w-[420px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex flex-col items-center gap-4">
                {/* Spinner phase: green ring spinning */}
                {successPhase === "spinner" && (
                  <div className="flex items-center justify-center rounded-full" style={{ width: 160, height: 160 }}>
                    <style>{`
                      @keyframes ring-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                      @keyframes ring-dash { 0% { stroke-dashoffset: 0; } 50% { stroke-dashoffset: 47; } 100% { stroke-dashoffset: 0; } }
                    `}</style>
                    <svg viewBox="0 0 50 50" className="h-[140px] w-[140px]" style={{ overflow: 'visible' }}>
                      <g style={{ transformOrigin: '25px 25px', animation: 'ring-rotate 1s linear infinite' }}>
                        <circle cx="25" cy="25" r="20" fill="none" stroke="#F0FFF4" strokeWidth="6" />
                        <circle cx="25" cy="25" r="20" fill="none" stroke="#16A34A" strokeWidth="6" strokeLinecap="round" strokeDasharray="47" strokeDashoffset="0" style={{ strokeDasharray: 47, animation: 'ring-dash 1.2s ease-in-out infinite' }} />
                      </g>
                    </svg>
                  </div>
                )}

                {/* Check phase: green circle with white check drawing */}
                {successPhase === "check" && (
                  <div className="flex items-center justify-center rounded-full" style={{ width: 160, height: 160 }}>
                    <svg viewBox="0 0 64 64" className="h-[160px] w-[160px] drop-shadow-2xl" aria-hidden>
                      <circle cx="32" cy="32" r="30" fill="#10B981" />
                      <path
                        d="M20 33 L28 41 L45 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          strokeDasharray: 48,
                          strokeDashoffset: checkDraw ? 0 : 48,
                          transition: 'stroke-dashoffset 700ms cubic-bezier(.2,.9,.2,1)',
                        }}
                      />
                    </svg>
                  </div>
                )}

                <div className="text-center">
                  <div className="text-xl font-semibold text-slate-900">{successPhase === 'check' ? '¡Pago exitoso!' : 'Procesando pago...'}</div>
                  <div className="text-sm text-slate-600">{successPhase === 'check' ? 'Gracias por tu compra.' : 'Espera mientras confirmamos tu pago.'}</div>
                </div>

                {/* Buttons shown after the check phase: user decides when to go back */}
                {successPhase === 'check' && (
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        // Navigate to home first to avoid Checkout's "cart empty" redirect
                        navigate("/");
                        // Then clear the cart in background (no race with Checkout effect)
                        try {
                          if (clearCart) await clearCart();
                        } catch (e) {
                          // ignore errors clearing cart
                        }
                        setSuccessPhase(null);
                        setCheckDraw(false);
                      }}
                      className="rounded-md bg-green-50 px-4 py-2 text-sm font-semibold text-green-700"
                    >
                      Regresar a la página principal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export default Checkout;
