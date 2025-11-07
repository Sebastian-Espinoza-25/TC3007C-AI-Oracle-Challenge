import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, DollarSign, Loader2, ArrowLeft, Star, Palette, MessageCircle } from 'lucide-react';

// --- MOCK API DATA ---
// Updated mock data to include the new 'perceived_colour_master_name' field
const MOCK_PRODUCT_DATA = {
    detail_desc: "Pointelle-knit tights in a soft cotton blend with an elasticated waist.",
    external_article_id: "0291338014",
    has_image: true,
    image_key: "products/029/0291338014.jpg",
    image_url: "https://objectstorage.us-chicago-1.oraclecloud.com/p/nQOV56WhiHtkMSI6xi_J0tENT_ybIaT0gCtLVSX2tAZ1RR9Nq1CoyGXpAmiusJQY/n/ax9g9kpob79x/b/Oracle-Catalog-Images/o/products/029/0291338014.jpg",
    perceived_colour_master_name: "Blue", // NEW FIELD
    price: 830.91,
    prod_name: "2-p Pelin pointelle",
    product_code: "291338",
    stock: 64
};

// Mock data for visualization (Reviews and Recommendations)
const MOCK_VISUALIZATION_DATA = {
    reviewSummary: {
        averageRating: 4.5,
        totalReviews: 200,
        ratings: [
            { star: 5, count: 80, percentage: 40 },
            { star: 4, count: 60, percentage: 30 },
            { star: 3, count: 30, percentage: 15 },
            { star: 2, count: 20, percentage: 10 },
            { star: 1, count: 10, percentage: 5 }
        ],
    },
    recommendations: [
        { name: "Red Cocktail Dress", price: 120, image: "https://placehold.co/100x120/fecaca/991b1b?text=Red" },
        { name: "Black Evening Gown", price: 150, image: "https://placehold.co/100x120/1f2937/d1d5db?text=Black" },
        { name: "Blue Party Dress", price: 110, image: "https://placehold.co/100x120/bfdbfe/1d4ed8?text=Blue" }
    ]
};


// Simulated function to fetch product data
const fetchProduct = async (productId) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(MOCK_PRODUCT_DATA);
        }, 800); // Shorter delay for better user experience
    });
};

// Component to render a single recommendation card
const RecommendationCard = ({ name, price, image }) => (
    <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer">
        <img src={image} alt={name} className="w-full h-32 object-cover rounded mb-2" />
        <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
        <p className="text-xs text-indigo-600 font-bold">${price.toFixed(2)}</p>
    </div>
);

// Component to render the star rating bars
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


const ProductDetail = () => {
    // State to hold product data, loading status, errors, and cart message
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cartMessage, setCartMessage] = useState(null); // For custom message box
    
    const productId = '12345'; // Mock ID

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
    const stockMessage = isAvailable ? 
        `In stock: ${product.stock} units` : 
        'Out of Stock';

    const handleAddToCart = () => {
        console.log(`Added ${product.prod_name} to cart!`);
        setCartMessage('Item added to cart successfully!');
        setTimeout(() => setCartMessage(null), 3000); // Clear message after 3 seconds
    };

    const reviews = MOCK_VISUALIZATION_DATA.reviewSummary;
    const recommendations = MOCK_VISUALIZATION_DATA.recommendations;

    return (
        <div className="min-h-screen bg-gray-50 py-8 font-['Inter']">
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
                                <DollarSign className="w-6 h-6 text-indigo-600 mr-2" />
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
                            
                            {/* Action Button */}
                            <button
                                onClick={handleAddToCart}
                                disabled={!isAvailable}
                                className={`w-full md:w-auto flex items-center justify-center px-8 py-4 text-lg font-bold rounded-xl transition duration-300 shadow-lg transform active:scale-95
                                    ${isAvailable 
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl' 
                                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                    }`}
                            >
                                <ShoppingCart className="w-6 h-6 mr-3" />
                                {isAvailable ? 'Add to Cart' : 'View Alternatives'}
                            </button>

                        </div>

                    </div>
                </div>

                {/* 3. Customer Reviews Section (Data Visualization) */}
                <div className="mt-10 bg-white rounded-xl shadow-2xl p-6 md:p-12">
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                        <MessageCircle className="w-6 h-6 mr-3 text-indigo-600" /> Customer Reviews
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b pb-6 mb-6">
                        {/* Rating Summary */}
                        <div className="col-span-1 flex flex-col items-center justify-center border-r md:border-r-gray-200">
                            <p className="text-7xl font-bold text-gray-900 leading-none">{reviews.averageRating}</p>
                            <div className="flex mt-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`w-5 h-5 ${i < Math.floor(reviews.averageRating) ? 'fill-yellow-400 text-yellow-400' : (i === Math.floor(reviews.averageRating) && reviews.averageRating % 1 !== 0 ? 'fill-yellow-200 text-yellow-200' : 'text-gray-300')}`}
                                    />
                                ))}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">{reviews.totalReviews} total reviews</p>
                        </div>

                        {/* Rating Distribution (Bar Chart Visualization) */}
                        <div className="col-span-2 space-y-2">
                            {reviews.ratings.map((item) => (
                                <StarRatingBar 
                                    key={item.star} 
                                    star={item.star} 
                                    percentage={item.percentage} 
                                />
                            ))}
                        </div>
                    </div>

                    {/* AI Agent Recommendations Section */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">
                        AI Agent Recommendations
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Based on your interest in **{product.perceived_colour_master_name}** clothing, our agent suggests these items:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {recommendations.map((item, index) => (
                            <RecommendationCard key={index} {...item} />
                        ))}
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