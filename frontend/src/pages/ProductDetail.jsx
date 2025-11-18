import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Loader2, ArrowLeft, /*Star*/ Palette, MessageCircle } from 'lucide-react';
import {useParams} from 'react-router-dom';
import {useCart} from '../contexts/CartContext';
import CustomButton from '../components/UI/CustomButton';
import { useNavigate } from 'react-router-dom';

// Simulated function to fetch product data
const API_URL = import.meta.env.VITE_API_URL;

const fetchProduct = async (productId) => {
    try{
        const response= await fetch(`${API_URL}/catalog/${productId}`);
        if(!response.ok) throw new Error("Error fetching product");
        return await response.json();
    } catch (err){
        console.error("Fetch error: ", err);
        return null;
    }
};

// Component to render a single recommendation card
const RecommendationCard = ({ name, price, image }) => (
    <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer">
        <img src={image} alt={name} className="w-full h-32 object-cover rounded mb-2" />
        <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
        <p className="text-xs text-indigo-600 font-bold">${price.toFixed(2)}</p>
    </div>
);

/*
Component to render the star rating bars
const StarRatingBar = ({ star, percentage }) => (
   <div className="flex items-center text-sm">
     <span className="w-8 text-gray-600">{star} <Star className="w-3 h-3 inline fill-yellow-400 text-yellow-400" /></span>
    <div className="flex-1 mx-2 h-2 bg-gray-200 rounded-full">
         <div 
               className="h-2 bg-indigo-500 rounded-full transition-all duration-500" 
               style={{ width: `${percentage}%` }}
            ></div>
        </div>
        <span className="w-10 text-right text-gray-600 font-medium">{percentage}%</span>
    </div>
); 
*/


const ProductDetail = () => {
    // State to hold product data, loading status, errors, and cart message
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cartMessage, setCartMessage] = useState(null); // For custom message box
    const [quantity, setQuantity] = useState(1);
    
    const {productId} = useParams();
    const {addItem} = useCart();
    const navigate = useNavigate();

    useEffect(() => {
        const loadProduct = async () => {
            setIsLoading(true);
            try {
                const data = await fetchProduct(productId);
                if (data) {
                    setProduct(data);
                    setError(null);
                } else {
                    setError("Product not found.");
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Failed to load product details.");
            } finally {
                setIsLoading(false);
            }
        };

        loadProduct();
    }, [productId]); 

    // --- Loading State Renderer ---
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="ml-3 text-lg font-medium text-gray-700">Loading Product...</p>
            </div>
        );
    }

    // --- Error State Renderer ---
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6">
                <p className="text-xl font-semibold text-red-700 mb-4">Error</p>
                <p className="text-lg text-red-600 mb-6">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center px-4 py-2 bg-red-500 text-white font-medium rounded-lg shadow-md hover:bg-red-600 transition duration-150"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" /> Go Back
                </button>
            </div>
        );
    }
    
    if (!product) {
        return (
            <div className="text-center p-8 text-gray-500">
                Product data is unavailable.
            </div>
        );
    }

    // Format price for display
    const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(product.price);

    const isAvailable = product.stock > 0;
    const stockMessage = isAvailable 
        ? `In stock: ${product.stock} units` 
        : 'Out of Stock';

    const handleDecrease = () => {
        setQuantity((prev) => Math.max(1, prev - 1)); // mínimo 1
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
            qty: quantity, // Use selected quantity
            onUnauthenticated: () => {
                setTimeout(() => navigate("/auth/login"), 3000);
            },
        });
    };

    //const reviews = MOCK_VISUALIZATION_DATA.reviewSummary;
    //const recomendations = MOCK_VISUALIZATION_DATA.recommendations;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center font-['Inter']">

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Main Product Detail Section */}
                <div className="bg-white rounded-xl shadow-2xl p-6 md:p-12 mb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
                        
                        {/* 1. Image Gallery (Left Column) */}
                        <div className="md:col-span-1 flex justify-center items-start">
                            <div className="w-full max-w-md bg-gray-100 rounded-lg overflow-hidden shadow-inner aspect-square">
                                <img 
                                    src={product.image_url} 
                                    alt={product.prod_name} 
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                    // Fallback for image loading error
                                    onError={(e) => {
                                        e.target.onerror = null; 
                                        e.target.src = "https://placehold.co/600x600/e5e7eb/374151?text=Image+Unavailable";
                                        e.target.alt = "Image unavailable placeholder";
                                    }}
                                />
                            </div>
                        </div>

                        {/* 2. Product Details (Right Column) */}
                        <div className="md:col-span-1">
                            {/* Title and Price */}
                            <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
                                {product.prod_name}
                            </h1>
                            <div className="flex items-center mb-6 border-b pb-4">
                                <span className="text-3xl font-bold text-indigo-700">
                                    {formattedPrice}
                                </span>
                            </div>

                            {/* Description */}
                            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
                                Description
                            </h2>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                {product.detail_desc}
                            </p>

                            {/* Stock, Code, and Color */}
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center text-sm font-medium">
                                    <Palette className="w-5 h-5 text-gray-500 mr-2" />
                                    <span className="text-gray-900">Color:</span>
                                    <span className="ml-2 text-indigo-600 font-semibold">{product.perceived_colour_master_name}</span>
                                </div>
                                <div className="flex items-center text-sm font-medium">
                                    <Package className="w-5 h-5 text-gray-500 mr-2" />
                                    <span className="text-gray-900">SKU:</span>
                                    <span className="ml-2 text-gray-600">{product.product_code}</span>
                                </div>
                                <div className="flex items-center text-lg font-semibold">
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${
                                        isAvailable 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {stockMessage}
                                    </span>
                                </div>
                            </div>
                            

                            {/* Action Button + Quantity Selector */}
                            <div className="mt-8 space-y-4">
                            {/* Quantity selector */}
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-700">Cantidad:</span>
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
                                        Max: {product.stock}
                                    </span>
                                )}
                            </div>

                            {/* Add to Cart Button */}
                            <CustomButton
                                text={isAvailable ? 'Añadir al carrito' : 'Out of Stock'}
                                style={'normal'}
                                extraStyles={`w-full md:w-auto cursor-pointer bg-indigo-600 text-center py-4 px-8 text-lg text-white rounded-xl font-bold 
                                    hover:bg-indigo-700 hover:shadow-xl transition duration-200 
                                    ${!isAvailable ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : ''}`}
                                onClick={isAvailable ? handleAddToCart : undefined}
                            />
                            </div>
                        </div>
                    </div>
                </div>              
            </div>

            {/* Cart Confirmation Message (Non-alert replacement) */}
            {cartMessage && (
                <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-xl shadow-xl transition duration-300 z-50 animate-bounce-in">
                    {cartMessage}
                </div>
            )}
            
            {/* Simple CSS for the confirmation animation */}
            <style jsx="true">{`
                @keyframes bounce-in {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default ProductDetail;