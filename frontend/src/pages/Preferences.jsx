// src/pages/Preferences.jsx

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import CustomButton from "../components/UI/CustomButton";

const API_URL = import.meta.env.VITE_API_URL;

//Gender-based categories (using exact section_name values)
const CATEGORIES_WOMEN = [
  "Womens Everyday Basics",
  "Womens Lingerie",
  "Womens Nightwear, Socks & Tigh",
  "Womens Small accessories",
  "Womens Big accessories",
  "Womens Swimwear, beachwear",
  "Womens Everyday Collection",
  "Womens Trend",
  "Womens Shoes",
  "Womens Tailoring",
  "Womens Jackets",
  "Womens Casual",
  "Womens Premium",
  "H&M+",
  "Ladies Denim",
  "Ladies H&M Sport",
  "Ladies Other",
];

const CATEGORIES_MEN = [
  "Men Underwear",
  "Men H&M Sport",
  "Mens Outerwear",
  "Men Accessories",
  "Men Suits & Tailoring",
  "Men Shoes",
  "Men Other",
  "Men Other 2",
  "Men Project",
  "Men Edition",
  "Denim Men",
];

const PreferenceQuiz = () => {
  const { user, token, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("gender");
  const [gender, setGender] = useState(null);

  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);

  const [currentQuestion, setCurrentQuestion] = useState(1);
  const TOTAL_QUESTIONS = 10;

  const [currentOptions, setCurrentOptions] = useState([]);
  const [answers, setAnswers] = useState([]);

  const [loading, setLoading] = useState(false);

  // Debug answers realtime
  console.log("ANSWERS (realtime):", answers);

  // Redirect if user is not first-time
  useEffect(() => {
    console.log("Checking first_time:", user?.first_time);

    if (!isLoggedIn) return;
    if (user?.first_time !== "Y") {
      console.warn("User is not first-time → redirect home");
      navigate("/");
    }
  }, [user, isLoggedIn]);

  // Load catalog
  const loadFullCatalog = async () => {
    console.log("Loading full catalog...");
    const res = await fetch(`${API_URL}/catalog?limit=20000`);
    const data = await res.json();

    console.log("🟦 Total items loaded:", (data.items || data || []).length);
    return data.items || data || [];
  };

  // Print ALL real section_name values
  useEffect(() => {
    if (catalog.length > 0) {
      const uniqueSections = [
        ...new Set(catalog.map((item) => item.section_name?.trim()))
      ].sort();

      console.log("REAL SECTIONS FROM CATALOG:");
      uniqueSections.forEach((s) => console.log("   →", s));
    }
  }, [catalog]);

  // Start quiz
  const startQuiz = async (g) => {
    setGender(g);
    setStep("loading");

    console.log("Start quiz with gender:", g);

    let catList = [];
    if (g === "mujer") catList = [...CATEGORIES_WOMEN];
    else if (g === "hombre") catList = [...CATEGORIES_MEN];
    else catList = [...CATEGORIES_WOMEN, ...CATEGORIES_MEN];

    console.log("🟦 Category list before shuffle:", catList);

    const randomized = catList.sort(() => Math.random() - 0.5);
    console.log("🟦 Category list after shuffle:", randomized);

    setCategories(randomized);

    const fullData = await loadFullCatalog();
    setCatalog(fullData);

    setStep("questions");
    loadNextQuestion(fullData, randomized, 1);
  };

  // Match products by category name
  const getProductsForCategory = (catalog, section) => {
    const result = catalog.filter((p) => {
      const sec = p.section_name?.toLowerCase() || "";
      const normalized = section.toLowerCase();
      return sec.includes(normalized);
    });

    console.log(`Matching products for section "${section}" →`, result.length);
    return result;
  };

  // Generate new question pair
  const loadNextQuestion = (catalog, catList, qNum) => {
    setLoading(true);

    console.log("Loading question number:", qNum);

    let section = catList[qNum - 1];
    console.log(`Using section: ${section}`);

    let matches = getProductsForCategory(catalog, section);

    let i = qNum - 1;
    while (matches.length < 2 && i < catList.length - 1) {
      console.warn(`Not enough products for "${section}", skipping...`);
      i++;
      section = catList[i];
      matches = getProductsForCategory(catalog, section);
    }

    if (matches.length < 2) {
      console.error("Still not enough products. Cannot create question.");
      setCurrentOptions([]);
      setLoading(false);
      return;
    }

    const randomTwo = matches.sort(() => Math.random() - 0.5).slice(0, 2);

    console.log("Selected options for question:", randomTwo);

    setCurrentQuestion(i + 1);
    setCurrentOptions(randomTwo);
    setLoading(false);
  };

  // Select option
  const chooseOption = (product) => {
    console.log("Selected product:", product.external_article_id);

    setAnswers((prev) => [...prev, product.external_article_id]);

    if (currentQuestion === TOTAL_QUESTIONS) {
      console.log("FINISHED QUIZ — FINAL ANSWERS:", [...answers, product.external_article_id]);

      // Auto-submit preferences
      submitPreferences([...answers, product.external_article_id]);
      setStep("finished");
      return;
    }

    loadNextQuestion(catalog, categories, currentQuestion + 1);
  };

  // Reload
  const reloadSameQuestion = () => {
    console.log("Reloading same question...");
    loadNextQuestion(catalog, categories, currentQuestion);
  };

  // Submit preferences automatically
  const submitPreferences = async (finalAnswers) => {
    console.log("SUBMITTING FINAL ANSWERS:", finalAnswers);

    try {
      const res = await fetch(
        `${API_URL}/preferences/users/${user.user_id}/prefs/onboarding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ likes: finalAnswers }),
        }
      );

      console.log("POST response:", res.status);

      if (!res.ok) {
        console.error("Error submitting preferences");
        return;
      }

      // Update first_time
      const updatedUser = { ...user, first_time: "N" };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      navigate("/");
    } catch (err) {
      console.error("Submit error:", err);
    }
  };

  // UI
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12">

      <h1 className="text-4xl font-bold font-montserrat tracking-tight mb-8 text-primary-500">
        Cuestionario de Preferencias
      </h1>

      {step === "gender" && (
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-lg text-center">
          <h2 className="text-2xl mb-6 text-dark-500 font-montserrat font-semibold tracking-tight">
            ¿Cuál es tu género?
          </h2>

          <div className="flex flex-col gap-4">
            <CustomButton text="Mujer" onClick={() => startQuiz("mujer")} style="secondary" extraStyles="w-full py-4 text-xl" />

            <CustomButton text="Hombre" onClick={() => startQuiz("hombre")} style="secondary" extraStyles="w-full py-4 text-xl" />

            <CustomButton text="No Binario" onClick={() => startQuiz("nobinario")} style="secondary" extraStyles="w-full py-4 text-xl" />

            <CustomButton text="Prefiero no decirlo" onClick={() => startQuiz("notsay")} style="secondary" extraStyles="w-full py-4 text-xl" />
          </div>
        </div>
      )}

      {step === "loading" && (
        <p className="text-xl text-gray-700 animate-pulse mt-10">
          Cargando catálogo completo...
        </p>
      )}

      {step === "questions" && (
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-5xl text-center">

          <h2 className="text-2xl mb-6 font-montserrat tracking-tight text-primary-500">
            Pregunta {currentQuestion} de {TOTAL_QUESTIONS}
          </h2>

          {loading && (
            <p className="text-lg text-gray-600">Cargando opciones...</p>
          )}

          {!loading && currentOptions.length === 2 && (
            <>
              <div className="flex justify-center gap-14">
                {currentOptions.map((p) => (
                  <div key={p.external_article_id} className="flex flex-col items-center">
                    <img
                      src={p.image_url}
                      alt={p.prod_name}
                      className="w-72 h-96 rounded-xl shadow-lg mb-4 object-cover"
                    />

                    <CustomButton
                      text="Elegir"
                      style="secondary"
                      onClick={() => chooseOption(p)}
                      extraStyles="py-3 px-6 text-lg"
                    />
                  </div>
                ))}
              </div>

              <button
                className="mt-8 text-gray-600 underline hover:text-black"
                onClick={reloadSameQuestion}
              >
                No me gusta ninguno → mostrar otros
              </button>
            </>
          )}
        </div>
      )}

      {step === "finished" && (
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-lg text-center">
          <h2 className="text-3xl font-bold font-montserrat tracking-tight text-primary-500 mb-6">
            ¡Gracias por completar!
          </h2>

          <p className="text-gray-600 text-md">
            Tus preferencias han sido registradas automáticamente.
          </p>
        </div>
      )}
    </div>
  );
};

export default PreferenceQuiz;
