import { useState, useEffect } from "react";
import { Package, Palette, Loader2, ArrowLeft, Star } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import CustomButton from "../components/UI/CustomButton";
import Modal from "../components/UI/Modal";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL;
const MIN_REVIEW_LENGTH = 30;

// Visual agent recommendations
const SimilarProduct = async (productId, k = 4) => {
  try {
    const response = await fetch(`${API_URL}/catalog/visual_agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [productId], k }),
    });
    if (!response.ok) {
      throw new Error("Error fecthing recommendations");
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Recommendation fetch error:", error);
    return [];
  }
};

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

// Ratings list for an article_id
const fetchRatings = async (articleId, limit = 20, offset = 0) => {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const response = await fetch(
      `${API_URL}/ratings/${articleId}?${params.toString()}`
    );
    if (!response.ok) {
      throw new Error("Error fetching ratings");
    }
    return await response.json(); // { items, limit, offset, summary }
  } catch (err) {
    console.error("Ratings fetch error: ", err);
    return { items: [], summary: null };
  }
};

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
  const { productId } = useParams(); // external_article_id
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user, token, isLoggedIn } = useAuth();

  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  // Ratings state
  const [ratings, setRatings] = useState([]);
  const [ratingsSummary, setRatingsSummary] = useState(null);

  // New review form state
  const [newRating, setNewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const availableSizes = ["XS", "S", "M", "L", "XL"];
  const [selectedSize, setSelectedSize] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [productData, recommendationsData, ratingsData] =
          await Promise.all([
            fetchProduct(productId),
            SimilarProduct(productId, 4),
            fetchRatings(productId, 20, 0),
          ]);

        if (!productData) throw new Error("No se pudo cargar el producto.");

        setProduct(productData);
        setRecommendations(recommendationsData);
        setRatings(ratingsData.items || []);
        setRatingsSummary(ratingsData.summary || null);

        setQuantity(1);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el producto.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [productId]);

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

  const formattedPrice = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(product.price);

  const isAvailable = product.stock > 0;
  const stockMessage = isAvailable
    ? `En stock: ${product.stock} unidades`
    : "Agotado";

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

  const renderStars = (value) => {
    if (value === null || value === undefined) return null;
    const rounded = Math.round(value);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Star
            key={idx}
            className={`w-4 h-4 ${
              idx < rounded
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const reloadRatings = async () => {
    const data = await fetchRatings(product.external_article_id, 20, 0);
    setRatings(data.items || []);
    setRatingsSummary(data.summary || null);
  };

  const userId = user?.id ?? user?.user_id;
  const hasUserReview =
    isLoggedIn && userId && ratings.some((r) => r.user_id === userId);

  const handleOpenReviewModal = () => {
    if (!isLoggedIn) {
      navigate("/auth/login");
      return;
    }
    if (hasUserReview) {
      toast.info("Ya has enviado una reseña para este producto.");
      return;
    }
    setReviewError("");
    setIsReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    if (submittingReview) return;
    setReviewError("");
    setIsReviewModalOpen(false);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError("");

    if (!isLoggedIn) {
      navigate("/auth/login");
      return;
    }

    if (!newRating) {
      setReviewError("Selecciona una calificación de 1 a 5 estrellas.");
      return;
    }

    const trimmed = newReviewText.trim();
    if (!trimmed) {
      setReviewError("Escribe un comentario sobre el producto.");
      return;
    }

    if (trimmed.length < MIN_REVIEW_LENGTH) {
      setReviewError(
        `Tu reseña debe tener al menos ${MIN_REVIEW_LENGTH} caracteres.`
      );
      return;
    }

    if (!userId) {
      setReviewError("No se pudo identificar al usuario para enviar la reseña.");
      return;
    }

    if (hasUserReview) {
      setReviewError("Ya has enviado una reseña para este producto.");
      return;
    }

    setSubmittingReview(true);

    try {
      const res = await fetch(`${API_URL}/ratings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: userId,
          article_id: product.external_article_id,
          rating: newRating,
          review_text: trimmed,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo enviar la reseña.");
      }

      toast.success("¡Gracias por tu reseña! 😄");

      await reloadRatings();

      setNewRating(0);
      setNewReviewText("");
      setIsReviewModalOpen(false);
    } catch (err) {
      console.error("Submit rating error: ", err);
      setReviewError(err.message || "No se pudo enviar la reseña.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] pt-10 pb-24 font-['Inter']">
      <div className="max-w-7xl mx-auto px-8">
        {/* Product details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 bg-white rounded-2xl p-10 shadow-lg">
          {/* Image */}
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

          {/* Details */}
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

            {/* Sizes */}
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

            {/* Quantity and add to cart */}
            <div className="mt-4 space-y-4">
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

              <CustomButton
                text={isAvailable ? "Añadir al carrito" : "Agotado"}
                style={"secondary"}
                extraStyles={`w-full md:w-auto cursor-pointer bg-indigo-600 text-center py-4 px-8 text-lg text-white rounded-xl font-bold 
                  hover:bg-indigo-700 hover:shadow-xl transition duration-200 
                  ${
                    !isAvailable
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : ""
                  }`}
                onClick={isAvailable ? handleAddToCart : undefined}
              />
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold text-dark-500 mb-6">
            También te podría interesar
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {recommendations.length === 0 ? (
              <p className="text-gray-500 col-span-4">
                No hay recomendaciones disponibles.
              </p>
            ) : (
              recommendations.map((item) => (
                <RecommendationCard
                  key={item.external_article_id}
                  product={item}
                />
              ))
            )}
          </div>
        </div>

        {/* Reviews section */}
        <div className="mt-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-dark-500">
                Opiniones de otros clientes
              </h2>
              {ratingsSummary && (
                <div className="flex items-center gap-3 mt-2">
                  {renderStars(ratingsSummary.avg_rating)}
                  <span className="text-sm text-dark-400">
                    {ratingsSummary.avg_rating.toFixed(1)} ·{" "}
                    {ratingsSummary.rating_count}{" "}
                    {ratingsSummary.rating_count === 1 ? "reseña" : "reseñas"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-start md:items-end gap-1">
              <CustomButton
                text={
                  hasUserReview
                    ? "Ya enviaste una reseña"
                    : "¡Ayúdanos con tu reseña!"
                }
                style="primary"
                extraStyles={`mt-2 md:mt-0 ${
                  hasUserReview ? "opacity-60 cursor-not-allowed" : ""
                }`}
                onClick={hasUserReview ? undefined : handleOpenReviewModal}
              />
              {hasUserReview && (
                <p className="text-xs text-gray-500">
                  Solo puedes dejar una reseña por producto.
                </p>
              )}
            </div>
          </div>

          {(!ratings || ratings.length === 0) ? (
            <p className="text-gray-500">
              Parece ser que no hay reseñas, ¡sé la primera!
            </p>
          ) : (
            <div className="space-y-4 mb-4">
              {ratings.map((r) => (
                <div
                  key={r.rating_id}
                  className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {renderStars(r.rating)}
                      <span className="text-sm font-medium text-dark-500">
                        {r.rating}/5
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-dark-400">{r.review_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal using shared Modal component */}
      <Modal
        open={isReviewModalOpen}
        onClose={handleCloseReviewModal}
        title="Cuéntanos tu experiencia con este producto"
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Tu calificación
            </p>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, idx) => {
                const value = idx + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNewRating(value)}
                    className="p-1"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        value <= newRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                );
              })}
              <span className="text-xs text-gray-500 ml-1">
                {newRating
                  ? `${newRating}/5 seleccionados`
                  : "Selecciona una calificación"}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Comentario
            </p>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={`Cuéntale a otros qué te pareció este producto (mínimo ${MIN_REVIEW_LENGTH} caracteres)...`}
              value={newReviewText}
              onChange={(e) => setNewReviewText(e.target.value)}
            />
          </div>

          {reviewError && (
            <p className="text-xs text-red-600">{reviewError}</p>
          )}

          <div className="mt-4 flex justify-end">
            <CustomButton
              text={
                submittingReview ? "Enviando reseña..." : "Enviar reseña"
              }
              style="primary"
              type="submit"
              extraStyles={`${
                submittingReview ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductDetail;
