// In /src/pages/Home.jsx
import React from 'react';
import ProductCard from '../components/UI/ProductCard'; 
import heroBannerImage from '../assets/banner.jpg'; 

/**
 * Helper function to generate product data with a simple placeholder image URL.
 */
const generateProducts = (count = 4) => {
    return Array.from({ length: count }, (_, index) => {
        const basePrice = 89 + (index * 10);
        const nameOptions = ['Blazer Clásico Crema', 'Camisa de Lino Azul', 'Reloj Minimalista', 'Bolso de Cuero'];
        const stockOptions = [3, 10, 1, 4];
        
        return {
            name: nameOptions[index % nameOptions.length],
            price: `$${basePrice}`,
            stock: stockOptions[index % stockOptions.length],
            // FIX: Using placehold.co, which is extremely stable.
            // Format: 
            image: `https://placehold.co/300x250/F5F5DC/000000/png?text=Product+${index + 1}`,
        };
    });
};


const Home = ({ isSidebarOpen = false }) => {
    
    const sidebarWidthClass = 'md:mr-96'; 
    
    const mainContentClasses = `
        transition-margin duration-300 ease-in-out p-4
        ${isSidebarOpen ? sidebarWidthClass : ''}
    `;

    // DATA INTEGRATION: Now using the generation function
    const featuredProducts = generateProducts(4); 
    
    // DYNAMIC LOGIC: Switches from 4 columns to 3 columns on large screens (lg) when sidebar is open.
    const productGridClasses = `
        grid grid-cols-1 sm:grid-cols-2 gap-4
        ${isSidebarOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}
    `;

    return (
        <div className={mainContentClasses}> 
            
            {/* --- Hero Banner Section --- */}
            <section className='mb-12'>
                <div 
                    className='relative h-[400px] bg-gray-700 rounded-xl overflow-hidden'
                    style={{ backgroundImage: `url(${heroBannerImage})`, backgroundSize: 'cover' }}
                >
                    <div className='absolute inset-0 bg-black opacity-40'></div> 
                    
                    <div className='absolute bottom-1/4 left-8 text-white max-w-xl p-4'>
                        <h1 className='text-5xl font-extrabold mb-3'>
                            Encuentra Tu Estilo Perfecto
                        </h1>
                        <p className='text-lg mb-6'>
                            Descubre las últimas tendencias y clásicos atemporales.
                        </p>
                        
                        <a href="/shop">
                            <button
                                className='bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200'
                            >
                                Explorar Ahora
                            </button>
                        </a>
                    </div>
                </div>
            </section>

            {/* --- Offers Section --- */}
            <section className='mb-16'>
                <h2 className='text-center text-4xl font-extrabold mb-8'>
                    ¡Conoce nuestros nuevos productos!
                </h2>
                
                {/* Product Grid */}
                <div className={productGridClasses}>
                    {featuredProducts.map((product, index) => (
                        <ProductCard
                            key={index}
                            name={product.name}
                            price={product.price}
                            stock={product.stock}
                            image={product.image}
                        />
                    ))}
                </div>
            </section>
            
            {/* --- New Agent Banner Section --- */}
            <section className='mb-8'>
                <div className='bg-indigo-900 text-white p-16 rounded-xl text-center shadow-2xl'>
                    <h2 className='text-4xl font-extrabold mb-6'>
                        ¿No sabes qué ponerte?
                    </h2>
                    <p className='text-lg mb-8 max-w-2xl mx-auto'>
                        Usa nuestro asistente de IA avanzado. Sube una foto, describe tu necesidad o incluso envía una 
                        nota de voz, y obtén recomendaciones personalizadas al instante.
                    </p>
                    
                    <button
                        onClick={() => console.log("Toggle Sidebar here")} 
                        className='bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-lg text-xl transition-colors duration-200'
                    >
                        Probar Asistente Avanzado
                    </button>
                </div>
            </section>
            
            <section></section>
        </div>
    );
};

export default Home;