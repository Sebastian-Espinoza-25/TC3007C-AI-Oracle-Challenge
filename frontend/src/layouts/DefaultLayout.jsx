import React, { useState, useMemo, useEffect, useRef } from 'react';
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
const CACHE_TTL_MS = 5 * 60 * 1000;

const DefaultLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [droppedProduct, setDroppedProduct] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [userPreferences, setUserPreferences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const location = useLocation();
  const { user, isLoggedIn } = useAuth();

  // Cache references
  const cacheRef = useRef({});
  const lastFiltersKeyRef = useRef(null);

  /* -------------------------------------------------------------------------- */
  /* PRODUCT NORMALIZATION                                                     */
  /* -------------------------------------------------------------------------- */
  const normalizeProduct = (item) => ({
    id: item.external_article_id || item.id,
    rawId: item.id,
    external_article_id: item.external_article_id || null,

    name: item.name || item.product_name || "Sin nombre",
    description: item.description || "",
    price: item.price || item.currentPrice || 0,

    image: item.image || item.prodImage || item.thumbnail || (item.images?.[0] ?? ""),
    images: item.images || [],

    productType: item.productType || null,
    garmentGroup: item.garment_group || item.garmentGroup || null,
    department: item.department || null,
    productGroup: item.product_group || null,
    section: item.section_name || item.section || null,
    colour: item.colour || item.color || null,

    product_url: item.product_url || null,
    ...item,
  });

  /* -------------------------------------------------------------------------- */
  /* PROFILE NORMALIZATION                                                     */
  /* -------------------------------------------------------------------------- */
  const normalizeProfile = (p) => {
    if (!p || typeof p !== "object") return [];
    return Object.entries(p).flatMap(([category, values]) =>
      Object.entries(values).map(([key, weight]) => ({
        category, key, weight
      }))
    );
  };

  const buildFiltersFromPreferences = (prefs) => {
    if (!prefs.length) return {};
    const grouped = prefs.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {});

    const filters = {};
    const map = {
      COLOUR: "colour",
      DEPARTMENT: "department",
      GARMENT_GROUP: "garment_group",
      PRODUCT_GROUP: "product_group",
      SECTION: "section_name",
    };

    Object.entries(grouped).forEach(([category, items]) => {
      const top = items.sort((a, b) => b.weight - a.weight)[0];
      if (map[category]) filters[map[category]] = top.key;
    });

    return filters;
  };

  /* -------------------------------------------------------------------------- */
  /* FETCH USER PREFERENCES                                                    */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!isLoggedIn || !user?.user_id) {
        setUserPreferences([]);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/preferences/users/${user.user_id}/prefs`
        );

        if (!res.ok) throw new Error(res.status);

        const data = await res.json();
        const normalized = normalizeProfile(data.profile);
        setUserPreferences(normalized);
      } catch (err) {
        console.error("Error loading preferences:", err);
        setUserPreferences([]);
      }
    };

    fetchUserPreferences();
  }, [isLoggedIn, user]);

  /* -------------------------------------------------------------------------- */
  /* FETCH PRODUCTS WITH CACHE                                                 */
  /* -------------------------------------------------------------------------- */
  const fetchProducts = async (filters) => {
    try {
      setIsLoading(true);

      // Normalize and sort filters
      const norm = {};
      Object.keys(filters || {})
        .sort()
        .forEach((k) => {
          const v = filters[k];
          if (v !== "" && v !== undefined && v !== null) norm[k] = v;
        });

      const filtersKey = JSON.stringify(norm);

      // Same key hit and cache valid
      const cached = cacheRef.current[filtersKey];
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setFeaturedProducts(cached.items);
        lastFiltersKeyRef.current = filtersKey;
        setIsLoading(false);
        return;
      }

      // Build query
      const params = new URLSearchParams();
      Object.entries(norm).forEach(([k, v]) => params.append(k, v));

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/catalog?${params.toString()}`
      );

      const data = await res.json();

      const normalizedItems = (data.items || []).map(normalizeProduct);

      // Save to cache
      cacheRef.current[filtersKey] = {
        items: normalizedItems,
        total: data.total || 0,
        ts: Date.now(),
      };

      setFeaturedProducts(normalizedItems);
      lastFiltersKeyRef.current = filtersKey;
    } catch (err) {
      console.error("Error loading products:", err);
      setFeaturedProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* TRIGGER PRODUCT FETCH WHEN PREFERENCES CHANGE                              */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!userPreferences.length) {
      setFeaturedProducts([]);
      setIsLoading(false);
      return;
    }
    const autoFilters = buildFiltersFromPreferences(userPreferences);
    fetchProducts(autoFilters);
  }, [userPreferences]);

  /* -------------------------------------------------------------------------- */
  /* AUTO-HIDE SIDEBAR IN SPECIFIC ROUTES                                      */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (HIDDEN_SIDEBAR_ROUTES.includes(location.pathname)) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  /* -------------------------------------------------------------------------- */
  /* DND: DRAG & DROP                                                           */
  /* -------------------------------------------------------------------------- */

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event) => {
    // Save active id so DragOverlay knows what to show
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { over, active } = event;

    // Dropped inside the sidebar zone
    if (over && over.id === 'sidebar-agent-droppable') {
      const wrapped = active.data.current;

      // Extract product from draggable wrapper
      const product = wrapped?.product || wrapped;

      setDroppedProduct(product);
      setIsSidebarOpen(true);
    }

    // Clear active drag
    setActiveId(null);
  };

  /* -------------------------------------------------------------------------- */
  /* FIND ACTIVE PRODUCT FOR THE DRAG OVERLAY                                   */
  /* -------------------------------------------------------------------------- */
  const activeProduct = useMemo(() => {
    if (!activeId) return null;
    return featuredProducts.find(
      (p) => p.external_article_id === activeId || p.id === activeId
    );
  }, [activeId, featuredProducts]);

  /* -------------------------------------------------------------------------- */
  /* OUTLET CONTEXT                                                             */
  /* -------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------- */
  /* RENDER                                                                      */
  /* -------------------------------------------------------------------------- */
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

      {/* Drag Overlay clone */}
      <DragOverlay>
        {activeProduct ? (
          <div style={{ width: '250px' }}>
            <ProductCard
              product={activeProduct}
              isOverlay={true}
              draggable={false} // disable internal drag events
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DefaultLayout;
