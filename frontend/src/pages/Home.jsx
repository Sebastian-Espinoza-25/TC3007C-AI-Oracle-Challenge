import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ProductCard from '../components/UI/ProductCard';
import heroBannerImage from '../assets/banner.jpg';
import {useCart} from '../contexts/CartContext';
import { useNavigate } from "react-router-dom";
import Loader from '../components/UI/Loader';

const Home = () => {
    const { 
        isSidebarOpen, 
        featuredProducts,
        isLoading
    } = useOutletContext();

    const {addItem}= useCart();
    const navigate = useNavigate();

    const [loadingProducts, setLoadingProducts] = React.useState(new Set());

    // Clases dinámicas para aplicar el margen a la derecha (96 unidades)
    const sidebarWidthClass = 'md:mr-96';

    const mainContentClasses = `
        w-full transition-all duration-300 ease-in-out
        ${isSidebarOpen ? sidebarWidthClass : ''}
    `;

    // CORRECCIÓN DEL GRID: Se mantiene lg:grid-cols-4 en ambos estados
    // para forzar la reducción de las tarjetas cuando se aplica el margen.
    const productGridClasses = `
        grid grid-cols-1 sm:grid-cols-2 gap-4
        ${isSidebarOpen ? 'lg:grid-cols-4' : 'lg:grid-cols-4'} // <-- Ambas a 4
    `;

    // --- Estados de carga ---
    if (isLoading) {
        return (
            <div className="text-center mt-20">
                <Loader message="Estamos preparando algo asombroso..." />
            </div>
        );
    }

    if (featuredProducts.length === 0 && !isLoading) {
        return (
            <div className={'text-center text-2xl mt-20'}>
                <p>No se encontraron productos.</p>
            </div>
        );
    }

    const handleAddToCart = async (product) => {
        const id = product.id;

        // Evitar doble clic
        if (loadingProducts.has(id)) return;

        // Añadir a la lista de loading
        setLoadingProducts(prev => new Set(prev).add(id));

        try {
            await addItem({
                productId: id,
                qty: 1,
                onUnauthenticated: () =>
                    setTimeout(() => navigate("/auth/login"), 5000),
            });
        } finally {
            // Remover del loading
            setLoadingProducts(prev => {
                const updated = new Set(prev);
                updated.delete(id);
                return updated;
            });
        }
    };

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
                            onAddToCart={() => handleAddToCart(product)}
                            isLoading={loadingProducts.has(product.id)}
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