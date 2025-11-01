import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import TermsModal from "../components/UI/TermsModal";
import PrivacyModal from "../components/UI/PrivacyModal";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mxPostalCodeRegex = /^\d{5}$/;
const streetNumberRegex = /^\d+[A-Za-z0-9\-\/]*$/;

const SignUp = () => {
  const navigate = useNavigate();

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
  const [openModal, setOpenModal] = useState(null); // 'terms' | 'privacy' | null
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
    else if (!streetNumberRegex.test(formData.streetNumber)) errs.streetNumber = "Número de calle inválido";

    if (!formData.postalCode.trim()) errs.postalCode = "Campo obligatorio";
    else if (!mxPostalCodeRegex.test(formData.postalCode)) errs.postalCode = "Código postal inválido (5 dígitos)";

    if (!formData.acceptTerms) errs.acceptTerms = "Debes aceptar los términos";

    return errs;
  };

  const fieldErrors = getFieldErrors();
  const isValid = Object.keys(fieldErrors).length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setAttempted(true);
    if (!isValid) return;

    try {
      setSubmitting(true);
      await new Promise((r) => setTimeout(r, 900));
      navigate("/auth/login", { replace: true });
    } catch (err) {
      setServerError(err.message || "Ocurrió un problema. Intenta de nuevo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-6 md:p-8 border border-slate-100">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Crear cuenta</h1>
            <p className="text-sm text-slate-500 mt-1">Completa el formulario para registrarte.</p>
          </header>

          {serverError && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <p className="text-xs text-slate-500 mb-3">* Campos obligatorios</p>

            {/* Nombre, Apellido y Edad */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Nombre *" error={attempted ? fieldErrors.firstName : ""}>
                <input name="firstName" value={formData.firstName} onChange={onChange} className={inputCls} />
              </Field>
              <Field label="Apellido *" error={attempted ? fieldErrors.lastName : ""}>
                <input name="lastName" value={formData.lastName} onChange={onChange} className={inputCls} />
              </Field>
              <Field label="Edad *" error={attempted ? fieldErrors.age : ""}>
                <input name="age" value={formData.age} onChange={onChange} className={inputCls} inputMode="numeric" />
              </Field>
            </div>

            {/* Correo */}
            <Field label="Correo electrónico *" error={attempted ? fieldErrors.email : ""} className="mt-3">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onChange}
                className={inputCls}
                placeholder="tucorreo@dominio.com"
              />
            </Field>

            {/* Contraseñas */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Contraseña *" error={attempted ? fieldErrors.password : ""}>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={onChange}
                    className={`${inputCls} pr-10`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                    aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPwd ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
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
                    className={`${inputCls} pr-10`}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                    aria-label={showConfirmPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirmPwd ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                  </button>
                </div>
              </Field>
            </div>

            {/* Dirección */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Calle *" error={attempted ? fieldErrors.street : ""}>
                <input name="street" value={formData.street} onChange={onChange} className={inputCls} />
              </Field>
              <Field label="Número *" error={attempted ? fieldErrors.streetNumber : ""}>
                <input
                  name="streetNumber"
                  value={formData.streetNumber}
                  onChange={onChange}
                  className={inputCls}
                  placeholder="123 o 12A"
                />
              </Field>
              <Field label="Código postal *" error={attempted ? fieldErrors.postalCode : ""}>
                <input
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={onChange}
                  className={inputCls}
                  inputMode="numeric"
                  placeholder="00000"
                />
              </Field>
            </div>

            {/* Aceptar términos */}
            <div className="mt-3 flex items-start gap-2">
              <input
                id="acceptTerms"
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={onChange}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <label htmlFor="acceptTerms" className="text-sm text-slate-600">
                <span className="font-medium">* Campo obligatorio:</span> Acepto los{" "}
                <button type="button" className="underline underline-offset-2" onClick={() => setOpenModal("terms")}>
                  Términos y Condiciones
                </button>{" "}
                y{" "}
                <button type="button" className="underline underline-offset-2" onClick={() => setOpenModal("privacy")}>
                  Política de Privacidad
                </button>.
              </label>
            </div>
            {attempted && fieldErrors.acceptTerms && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.acceptTerms}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-white text-sm font-medium shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
            </button>

            <p className="mt-4 text-center text-sm text-slate-600">
              ¿Ya tienes cuenta?{" "}
              <a href="/auth/login" className="font-medium text-slate-900 underline underline-offset-2">
                Inicia sesión
              </a>
            </p>
          </form>
        </div>
      </div>

      {/* Modales separados */}
      <TermsModal open={openModal === "terms"} onClose={() => setOpenModal(null)} />
      <PrivacyModal open={openModal === "privacy"} onClose={() => setOpenModal(null)} />
    </div>
  );
};

export default SignUp;

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500";

const Field = ({ label, error, className = "", children }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
  </div>
);

const Spinner = ({ className = "" }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);
