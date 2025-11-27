import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import Spinner from "../components/UI/Spinner";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Using an env variable keeps the publishable key out of the committed source code
const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!pk) {
  // Logging a generic message avoids leaking environment details to the console
  console.error("Stripe publishable key no está configurada en el entorno.");
}

// Loading Stripe outside the component avoids recreating the Stripe instance on every render
const stripePromise = pk ? loadStripe(pk) : null;

// Small helper for consistent price formatting across the checkout UI
const Price = ({ value }) => (
  <span>${Number(value ?? 0).toFixed(2)}</span>
);

function Checkout() {
  const { cart, clearCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL;

  // Promo data and pre-calculated totals may be passed from the cart to keep UI in sync
  const { totalWithPromo, appliedPromo } = location.state || {};

  // Intent data obtained from backend (Stripe PaymentIntent metadata)
  const [intentData, setIntentData] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [error, setError] = useState("");

  const shipping = 0;

  // Subtotal is always taken from the current cart state so the UI reflects actual contents
  const subtotalBase = cart?.subtotal ?? 0;

  // Using discount from appliedPromo ensures the same promotion used in the cart is applied here
  const promoDiscount = appliedPromo?.discount_amount ?? 0;

  // Subtotal after applying promotion; Math.max prevents negative totals
  const subtotalAfterPromo = useMemo(
    () => Math.max(0, subtotalBase - promoDiscount),
    [subtotalBase, promoDiscount]
  );

  // Taxes are derived from subtotalAfterPromo so discounts also reduce tax amount
  const taxes = useMemo(
    () => Math.round(subtotalAfterPromo * 0.09 * 100) / 100,
    [subtotalAfterPromo]
  );

  // Total is computed on the frontend as a fallback when no explicit totalWithPromo is provided
  const computedTotal = useMemo(
    () => subtotalAfterPromo + shipping + taxes,
    [subtotalAfterPromo, taxes]
  );

  // If the cart already calculated a totalWithPromo, we prefer that value to keep consistency
  const total =
    typeof totalWithPromo === "number" ? totalWithPromo : computedTotal;

  const clientSecret = intentData?.client_secret ?? null;
  const orderId = intentData?.order_id ?? null; // reserved for future order tracking uses

  // Navigation guard so users cannot access /checkout with an empty cart
  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate("/cart");
    }
  }, [cart, navigate]);

  // Effect responsible for creating the PaymentIntent when the cart is valid and the user is logged in
  useEffect(() => {
    if (!cart || cart.items.length === 0) return;

    if (!token) {
      // Redirect to login if payment is attempted without authentication
      navigate("/login");
      return;
    }

    const createPaymentIntent = async () => {
      setLoadingIntent(true);
      setError("");

      try {
        // Backend decides the final amount from DB to avoid trusting client-side totals
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

        // Normalization layer to handle different shapes of client_secret responses
        let normalized = null;

        if (data && data.client_secret) {
          if (typeof data.client_secret === "string") {
            // Case where backend returns a plain client_secret string
            normalized = {
              client_secret: data.client_secret,
              order_id: data.order_id ?? null,
              payment_method: data.payment_method ?? null,
            };
          } else if (typeof data.client_secret === "object") {
            // Case where backend nests clientSecret and related fields in an object
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

        // Checking for a valid PaymentIntent key pattern helps catch malformed responses early
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
        // Using a generic user-facing message while preserving the actual error in memory
        setError(err.message || "Ocurrió un error al crear el pago.");
      } finally {
        setLoadingIntent(false);
      }
    };

    createPaymentIntent();
  }, [API_URL, cart, token, navigate]);

  // Simple fallback UI for the edge case where the guard didn't run or cart changed during navigation
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
        {/* Left column: payment section */}
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
              <Elements
                // Mounting Elements only when clientSecret and Stripe instance exist avoids runtime errors
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: "stripe" },
                  paymentMethodOrder: ["card"],
                }}
              >
                <PaymentCheckoutForm
                  total={total}
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

        {/* Right column: order summary */}
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

function PaymentCheckoutForm({ total, clearCart, onSuccess, orderId }) {
  const stripe = useStripe();
  const elements = useElements();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  // Using this flag centralizes all "Stripe not ready" checks in one place
  const stripeNotReady = !stripe || !elements;

  const validateEmail = (value) => {
    if (!value) return "Ingresa tu correo electrónico.";
    // Lightweight regex for a basic email check without being overly strict
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
    // Clearing previous errors and messages while the user edits the field
    setEmailError(null);
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const err = validateEmail(email);
    if (err) {
      // Showing the same validation message both near the input and as a global message
      setEmailError(err);
      setMessage(err);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setCardError("");

    try {
      // PaymentElement uses confirmPayment to handle all payment method details
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          receipt_email: email || undefined,
          // A return_url could be used if you configure redirect-based flows
          // return_url: `${window.location.origin}/order-success`,
        },
        redirect: "if_required",
      });

      if (error) {
        // Keeping both cardError and message in sync gives feedback in two places
        setCardError(error.message || "Error al procesar el pago.");
        setMessage(error.message || "Error al procesar el pago.");
        setIsLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Clearing cart here ensures it only happens when Stripe confirms the payment
        await clearCart();
        setMessage("Pago realizado con éxito.");
        onSuccess?.();
      } else {
        // Non-succeeded states are treated as failures at this stage
        setMessage("No se pudo completar el pago. Inténtalo de nuevo.");
      }
    } catch {
      // Generic message for unexpected exceptions, avoiding leaking error details
      setMessage("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email — collected for receipt and basic verification */}
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

      {/* Payment header */}
      <h4 className="mt-4 text-sm font-semibold text-slate-800">
        Método de pago
      </h4>

      {/* PaymentElement encapsulates all card / payment method fields according to Stripe config */}
      <div className="rounded-xl border px-3 py-3 bg-white">
        <PaymentElement
          id="payment-element"
          onChange={(event) => {
            // Using onChange to surface real-time validation errors from Stripe UI
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
          Stripe todavía no está listo, espera un momento…
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

      {/* Final status / error messages for the payment attempt */}
      {message && (
        <div
          id="payment-message"
          className="mt-2 text-xs text-slate-700"
        >
          {message}
        </div>
      )}
    </form>
  );
}

export default Checkout;
