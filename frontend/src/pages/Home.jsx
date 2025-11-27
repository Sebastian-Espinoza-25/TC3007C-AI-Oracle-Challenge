import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import ProductCard from "../components/UI/ProductCard";
import heroBannerImage from "../assets/banner.jpg";
import { useCart } from "../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import Loader from "../components/UI/Loader";

const Home = () => {
  const {
    isSidebarOpen,
    featuredProducts,
    isLoading,
  } = useOutletContext();

  const { addItem } = useCart();
  const navigate = useNavigate();

  // Track per-product loading with a Set to avoid race conditions and allow O(1) lookups
  const [loadingProducts, setLoadingProducts] = useState(new Set());

  // Keep sidebar width in a constant so layout changes are centralized and easy to tweak
  const sidebarWidthClass = "md:mr-96";

  // Build main content classes based on sidebar state so the grid shifts without duplicating markup
  const mainContentClasses = `
        w-full transition-all duration-300 ease-in-out
        ${isSidebarOpen ? sidebarWidthClass : ""}
    `;

  // Force 4 columns on large screens in both states so the number of cards stays stable when the sidebar opens
  const productGridClasses = `
        grid grid-cols-1 sm:grid-cols-2 gap-4
        ${isSidebarOpen ? "lg:grid-cols-4" : "lg:grid-cols-4"}
    `;

  if (isLoading) {
    return (
      <div className="text-center mt-20">
        <Loader message="Estamos preparando algo asombroso..." />
      </div>
    );
  }

  if (featuredProducts.length === 0 && !isLoading) {
    return (
      <div className={"text-center text-2xl mt-20"}>
        <p>No se encontraron productos.</p>
      </div>
    );
  }

  const handleAddToCart = async (product) => {
    const id = product.id;

    // Avoid double-clicking the same product while a previous add-to-cart request is still pending
    if (loadingProducts.has(id)) return;

    // Clone the Set before mutating to keep React state updates predictable
    setLoadingProducts((prev) => new Set(prev).add(id));

    try {
      await addItem({
        productId: id,
        qty: 1,
        // Delay redirect so the user has time to read the toast or any feedback shown
        onUnauthenticated: () =>
          setTimeout(() => navigate("/auth/login"), 5000),
      });
    } finally {
      // Remove the product from the loading Set using a fresh Set instance to trigger a re-render
      setLoadingProducts((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  return (
    <div className={mainContentClasses}>
      {/* Use a big hero banner to set the main visual tone of the homepage */}
      <section className="mb-12 mt-8">
        <div
          className="relative h-[400px] bg-gray-700 rounded-xl overflow-hidden"
          style={{ backgroundImage: `url(${heroBannerImage})`, backgroundSize: "cover" }}
        >
          <div className="absolute inset-0 bg-black opacity-40"></div>
          <div className="absolute bottom-1/4 left-8 text-white max-w-xl p-4">
            <h1 className="text-5xl font-extrabold mb-3">
              Encuentra Tu Estilo Perfecto
            </h1>
            <p className="text-lg mb-6">
              Descubre las últimas tendencias y clásicos atemporales.
            </p>
            <a href="/shop">
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200">
                Explorar Ahora
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Highlight featured products to give users a starting point without needing to filter */}
      <section className="mb-16">
        <h2 className="text-center text-4xl font-extrabold mb-8">
          ¡Conoce nuestros nuevos productos!
        </h2>

        <div className={productGridClasses}>
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={() => handleAddToCart(product)}
              isLoading={loadingProducts.has(product.id)}
            />
          ))}
        </div>
      </section>

      {/* Use a dedicated banner to tease the AI assistant without mixing it into the main product grid */}
      <section className="mb-8">
        <div className="bg-indigo-900 text-white p-16 rounded-xl text-center shadow-2xl">
          <h2 className="text-4xl font-extrabold mb-6">
            ¿No sabes qué ponerte?
          </h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Usa nuestro asistente de IA avanzado. Sube una foto, describe tu necesidad o incluso envía una
            nota de voz, y obtén recomendaciones personalizadas al instante.
          </p>
          <button
            onClick={() => console.log("Toggle Sidebar here")}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-lg text-xl transition-colors duration-200"
          >
            Probar Asistente Avanzado
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;
