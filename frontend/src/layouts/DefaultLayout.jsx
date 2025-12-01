import React, { useState, useMemo, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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

import { useAuth } from "../contexts/AuthContext";

const HIDDEN_SIDEBAR_ROUTES = ['/auth/signup', '/auth/login', '/cart'];

const DefaultLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [droppedProduct, setDroppedProduct] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [userPreferences, setUserPreferences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const location = useLocation();
  const { user, isLoggedIn } = useAuth();

  const normalizeProfile = (profileObj) => {
    if (!profileObj || typeof profileObj !== "object") return [];

    return Object.entries(profileObj).flatMap(([category, values]) =>
      Object.entries(values).map(([key, weight]) => ({
        category,
        key,
        weight,
      }))
    );
  };

  const buildFiltersFromPreferences = (normalizedPrefs) => {
    if (!normalizedPrefs.length) return {};

    const grouped = normalizedPrefs.reduce((acc, pref) => {
      if (!acc[pref.category]) acc[pref.category] = [];
      acc[pref.category].push(pref);
      return acc;
    }, {});

    const filters = {};

    Object.entries(grouped).forEach(([category, items]) => {
      const top = items.sort((a, b) => b.weight - a.weight)[0];

      const map = {
        COLOUR: "colour",
        DEPARTMENT: "department",
        GARMENT_GROUP: "garment_group",
        PRODUCT_GROUP: "product_group",
        SECTION: "section_name"
      };

      if (map[category]) filters[map[category]] = top.key;
    });

    return filters;
  };

  /* ----------------------------- FETCH USER PREFS ------------------------------------ */
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!isLoggedIn || !user?.user_id) {
        setUserPreferences([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/preferences/users/${user.user_id}/prefs`
        );

        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const data = await response.json();
        const normalized = normalizeProfile(data.profile);
        setUserPreferences(normalized);

      } catch (error) {
        console.error("Error fetching user preferences:", error);
        setUserPreferences([]);
      }
    };

    fetchUserPreferences();
  }, [isLoggedIn, user]);

  /* ----------------------------- FETCH PRODUCTS ------------------------------------ */
  const fetchProducts = async (filters) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.append(key, val);
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/catalog?${params.toString()}`
      );

      const data = await response.json();

      console.log("DATA FROM BACKEND:", data);

      /** 🔥 AQUI ESTA EL FIX CORRECTO 🔥 **/
      setFeaturedProducts(data.items || []);

    } catch (err) {
      console.error("Error loading recommended products:", err);
      setFeaturedProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  /* ----------------------------- LOAD PRODUCTS WHEN PREFS CHANGE ----------------------------- */
  useEffect(() => {
    if (!userPreferences.length) {
      setFeaturedProducts([]);
      setIsLoading(false);
      return;
    }

    const autoFilters = buildFiltersFromPreferences(userPreferences);
    fetchProducts(autoFilters);

  }, [userPreferences]);

  /* ----------------------------- HIDE SIDEBAR ON SPECIFIC ROUTES ----------------------------- */
  useEffect(() => {
    if (HIDDEN_SIDEBAR_ROUTES.includes(location.pathname)) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

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
    () => ({
      isSidebarOpen,
      setIsSidebarOpen,
      featuredProducts,
      userPreferences,
      isLoading,
    }),
    [isSidebarOpen, featuredProducts, userPreferences, isLoading]
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

        {!HIDDEN_SIDEBAR_ROUTES.includes(location.pathname) && (
          <SidebarAgent
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            product={droppedProduct}
            clearProduct={() => setDroppedProduct(null)}
            userPreferences={userPreferences}
          />
        )}

        <div className="flex flex-col flex-1">
          <Navbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            isSidebarOpen={isSidebarOpen}
            featuredProducts={featuredProducts}
            userPreferences={userPreferences}
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
