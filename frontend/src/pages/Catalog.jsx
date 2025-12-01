import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProductCard from "../components/UI/ProductCard";
import FilterBar from "../components/UI/FilterBar";
import Pagination from "../components/UI/Pagination";
import filtersData from "../Filters.json";

const BASE_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";
const LIMIT = 20;

const normalizeProducts = (items = []) =>
  items.map((item, index) => {
    const priceString = String(item.price ?? "");
    const integerPart = priceString.split(".")[0] || "0";

    const fallbackId =
      item.external_article_id ||
      item.product_code ||
      `${item.prod_name || "prod"}-${index}`;

    const hasValidImage =
      item.image_url &&
      item.image_url !== "undefined" &&
      item.image_url !== "";

    return {
      id: fallbackId,
      external_article_id: fallbackId,
      name: item.prod_name || item.title || `Producto ${index + 1}`,
      price: integerPart,
      stock: item.stock ?? 0,
      color: item.perceived_colour_master_name || "N/A",
      image: hasValidImage
        ? item.image_url
        : `https://placehold.co/500x750?text=${encodeURIComponent(
            (item.prod_name || "Producto").substring(0, 16)
          )}`,
    };
  });

const parseFiltersFromURL = (search) => {
  const sp = new URLSearchParams(search);

  return {
    product_type: sp.getAll("product_type"),
    department: sp.get("department") || "",
    garment_group: sp.get("garment_group") || "",
    product_group: sp.get("product_group") || "",
    index_group: sp.get("index_group") || "",
    section_name: sp.get("section_name") || "",
    colour: sp.get("colour") || "",
    sort: sp.get("sort") || "",
  };
};

const buildURLFromFilters = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, val]) => {
    if (!val || val.length === 0) return;

    if (Array.isArray(val)) val.forEach((v) => params.append(key, v));
    else params.set(key, val);
  });

  return params.toString();
};

const Catalog = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const page = Number(searchParams.get("page")) || 1;
  const offset = (page - 1) * LIMIT;

  const [filters, setFilters] = useState(() =>
    parseFiltersFromURL(location.search)
  );

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setFilters(parseFiltersFromURL(location.search));
  }, [location.search]);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);

      let url = `${BASE_API_URL}/catalog?limit=${LIMIT}&offset=${offset}`;
      const filterQuery = buildURLFromFilters(filters);
      if (filterQuery) url += `&${filterQuery}`;

      const res = await fetch(url);
      const data = await res.json();

      setProducts(normalizeProducts(data.items || []));

      const totalItems = Number(data.total) || (data.items?.length || 0);
      setTotalPages(Math.max(1, Math.ceil(totalItems / LIMIT)));
    } catch (err) {
      console.error(err);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ------------------------------------------
     Cambio de filtros → ACTUALIZA URL
  ------------------------------------------ */
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);

    const params = new URLSearchParams();
    params.set("page", "1");

    const filterQuery = buildURLFromFilters(newFilters);
    if (filterQuery) {
      const extra = new URLSearchParams(filterQuery);
      for (const [k, v] of extra.entries()) params.append(k, v);
    }

    navigate(`?${params.toString()}`);
  };

  /* ------------------------------------------
     Cambio de página → ACTUALIZA URL
  ------------------------------------------ */
  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(location.search);
    params.set("page", newPage);
    navigate(`?${params.toString()}`);
  };

  if (isLoading) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6">
      <FilterBar
        productTypes={filtersData.product_types}
        departments={filtersData.departments}
        garmentGroups={filtersData.garment_groups}
        productGroups={filtersData.product_groups}
        indexGroups={filtersData.index_groups}
        sections={filtersData.sections}
        colours={filtersData.colours}
        sortOptions={[
          { value: "price_asc", label: "Precio: Menor a Mayor" },
          { value: "price_desc", label: "Precio: Mayor a Menor" },
        ]}
        filters={filters}
        onChangeFilters={handleFiltersChange}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-gray-500 mt-6">No se encontraron coincidencias.</p>
      )}

      {/* PAGINACIÓN EXTERNA */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default Catalog;
