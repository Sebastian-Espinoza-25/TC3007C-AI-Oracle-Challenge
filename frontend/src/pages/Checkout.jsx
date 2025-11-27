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

// ===================== STRIPE INIT =====================

// Using an env variable keeps the publishable key out of the source code
const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!pk) {
  // Mensaje genérico; no exponemos detalles de claves
  console.error("Stripe publishable key no está configurada en el entorno.");
}

// Loading Stripe outside the component avoids recreating the Stripe instance on every render
const stripePromise = pk ? loadStripe(pk) : null;

// Small helper for consistent price formatting across the checkout
const Price = ({ value }) => (
  <span>${Number(value ?? 0).toFixed(2)}</span>
);

// ===================== MAIN CHECKOUT PAGE =====================

function Checkout() {
  const { cart, clearCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL;

  // Datos de promo / total que vienen desde el carrito
  const { totalWithPromo, appliedPromo } = location.state || {};

  // Intent data
  const [intentData, setIntentData] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [error, setError] = useState("");

  const shipping = 0;

  // Subtotal base: siempre el del carrito
  const subtotalBase = cart?.subtotal ?? 0;

  // Descuento aplicado: si viene de appliedPromo, lo usamos; si no, 0
  const promoDiscount = appliedPromo?.discount_amount ?? 0;

  // Subtotal después de promoción
  const subtotalAfterPromo = useMemo(
    () => Math.max(0, subtotalBase - promoDiscount),
    [subtotalBase, promoDiscount]
  );

  // Impuestos calculados sobre el subtotal con promo
  const taxes = useMemo(
    () => Math.round(subtotalAfterPromo * 0.09 * 100) / 100,
    [subtotalAfterPromo]
  );

  // Total calculado en frontend (con promo + impuestos)
  const computedTotal = useMemo(
    () => subtotalAfterPromo + shipping + taxes,
    [subtotalAfterPromo, taxes]
  );

  // Si el carrito nos mandó un total con promo ya calculado, lo usamos para mostrar;
  // si no, usamos el total calculado aquí.
  const total = typeof totalWithPromo === "number" ? totalWithPromo : computedTotal;

  const clientSecret = intentData?.client_secret ?? null;
  const orderId = intentData?.order_id ?? null; // por si lo quieres usar luego

  // Navigation guard so users cannot access /checkout with an empty cart
  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate("/cart");
    }
  }, [cart, navigate]);

  // Effect in charge of creating the PaymentIntent when there is a cart and a logged-in user
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
        // El backend ignora el amount del frontend y toma el total desde DB
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

        // Normalización de la respuesta
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
        // Mensaje genérico para no exponer detalles internos
        setError(err.message || "Ocurrió un error al crear el pago.");
      } finally {
        setLoadingIntent(false);
      }
    };

    createPaymentIntent();
  }, [API_URL, cart, token, navigate]);

  // Simple fallback UI for the case where the user somehow bypassed the initial guard
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

// ===================== PAYMENT FORM (STYLE LIKE YOUR SNIPPET) =====================

function PaymentCheckoutForm({ total, clearCart, onSuccess, orderId }) {
  const stripe = useStripe();
  const elements = useElements();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  const stripeNotReady = !stripe || !elements;

  const validateEmail = (value) => {
    if (!value) return "Ingresa tu correo electrónico.";
    // regex simple, suficiente para validación básica sin ser demasiado restrictivo
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
    setEmailError(null);
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

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
      // PaymentElement usa confirmPayment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          receipt_email: email || undefined,
          // Podrías configurar un return_url si usaras redirecciones
          // return_url: `${window.location.origin}/order-success`,
        },
        redirect: "if_required",
      });

      if (error) {
        setCardError(error.message || "Error al procesar el pago.");
        setMessage(error.message || "Error al procesar el pago.");
        setIsLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        await clearCart();
        setMessage("Pago realizado con éxito.");
        onSuccess?.();
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
      {/* Email — similar al snippet, pero con Tailwind */}
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

      {/* Payment header like "Payment" */}
      <h4 className="mt-4 text-sm font-semibold text-slate-800">
        Método de pago
      </h4>

      {/* PaymentElement encapsula todos los campos de tarjeta / métodos soportados */}
      <div className="rounded-xl border px-3 py-3 bg-white">
        <PaymentElement
          id="payment-element"
          onChange={(event) => {
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
          <>Pagar <span className="ml-1"><Price value={total} /></span></>
        )}
      </button>

      {/* Mensajes de error/estado final */}
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

