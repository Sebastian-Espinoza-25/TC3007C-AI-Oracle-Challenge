import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Modal from "../components/UI/Modal";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import Spinner from "../components/UI/Spinner";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// Stripe public key must be set in Vite env as VITE_STRIPE_PUBLISHABLE_KEY
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

function CheckoutForm({ clientSecret, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

    // Basic client-side validation
    if (!name || !email || !address1 || !city || !postalCode || !country) {
      toast.error("Por favor completa los campos requeridos: nombre, email, dirección, ciudad, código postal y país.");
      setProcessing(false);
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      toast.error("Error: no se encontró el elemento de tarjeta.");
      setProcessing(false);
      return;
    }

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
            card,
            billing_details: {
              name: name || undefined,
              email: email || undefined,
              phone: phone || undefined,
              address: {
                line1: address1 || undefined,
                line2: address2 || undefined,
                city: city || undefined,
                state: stateVal || undefined,
                postal_code: postalCode || undefined,
                country: country || undefined,
              },
            },
          },
      });

      if (result.error) {
        toast.error(`Pago fallido: ${result.error.message}`);
      } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
        toast.success("Pago exitoso. Gracias por tu compra.");
        onClose?.();
        navigate("/");
      } else {
        toast.info("Pago procesándose. Revisa tu correo para confirmar.");
      }
    } catch (err) {
      toast.error(err.message || "Error procesando el pago.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Nombre</label>
        <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="Nombre en la tarjeta" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="tu@ejemplo.com" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Teléfono</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="+52 1 55 0000 0000" />
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Dirección (línea 1)</label>
          <input value={address1} onChange={e => setAddress1(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="Calle y número" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Dirección (línea 2)</label>
          <input value={address2} onChange={e => setAddress2(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="Interior, colonia, etc. (opcional)" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Ciudad</label>
          <input value={city} onChange={e => setCity(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Estado / Provincia</label>
          <input value={stateVal} onChange={e => setStateVal(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Código postal</label>
          <input value={postalCode} onChange={e => setPostalCode(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">País</label>
        <input value={country} onChange={e => setCountry(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="MX" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Tarjeta</label>
        <div className="mt-2 rounded border px-3 py-3 bg-white">
          <CardElement options={{ hidePostalCode: true }} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} />
          <span className="text-sm">Guardar tarjeta para próximos pagos</span>
        </label>
        <div className="ml-auto flex items-center gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Cancelar</button>
          <button type="submit" disabled={processing || !stripe} className="rounded-xl bg-indigo-700 px-4 py-2 text-white disabled:opacity-60">
            {processing ? <Spinner inline size={4} text="Procesando" /> : "Pagar ahora"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function Checkout() {
  const { cart } = useCart();
  const { token, isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [loadingIntent, setLoadingIntent] = useState(false);

  const total = (() => {
    const shipping = 0;
    const taxes = Math.round(cart.subtotal * 0.09 * 100) / 100;
    return Math.round((cart.subtotal + shipping + taxes) * 100) / 100;
  })();

  const API_URL = import.meta.env.VITE_API_URL;

  const openModal = async () => {
    if (!isLoggedIn || !token) {
      toast.info("Debes iniciar sesión para proceder al pago.");
      return;
    }
    if (!cart || cart.items.length === 0) {
      toast.info("Tu carrito está vacío.");
      return;
    }

    try {
      setLoadingIntent(true);
      const res = await fetch(`${API_URL}/payments/payment/intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: total }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Error creando PaymentIntent: ${res.status}`);
      }

      const data = await res.json();
      setClientSecret(data.client_secret || data.client_secret || data.client_secret);
      setOpen(true);
    } catch (e) {
      toast.error(e.message || "No se pudo iniciar el pago.");
    } finally {
      setLoadingIntent(false);
    }
  };

  return (
    <div className="flex-grow p-6">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-2xl border p-6">
          <h2 className="mb-3 text-lg font-semibold">Resumen del pedido</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-medium">${cart.subtotal?.toFixed(2) ?? "0.00"}</span></div>
            <div className="flex items-center justify-between"><span>Envío</span><span className="font-medium">Gratis</span></div>
            <div className="flex items-center justify-between"><span>Impuestos</span><span className="font-medium">${(Math.round(cart.subtotal * 0.09 * 100) / 100).toFixed(2)}</span></div>
            <hr className="my-2" />
            <div className="flex items-center justify-between text-base font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>
          <div className="mt-4">
            <button onClick={openModal} disabled={cart.items.length === 0 || loadingIntent} className="h-11 rounded-xl bg-indigo-700 text-white disabled:cursor-not-allowed disabled:opacity-50">
              {loadingIntent ? "Iniciando pago..." : "Pagar"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border p-6">
          <h2 className="mb-3 text-lg font-semibold">Información</h2>
          <p className="text-sm text-slate-600">Aquí puedes confirmar tu dirección de envío y revisar los artículos del pedido antes de pagar. El formulario de tarjeta se abre en un modal seguro provisto por Stripe.</p>
        </section>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Pago seguro">
        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm clientSecret={clientSecret} onClose={() => setOpen(false)} />
          </Elements>
        ) : (
          <div className="p-6 text-center">Cargando...</div>
        )}
      </Modal>
    </div>
  );
}