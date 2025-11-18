import React, { useState, useEffect } from "react";
import { Package, Palette, Loader2, ArrowLeft } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import CustomButton from "../components/UI/CustomButton";

const API_URL = import.meta.env.VITE_API_URL;

const fetchProduct = async (productId) => {
  try {
    const response = await fetch(`${API_URL}/catalog/${productId}`);
    if (!response.ok) throw new Error("Error fetching product");
    return await response.json();
  } catch (err) {
    console.error("Fetch error: ", err);
    return null;
  }
};

// Recommendation card
const RecommendationCard = ({ product }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/detail/${product.external_article_id}`)}
      className="bg-white p-5 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition cursor-pointer"
    >
      <div className="w-full h-52 bg-gray-100 rounded-lg overflow-hidden mb-3">
        <img
          src={product.image_url}
          alt={product.prod_name}
          className="object-cover w-full h-full"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://placehold.co/300x300/e5e7eb/6b7280?text=Sin+Imagen";
          }}
        />
      </div>

      <p className="text-base font-semibold text-dark-500 truncate">
        {product.prod_name}
      </p>

      <p className="text-sm text-primary-500 font-bold">
        ${product.price?.toFixed(2)}
      </p>
    </div>
  );
};

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const availableSizes = ["XS", "S", "M", "L", "XL"];
  const [selectedSize, setSelectedSize] = useState(null);

  // Fetch product + recommendations
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Producto principal
        const data = await fetchProduct(productId);
        if (!data) throw new Error("No se pudo cargar el producto.");
        setProduct(data);

        // Poner cantidad en 1 al cambiar de producto
        setQuantity(1);

        // Recomendaciones
        const recRes = await fetch(`${API_URL}/catalog?limit=50`);
        if (recRes.ok) {
          const recJson = await recRes.json();
          if (recJson?.items) {
            const shuffled = recJson.items.sort(() => Math.random() - 0.5);
            const filtered = shuffled
              .filter((p) => p.external_article_id !== productId)
              .slice(0, 4);

            setRecommendations(filtered);
          }
        }
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el producto.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [productId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="ml-3 text-lg font-medium text-dark-400">
          Cargando producto…
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6">
        <p className="text-xl font-bold text-red-700 mb-2">Error</p>
        <p className="text-lg text-red-600 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Regresar
        </button>
      </div>
    );
  }

  if (!product) return null;

  // Formato de precio y stock
  const formattedPrice = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(product.price);

  const isAvailable = product.stock > 0;
  const stockMessage = isAvailable
    ? `En stock: ${product.stock} unidades`
    : "Agotado";

  // Handlers cantidad
  const handleDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrease = () => {
    if (!isAvailable) return;
    setQuantity((prev) => {
      if (product.stock) {
        return Math.min(product.stock, prev + 1);
      }
      return prev + 1;
    });
  };

  const handleAddToCart = () => {
    if (!isAvailable) return;

    addItem({
      productId: product.external_article_id,
      qty: quantity,
      onUnauthenticated: () => {
        setTimeout(() => navigate("/auth/login"), 3000);
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] pt-10 pb-24 font-['Inter']">
      <div className="max-w-7xl mx-auto px-8">
        {/* Sección principal de detalle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 bg-white rounded-2xl p-10 shadow-lg">
          {/* Imagen */}
          <div className="flex justify-center">
            <div className="w-full max-w-xl bg-gray-100 rounded-xl overflow-hidden shadow-inner">
              <img
                src={product.image_url}
                alt={product.prod_name}
                className="w-full h-full object-contain p-6"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://placehold.co/600x600/e5e7eb/6b7280?text=Sin+Imagen";
                }}
              />
            </div>
          </div>

          {/* Detalles */}
          <div className="flex flex-col justify-start">
            <h1 className="text-4xl font-bold text-dark-500 mb-4 leading-tight">
              {product.prod_name}
            </h1>

            <p className="text-3xl font-semibold text-primary-500 mb-6">
              {formattedPrice}
            </p>

            <p className="text-dark-400 leading-relaxed mb-6">
              {product.detail_desc}
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center text-dark-500">
                <Palette className="w-5 h-5 text-gray-500 mr-2" />
                <span className="font-medium">Color:</span>
                <span className="ml-2 text-primary-500">
                  {product.perceived_colour_master_name}
                </span>
              </div>

              <div className="flex items-center text-dark-500">
                <Package className="w-5 h-5 text-gray-500 mr-2" />
                <span className="font-medium">SKU:</span>
                <span className="ml-2">{product.product_code}</span>
              </div>

              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  isAvailable
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {stockMessage}
              </span>
            </div>

            {/* Tallas mock */}
            <div className="mb-8">
              <p className="text-dark-500 font-medium mb-2">
                Selecciona tu talla
              </p>

              <div className="flex gap-3 flex-wrap">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`
                      px-4 py-2 rounded-xl border text-sm font-semibold transition
                      ${
                        selectedSize === size
                          ? "bg-primary-500 text-white border-primary-500 shadow-md"
                          : "bg-white text-dark-500 border-gray-300 hover:border-primary-400 hover:text-primary-500"
                      }
                    `}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {!selectedSize && (
                <p className="text-xs text-gray-400 mt-2">
                  (Opcional) Selecciona una talla.
                </p>
              )}
            </div>

            {/* Cantidad + botón */}
            <div className="mt-4 space-y-4">
              {/* Selector de cantidad */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  Cantidad:
                </span>
                <div className="inline-flex items-center rounded-full border border-gray-300 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={handleDecrease}
                    className="px-3 py-1 text-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                    disabled={quantity <= 1 || !isAvailable}
                  >
                    −
                  </button>
                  <span className="px-4 py-1 text-base font-semibold text-gray-900 min-w-[2.5rem] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrease}
                    className="px-3 py-1 text-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                    disabled={!isAvailable || quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
                {isAvailable && (
                  <span className="text-xs text-gray-500">
                    Máx: {product.stock}
                  </span>
                )}
              </div>

              {/* Botón añadir al carrito */}
              <CustomButton
                text={isAvailable ? "Añadir al carrito" : "Agotado"}
                style={"normal"}
                extraStyles={`w-full md:w-auto cursor-pointer bg-indigo-600 text-center py-4 px-8 text-lg text-white rounded-xl font-bold 
                  hover:bg-indigo-700 hover:shadow-xl transition duration-200 
                  ${!isAvailable ? "bg-gray-300 text-gray-600 cursor-not-allowed" : ""}`}
                onClick={isAvailable ? handleAddToCart : undefined}
              />
            </div>
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold text-dark-500 mb-6">
            También te podría interesar
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {recommendations.map((item) => (
              <RecommendationCard
                key={item.external_article_id}
                product={item}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
