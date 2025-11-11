import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import ProductCard from '../components/UI/ProductCard';
import heroBannerImage from '../assets/banner.jpg';

// Endpoint para la API
const API_SUFFIX = '/catalog?limit=20&offset=725';

const Home = () => {
    // Recibimos el estado de la sidebar desde el Outlet
    const { isSidebarOpen } = useOutletContext();

    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // URL base (entorno o localhost)
    const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/';
    const API_URL = `${BASE_API_URL}${API_SUFFIX}`;

// --- Cargar productos ---
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch(API_URL);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                const products = data.items.map((item, index) => {
                    // Convertir el número a string y buscar el punto decimal
                    let priceString = String(item.price);
                    let integerPart = priceString;

                    // Si existe el punto decimal, toma solo la parte entera
                    const decimalIndex = priceString.indexOf('.');
                    if (decimalIndex !== -1) {
                        integerPart = priceString.substring(0, decimalIndex);
                    }

                    return {
                        id: item.external_article_id || item.product_code || `fallback-${index}`,
                        external_article_id: item.external_article_id || item.product_code || `fallback-${index}`,
                        name: item.prod_name,
                        // MODIFICACIÓN: Usar la parte entera de la string del precio
                        price: integerPart, 
                        stock: item.stock,
                        image: item.image_url || 
                                `https://placehold.co/400x300/F5F5DC/000000/png?text=${item.prod_name.substring(0, 10).trim()}`
                    };
                });

                setFeaturedProducts(products);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, [API_URL]);

    // --- Clases dinámicas ---
    const sidebarWidthClass = 'md:mr-96';

    const mainContentClasses = `
        transition-margin duration-300 ease-in-out
        ${isSidebarOpen ? sidebarWidthClass : ''}
    `;

    const productGridClasses = `
        grid grid-cols-1 sm:grid-cols-2 gap-4
        ${isSidebarOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}
    `;

    // --- Estados de carga ---
    if (isLoading) {
        return (
            <div className={mainContentClasses + ' text-center text-2xl mt-20'}>
                <p>Cargando productos...</p>
            </div>
        );
    }

    if (featuredProducts.length === 0 && !isLoading) {
        return (
            <div className={mainContentClasses + ' text-center text-2xl mt-20'}>
                <p>No se encontraron productos.</p>
            </div>
        );
    }

    // --- Render principal ---
    return (
        <div className={mainContentClasses}>
            {/* --- Hero Banner --- */}
            <section className="mb-12 mt-8">
                <div
                    className="relative h-[400px] bg-gray-700 rounded-xl overflow-hidden"
                    style={{ backgroundImage: `url(${heroBannerImage})`, backgroundSize: 'cover' }}
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
                            <button
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                            >
                                Explorar Ahora
                            </button>
                        </a>
                    </div>
                </div>
            </section>

            {/* --- Sección de Productos --- */}
            <section className="mb-16">
                <h2 className="text-center text-4xl font-extrabold mb-8">
                    ¡Conoce nuestros nuevos productos!
                </h2>

                <div className={productGridClasses}>
                    {featuredProducts.map((product) => (
                        <ProductCard
                        key={product.id}
                        product={product}
                        />
                    ))}
                </div>
            </section>

            {/* --- Banner de Asistente de IA --- */}
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
