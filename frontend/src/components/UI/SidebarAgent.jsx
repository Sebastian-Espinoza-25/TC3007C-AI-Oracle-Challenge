import { useEffect, useState } from 'react';
import { FiX, FiRefreshCcw, FiTarget, FiShoppingCart } from 'react-icons/fi';
import { useDroppable } from '@dnd-kit/core';
import { useCart } from '../../contexts/CartContext';
import CustomButton from './CustomButton';
import Loader from '../../components/UI/Loader';
import { useNavigate } from 'react-router-dom';

// Modal that shows recommendations returned by the agent
const RecommendationsModal = ({ isOpen, onClose, items, addItem }) => {
    if (!isOpen || !items || items.length === 0) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[999]">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-11/12">

                <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                    Recomendaciones para ti
                </h2>

                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {items.map((item) => (
                        <div
                            key={item.external_article_id}
                            className="border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:bg-violet-50 transition shadow-sm"
                        >
                            <img
                                src={item.image_url || `https://placehold.co/80x80/F5F5DC/000000?text=${item.prod_name.substring(0, 6)}`}
                                alt={item.prod_name}
                                className="w-20 h-20 object-cover rounded-lg mr-4 flex-shrink-0"
                            />

                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-800">{item.prod_name}</h3>
                                <p className="text-sm text-gray-600">
                                    Color: {item.perceived_colour_master_name || 'N/A'}
                                </p>
                                <p className="text-violet-700 font-bold mt-1">
                                    ${Number(item.price).toFixed(2)}
                                </p>
                            </div>

                            <CustomButton
                                text={<FiShoppingCart size={20} />}
                                onClick={() =>
                                    addItem({
                                        productId: item.external_article_id,
                                        qty: 1,
                                    })
                                }
                                className="!p-3 ml-4 rounded-full"
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={onClose}
                        className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

const SidebarAgent = ({ isOpen, onClose, product, clearProduct }) => {
    const { isOver, setNodeRef } = useDroppable({ id: 'sidebar-agent-droppable' });
    const navigate = useNavigate();
    const { addItem } = useCart();

    const [recommendations, setRecommendations] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

    const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/';
    const ENDPOINT = `${BASE_API_URL}/catalog/visual_agent`;

    // Fetch recommendations when a new product arrives
    // This effect is triggered ONLY when a product is dropped
    useEffect(() => {
        const handleProductDrop = async () => {
            if (!product || !product.id) return;

            try {
                setIsLoadingRecommendations(true);

                const response = await fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ids: [product.id],
                        k: 5,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                setRecommendations(data.items || []);
                setIsModalOpen(true); // open modal on success
            } catch (error) {
                console.error('Error obteniendo recomendaciones:', error);
            } finally {
                setIsLoadingRecommendations(false);
            }
        };

        handleProductDrop();
    }, [product, ENDPOINT]);

    if (!isOpen) return null;

    const dropZoneStyles = isOver
        ? 'border-violet-500 shadow-xl scale-[1.02] bg-violet-100/70'
        : 'border-violet-300 bg-violet-50/50';

    const iconColor = isOver ? 'text-violet-100' : 'text-white';
    const bgColor = isOver ? 'bg-violet-600' : 'bg-violet-500';

    return (
        <>
            {isLoadingRecommendations && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[998]">
                    <Loader
                        message="Buscando recomendaciones mágicas"
                        textColor="#FFFFFF"
                    />
                </div>
            )}

            <div
                className={`fixed top-0 right-0 w-full md:w-96 h-screen bg-white shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out transform ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h1 className="text-xl font-semibold text-gray-800">
                        Asistente de Producto
                    </h1>

                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <div className="flex-grow p-4 overflow-y-auto bg-gray-50 flex flex-col items-center justify-center">
                    <div
                        ref={setNodeRef}
                        className={`text-gray-500 p-6 rounded-xl border-4 border-dashed w-11/12 max-w-sm transition-all duration-300 ${dropZoneStyles}`}
                    >
                        {product ? (
                            <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-48 object-cover rounded-xl mb-4 shadow-sm"
                                />

                                <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">
                                    {product.name}
                                </h2>

                                <p className="text-lg font-semibold text-violet-700 mb-2">
                                    ${Number(product.price).toFixed(2)}
                                </p>

                                <div className="flex items-center justify-between mt-3">
                                    <span className={`text-sm font-medium ${
                                        product.stock > 0 ? "text-green-600" : "text-red-600"
                                    }`}>
                                        {product.stock > 0 ? `Disponibles: ${product.stock}` : "Sin stock"}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div
                                    className={`mx-auto w-20 h-20 ${bgColor} rounded-full flex items-center justify-center mb-6 shadow-xl transition-all duration-300`}
                                >
                                    {isOver ? (
                                        <FiTarget size={36} className={iconColor} />
                                    ) : (
                                        <FiRefreshCcw size={36} className={`${iconColor} transform rotate-45`} />
                                    )}
                                </div>
                                <h2 className="text-xl font-extrabold text-violet-800 tracking-wide">
                                    {isOver ? '¡Suelta el producto ahora!' : 'Arrastra y suelta un producto aquí'}
                                </h2>
                                <p className="text-sm text-gray-600 mt-2">
                                    Analizaré el producto y te daré recomendaciones.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <RecommendationsModal
                isOpen={isModalOpen}
                items={recommendations}
                onClose={() => {
                    // When modal closes: reset both modal and product
                    setIsModalOpen(false);
                    clearProduct(); // reset sidebar drop
                }}
                addItem={(params) =>
                    addItem({
                        ...params,
                        onUnauthenticated: () => {
                            setIsModalOpen(false);
                            clearProduct();
                            onClose();
                            setTimeout(() => navigate("/auth/login"), 3000);
                        },
                    })
                }
            />
        </>
    );
};

export default SidebarAgent;