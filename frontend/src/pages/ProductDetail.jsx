import React, { useState, useEffect } from "react";
import { Package, Palette, Loader2, ArrowLeft } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import CustomButton from "../components/UI/CustomButton";

const API_URL = import.meta.env.VITE_API_URL;

// Reccomendation grid
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

// Card with product specification
const ProductDetail = () => {
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const { productId } = useParams();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const available_size= ["XS", "S", "M", "L", "XL"];
  const [selectedSize, setSelectedSize]= useState();

  // Fetch product + recommendations
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const res = await fetch(`${API_URL}/catalog/${productId}`);
        if (!res.ok) throw new Error("Error al cargar producto");
        const data = await res.json();
        setProduct(data);

        const recRes = await fetch(`${API_URL}/catalog?limit=50`);
        const recJson = await recRes.json();

        if (recJson?.items) {
          const shuffled = recJson.items.sort(() => Math.random() - 0.5);
          const filtered = shuffled
            .filter((p) => p.external_article_id !== productId)
            .slice(0, 4);
          setRecommendations(filtered);
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

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="ml-3 text-lg font-medium text-dark-400">
          Cargando producto…
        </p>
      </div>
    );

  if (error)
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

  if (!product) return null;

  const formattedPrice = `$${product.price.toFixed(2)}`;
  const inStock = product.stock > 0;

  return (
    <div className="min-h-screen bg-[#F7F7F7] pt-10 pb-24 font-['Inter']">

      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 bg-white rounded-2xl p-10 shadow-lg">

          {/*Image*/}
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

          {/*Details of the product*/}
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

            <div className="space-y-4 mb-10">

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
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  inStock
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {inStock
                  ? `En stock: ${product.stock} unidades`
                  : "Agotado"}
              </span>
            </div>

            {/*Mock size*/}
            <div className="mb-8">
              <p className="text-dark-500 font-medium mb-2">Selecciona tu talla</p>

              <div className="flex gap-3 flex-wrap">
                {available_size.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`
                      px-4 py-2 rounded-xl border text-sm font-semibold transition
                      ${selectedSize === size 
                        ? "bg-primary-500 text-white border-primary-500 shadow-md"
                        : "bg-white text-dark-500 border-gray-300 hover:border-primary-400 hover:text-primary-500"
                      }
                    `}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {selectedSize === null && (
                <p className="text-xs text-red-500 mt-2">
                  Por favor selecciona tu talla.
                </p>
              )}
            </div>

            <CustomButton
              text="Añadir al carrito"
              style= {'secondary'}
              onClick={() =>
                addItem({
                  productId: product.external_article_id,
                  qty: 1,
                  onUnauthenticated: () => navigate("/auth/login"),
                })
              }
            />
          </div>
        </div>

        {/*Recommendations */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold text-dark-500 mb-6">
            También te podría interesar
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {recommendations.map((item) => (
              <RecommendationCard key={item.external_article_id} product={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
