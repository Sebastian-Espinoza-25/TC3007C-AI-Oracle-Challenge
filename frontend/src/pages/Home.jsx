import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import ProductCard from "../components/UI/ProductCard";
import heroBannerImage from "../assets/banner.jpg";
import { useCart } from "../contexts/CartContext";
import Loader from "../components/UI/Loader";
import Pagination from "../components/UI/Pagination";
import { normalizeProduct } from "../utils/normalizer";

const LIMIT = 20;

const Home = () => {
  const {
    isSidebarOpen,
    userPreferences,
    isLoading: loadingPreferences,
  } = useOutletContext();

  const { addItem } = useCart();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Detectar si está logueado
  const isLoggedIn = !!localStorage.getItem("token");

  const sidebarWidthClass = "md:mr-96";
  const mainContentClasses = `
        w-full transition-all duration-300 ease-in-out
        ${isSidebarOpen ? sidebarWidthClass : ""}
    `;
  const productGridClasses = `
        grid grid-cols-1 sm:grid-cols-2 gap-4
        ${isSidebarOpen ? "lg:grid-cols-4" : "lg:grid-cols-4"}
    `;

  /* ------------------------------------------------------
     FETCH de productos con paginación
  ------------------------------------------------------ */
  const fetchPageProducts = async () => {
    setIsLoading(true);

    const params = new URLSearchParams({
      limit: LIMIT,
      offset: (page - 1) * LIMIT,
    });

    // Si está logueado y tiene preferencias → usar filtros
    const hasPreferences =
      isLoggedIn && Array.isArray(userPreferences) && userPreferences.length > 0;

    if (hasPreferences) {
      const filters = userPreferences.reduce((acc, pref) => {
        const map = {
          COLOUR: "colour",
          DEPARTMENT: "department",
          GARMENT_GROUP: "garment_group",
          PRODUCT_GROUP: "product_group",
          SECTION: "section_name",
        };
        if (map[pref.category]) {
          acc[map[pref.category]] = pref.key;
        }
        return acc;
      }, {});

      Object.entries(filters).forEach(([k, v]) => {
        params.append(k, v);
      });
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/catalog?${params.toString()}`
      );

      const data = await response.json();

      // AQUÍ aplicamos la normalización universal
      const normalized = (data.items || []).map((item, i) =>
        normalizeProduct(item, i)
      );

      setProducts(normalized);
      setTotalPages(Math.ceil((data.total || 1) / LIMIT));
    } catch (error) {
      console.error("Error fetching paginated products:", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------
     Cuando cambian preferencias → Reiniciar a página 1
  ------------------------------------------------------ */
  useEffect(() => {
    if (!isLoggedIn) return;
    if (userPreferences.length) {
      setPage(1);
      fetchPageProducts();
    }
  }, [userPreferences]);

  /* ------------------------------------------------------
     Cuando cambia la página → recargar
  ------------------------------------------------------ */
  useEffect(() => {
    fetchPageProducts();
  }, [page]);

  /* ------------------------------------------------------
     Agregar al carrito
  ------------------------------------------------------ */
  const handleAddToCart = async (product) => {
    const id = product.id;

    if (loadingProducts.has(id)) return;

    setLoadingProducts((prev) => new Set(prev).add(id));

    try {
      await addItem({
        productId: id,
        qty: 1,
        onUnauthenticated: () =>
          setTimeout(() => navigate("/auth/login"), 5000),
      });
    } finally {
      setLoadingProducts((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  const handleTryAssistant = () => {
    if (!isLoggedIn) {
      navigate("/auth/login");
      return;
    }

    navigate("/atelier");
  };

  /* ------------------------------------------------------
     UI Render
  ------------------------------------------------------ */

  if (loadingPreferences || isLoading) {
    return (
      <div className="text-center mt-20">
        <Loader message="Estamos preparando algo asombroso..." />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={"text-center text-2xl mt-20"}>
        <p>No se encontraron productos.</p>
      </div>
    );
  }

  return (
    <div className={mainContentClasses}>
      {/* Banner principal */}
      <section className="mb-12 mt-10">
        <div
          className="relative h-[400px] bg-gray-700 rounded-xl overflow-hidden"
          style={{
            backgroundImage: `url(${heroBannerImage})`,
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-black opacity-40"></div>
          <div className="absolute bottom-1/4 left-8 text-white max-w-xl p-4">
            <h1 className="text-5xl font-extrabold mb-3">
              Encuentra Tu Estilo Perfecto
            </h1>
            <p className="text-lg mb-6">
              Descubre las últimas tendencias y clásicos atemporales.
            </p>
            <a href="/catalog">
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200">
                Explorar Ahora
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Banner IA */}
      <section className="mb-8">
        <div className="bg-indigo-900 text-white p-16 rounded-xl text-center shadow-2xl">
          <h2 className="text-4xl font-extrabold mb-6">
            ¿No sabes qué ponerte?
          </h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Usa nuestro asistente de IA avanzado. Sube una foto, describe tu
            necesidad o incluso envía una nota de voz, y obtén recomendaciones
            personalizadas al instante.
          </p>
          <button
            onClick={handleTryAssistant}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-lg text-xl transition-colors duration-200"
          >
            Probar Asistente Avanzado
          </button>
        </div>
      </section>

      {/* Productos */}
      <section className="mb-16">
        <h2 className="text-center text-4xl font-extrabold mb-8">
          Tus productos preferidos
        </h2>

        <div className={productGridClasses}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={() => handleAddToCart(product)}
              isLoading={loadingProducts.has(product.id)}
            />
          ))}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
};

export default Home;
