import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ProductCard from "../components/UI/ProductCard";

const BASE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/";
const API_SUFFIX = "/catalog?limit=20&offset=0";
const API_URL = `${BASE_API_URL}${API_SUFFIX}`;

const normalizeProducts = (items) =>
  items.map((item, index) => {
    let priceString = String(item.price);
    let integerPart = priceString.split(".")[0];

    return {
      id: item.external_article_id || item.product_code || `fallback-${index}`,
      external_article_id:
        item.external_article_id || item.product_code || `fallback-${index}`,
      name: item.prod_name,
      price: integerPart,
      stock: item.stock,
      color: item.perceived_colour_master_name || "N/A",
      image:
        item.image_url ||
        `https://placehold.co/400x300/F5F5DC/000000/png?text=${item.prod_name
          .substring(0, 10)
          .trim()}`,
    };
  });

const Catalog = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const q = searchParams.get("q") || "";

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);

        const url = q
          ? `${API_URL}&q=${encodeURIComponent(q)}`
          : API_URL;

        const response = await fetch(url);
        const data = await response.json();

        setProducts(normalizeProducts(data.items || []));
      } catch (error) {
        console.error("Error en catalog fetch", error);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [q]);

  if (isLoading) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">
        Resultados para: "{q}" — {products.length} encontrados
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-gray-500 mt-6">No se encontraron coincidencias.</p>
      )}
    </div>
  );
};

export default Catalog;
