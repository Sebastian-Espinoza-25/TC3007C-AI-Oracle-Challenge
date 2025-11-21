import React, { useState, useMemo, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  DragOverlay,
} from '@dnd-kit/core';

import Navbar from '../components/UI/Navbar';
import SidebarAgent from '../components/UI/SidebarAgent';
import Footer from '../components/UI/Footer';
import ProductCard from '../components/UI/ProductCard';

const API_SUFFIX = '/catalog?limit=20&offset=725';
const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/';
const API_URL = `${BASE_API_URL}${API_SUFFIX}`;

const DefaultLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [droppedProduct, setDroppedProduct] = useState(null);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeId, setActiveId] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error(`HTTP error ${response.status}`);

                const data = await response.json();
                const products = data.items.map((item, index) => {
                    let priceString = String(item.price);
                    let integerPart = priceString.split('.')[0];

                    return {
                        id: item.external_article_id || item.product_code || `fallback-${index}`,
                        external_article_id: item.external_article_id || item.product_code || `fallback-${index}`,
                        name: item.prod_name,
                        price: integerPart,
                        stock: item.stock,
                        image: item.image_url ||
                            `https://placehold.co/400x300/F5F5DC/000000/png?text=${item.prod_name.substring(0, 10).trim()}`
                    };
                });

                setFeaturedProducts(products);
            } catch (error) {
                console.error("Error fetching products:", error);
                setFeaturedProducts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { over, active } = event;

        if (over && over.id === 'sidebar-agent-droppable') {
            const productData = active.data.current;
            setIsSidebarOpen(true);
            setDroppedProduct(productData);
        }

        setActiveId(null);
    };

    const outletContext = useMemo(
        () => ({ isSidebarOpen, setIsSidebarOpen, featuredProducts, isLoading }),
        [isSidebarOpen, featuredProducts, isLoading]
    );

    const activeProduct = useMemo(() => {
        if (!activeId) return null;
        return featuredProducts.find(
            (p) => p.external_article_id === activeId || p.id === activeId
        );
    }, [activeId, featuredProducts]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="min-h-screen flex bg-gray-50 font-inter">

                <SidebarAgent
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    product={droppedProduct}
                    clearProduct={() => setDroppedProduct(null)} // important
                />

                <div className="flex flex-col flex-1">
                    <Navbar
                        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                        isSidebarOpen={isSidebarOpen}
                    />

                    <main
                        className={`flex-grow mt-8 p-4 md:p-8 transition-all duration-300 ease-in-out ${
                            isSidebarOpen ? "md:pr-96" : "pr-0"
                        }`}
                    >
                        <Outlet context={outletContext} />
                    </main>

                    <Footer />
                </div>
            </div>

            <DragOverlay>
                {activeProduct ? (
                    <div style={{ width: '250px' }}>
                        <ProductCard product={activeProduct} isOverlay={true} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default DefaultLayout;
