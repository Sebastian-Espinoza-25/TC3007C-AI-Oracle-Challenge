import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import TermsModal from "../components/UI/TermsModal";
import PrivacyModal from "../components/UI/PrivacyModal";
// import Spinner from "../components/UI/Spinner";
import CustomButton from "../components/UI/CustomButton"; 
import { toast } from "react-toastify";

// Keep email validation strict but generic so it works for most domains without overfitting to a specific pattern
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Enforce exactly 5 digits for Mexican postal codes to avoid accepting partial or malformed values
const mxPostalCodeRegex = /^\d{5}$/;
// Allow flexible street numbers (e.g. 12, 12A, 12-1) while still blocking obviously invalid characters
const streetNumberRegex = /^\d+[A-Za-z0-9\-\/]*$/;

const SignUp = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL; // ej: http://127.0.0.1:8080/api

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    email: "",
    password: "",
    confirmPassword: "",
    street: "",
    streetNumber: "",
    postalCode: "",
    acceptTerms: false,
  });

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  // Track which modal is open instead of separate booleans so only one can be active at a time
  const [openModal, setOpenModal] = useState(null);
  // Use a separate flag so validation errors are only shown after the user tries to submit
  const [attempted, setAttempted] = useState(false);

  const onChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const getFieldErrors = () => {
    const errs = {};

    if (!formData.firstName.trim()) errs.firstName = "Campo obligatorio";
    if (!formData.lastName.trim()) errs.lastName = "Campo obligatorio";

    if (!formData.age.trim()) errs.age = "Campo obligatorio";
    else {
      const ageNum = Number(formData.age);
      // Combine numeric checks and a simple regex to reject non-integer or malformed ages
      if (!Number.isFinite(ageNum) || !/^\d+$/.test(formData.age)) errs.age = "Edad inválida";
      else if (ageNum < 13 || ageNum > 120) errs.age = "Edad fuera de rango (13–120)";
    }

    if (!formData.email.trim()) errs.email = "Campo obligatorio";
    else if (!emailRegex.test(formData.email)) errs.email = "Correo no válido";

    if (!formData.password) errs.password = "Campo obligatorio";
    if (!formData.confirmPassword) errs.confirmPassword = "Campo obligatorio";
    else if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = "Las contraseñas no coinciden";

    if (!formData.street.trim()) errs.street = "Campo obligatorio";
    if (!formData.streetNumber.trim()) errs.streetNumber = "Campo obligatorio";
    else if (!streetNumberRegex.test(formData.streetNumber)) errs.streetNumber = "Número inválido";

    if (!formData.postalCode.trim()) errs.postalCode = "Campo obligatorio";
    else if (!mxPostalCodeRegex.test(formData.postalCode))
      errs.postalCode = "Código postal inválido (5 dígitos)";

    if (!formData.acceptTerms) errs.acceptTerms = "Debes aceptar los términos";

    return errs;
  };

  // Compute field errors on every render so each keystroke updates the UI feedback immediately
  const fieldErrors = getFieldErrors();
  const isValid = Object.keys(fieldErrors).length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    // Mark that the user has attempted a submit so errors become visible
    setAttempted(true);

    if (!isValid) return;

    // Prevent double submissions while the request is in flight
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          age: Number(formData.age),
          role: "user",
          notifications: "Y",
          postal_code: formData.postalCode.trim(),
          address: `${formData.street.trim()} ${formData.streetNumber.trim()}`,
        }),
      });

      if (!response.ok) {
        // Relay backend error details when available so debugging and UX are clearer
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Error en el servidor");
      }

      // Give the user immediate feedback and a short delay to read the toast before redirecting
      toast.success("Cuenta creada exitosamente 🎉 Redirigiendo al login...");

      setTimeout(() => {
        navigate("/auth/login", { replace: true });
      }, 2500);

    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="allure-card w-full max-w-3xl">

        <header className="mb-4 text-center">
          <h1 className="allure-title">Crea una cuenta</h1>
          <p className="text-sm text-dark-400">Completa el formulario para registrarte.</p>
        </header>

        {serverError && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <p className="text-xs text-dark-400 mb-3">* Campos obligatorios</p>

          {/* Group name and age to keep related fields visually aligned and easier to scan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Nombre *" error={attempted ? fieldErrors.firstName : ""}>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={onChange}
                className="allure-input"
              />
            </Field>

            <Field label="Apellido *" error={attempted ? fieldErrors.lastName : ""}>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={onChange}
                className="allure-input"
              />
            </Field>

            <Field label="Edad *" error={attempted ? fieldErrors.age : ""}>
              <input
                name="age"
                value={formData.age}
                onChange={onChange}
                className="allure-input"
                inputMode="numeric"
              />
            </Field>
          </div>

          <Field label="Correo electrónico *" error={attempted ? fieldErrors.email : ""} className="mt-3">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              className="allure-input"
              placeholder="tucorreo@dominio.com"
            />
          </Field>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Contraseña *" error={attempted ? fieldErrors.password : ""}>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={onChange}
                  className="allure-input pr-10"
                />
                {/* Toggle password visibility to improve usability while keeping the default secure */}
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-dark-500"
                >
                  {showPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </Field>

            <Field label="Confirmar contraseña *" error={attempted ? fieldErrors.confirmPassword : ""}>
              <div className="relative">
                <input
                  type={showConfirmPwd ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={onChange}
                  className="allure-input pr-10"
                />
                {/* Mirror the same visibility toggle for confirm password to match user expectations */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-dark-500"
                >
                  {showConfirmPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </Field>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Calle *" error={attempted ? fieldErrors.street : ""}>
              <input
                name="street"
                value={formData.street}
                onChange={onChange}
                className="allure-input"
              />
            </Field>

            <Field label="Número *" error={attempted ? fieldErrors.streetNumber : ""}>
              <input
                name="streetNumber"
                value={formData.streetNumber}
                onChange={onChange}
                className="allure-input"
                placeholder="123 o 12A"
              />
            </Field>

            <Field label="Código postal *" error={attempted ? fieldErrors.postalCode : ""}>
              <input
                name="postalCode"
                value={formData.postalCode}
                onChange={onChange}
                className="allure-input"
                placeholder="00000"
              />
            </Field>
          </div>

          <div className="mt-3 flex items-start gap-2">
            <input
              id="acceptTerms"
              type="checkbox"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={onChange}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            {/* Use inline buttons to open legal texts instead of navigating away from the form */}
            <label htmlFor="acceptTerms" className="text-sm text-dark-500">
              <span className="font-medium">* Campo obligatorio:</span> Acepto los{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setOpenModal("terms")}
              >
                Términos y Condiciones
              </button>{" "}
              y{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setOpenModal("privacy")}
              >
                Política de Privacidad
              </button>.
            </label>
          </div>

          {attempted && fieldErrors.acceptTerms && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.acceptTerms}</p>
          )}

          <div className="mt-6">
            {/* Delegate button styling and disabled state to a shared component for consistency across forms */}
            <CustomButton
              text={submitting ? "Creando cuenta..." : "Crear cuenta"}
              type="submit"
              disabled={submitting}
            />
          </div>

          <p className="mt-4 text-center text-sm text-dark-500">
            ¿Ya tienes cuenta?{" "}
            <a href="/auth/login" className="font-medium text-primary-500 underline">
              Inicia sesión
            </a>
          </p>
        </form>
      </div>

      {/* Keep modals mounted at this level so they overlay the whole screen and can be reused by any part of the form */}
      <TermsModal open={openModal === "terms"} onClose={() => setOpenModal(null)} />
      <PrivacyModal open={openModal === "privacy"} onClose={() => setOpenModal(null)} />
    </div>
  );
};

export default SignUp;

// Reusable field component to standardize layout and error display across different input types
const Field = ({ label, error, className = "", children }) => (
  // Encapsulate label + input + error to avoid repeating layout logic for every field
  <div className={className}>
    <label className="block text-sm font-medium text-dark-500 mb-1">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);
