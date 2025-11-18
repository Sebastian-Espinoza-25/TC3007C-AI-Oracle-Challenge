import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import TermsModal from "../components/UI/TermsModal";
import PrivacyModal from "../components/UI/PrivacyModal";
import Spinner from "../components/UI/Spinner";
import CustomButton from "../components/UI/CustomButton"; 
import { toast } from "react-toastify";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mxPostalCodeRegex = /^\d{5}$/;
const streetNumberRegex = /^\d+[A-Za-z0-9\-\/]*$/;

const SignUp = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

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
  const [openModal, setOpenModal] = useState(null);
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
    else if (!streetNumberRegex.test(formData.streetNumber)) errs.streetNumber = "Número inválido";

    if (!formData.postalCode.trim()) errs.postalCode = "Campo obligatorio";
    else if (!mxPostalCodeRegex.test(formData.postalCode))
      errs.postalCode = "Código postal inválido (5 dígitos)";

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

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          age: Number(formData.age),
          email: formData.email.trim(),
          password: formData.password,
          street: formData.street.trim(),
          streetNumber: formData.streetNumber.trim(),
          postalCode: formData.postalCode.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error en el servidor");
      }

      //Toast to let the user know the login was successful
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


        {/* Error server*/}
          {serverError && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
          <p className="text-xs text-dark-400 mb-3">* Campos obligatorios</p>

          {/* Name, surname, age */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Nombre *" error={attempted ? fieldErrors.firstName : ""}>
              <input name="firstName" value={formData.firstName} onChange={onChange} className="allure-input" />
              </Field>

              <Field label="Apellido *" error={attempted ? fieldErrors.lastName : ""}>
              <input name="lastName" value={formData.lastName} onChange={onChange} className="allure-input" />
              </Field>

              <Field label="Edad *" error={attempted ? fieldErrors.age : ""}>
              <input name="age" value={formData.age} onChange={onChange} className="allure-input" inputMode="numeric" />
              </Field>
            </div>

          {/* email */}
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

          {/* PASS */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Password */}
              <Field label="Contraseña *" error={attempted ? fieldErrors.password : ""}>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={onChange}
                  className="allure-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-dark-500"
                  >
                  {showPwd ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </Field>

            {/* Confirm */}
              <Field label="Confirmar contraseña *" error={attempted ? fieldErrors.confirmPassword : ""}>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={onChange}
                  className="allure-input pr-10"
                  />
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

            {/* Address */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Calle *" error={attempted ? fieldErrors.street : ""}>
              <input name="street" value={formData.street} onChange={onChange} className="allure-input" />
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

          {/* Terms and conditions */}
            <div className="mt-3 flex items-start gap-2">
              <input
                id="acceptTerms"
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={onChange}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
            <label htmlFor="acceptTerms" className="text-sm text-dark-500">
                <span className="font-medium">* Campo obligatorio:</span> Acepto los{" "}
              <button type="button" className="underline" onClick={() => setOpenModal("terms")}>
                  Términos y Condiciones
                </button>{" "}
                y{" "}
              <button type="button" className="underline" onClick={() => setOpenModal("privacy")}>
                  Política de Privacidad
                </button>.
              </label>
            </div>

            {attempted && fieldErrors.acceptTerms && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.acceptTerms}</p>
            )}

          {/* Register button */}
          <div className="mt-6">
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

      {/* Modals */}
      <TermsModal open={openModal === "terms"} onClose={() => setOpenModal(null)} />
      <PrivacyModal open={openModal === "privacy"} onClose={() => setOpenModal(null)} />
    </div>
  );
};

export default SignUp;

/* FIELD CONTAINER */
const Field = ({ label, error, className = "", children }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-dark-500 mb-1">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);
