import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { normalizeProduct } from "../utils/normalizer"; // ⬅ UNIVERSAL
import ProductCard from "../components/UI/ProductCard";
import FilterBar from "../components/UI/FilterBar";
import Pagination from "../components/UI/Pagination";
import filtersData from "../Filters.json";

const BASE_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";
const LIMIT = 20;

/* -------------------------------------------------------
   Leer filtros desde URL
------------------------------------------------------- */
const parseFiltersFromURL = (search) => {
  const sp = new URLSearchParams(search);

  return {
    q: sp.get("q") || "",
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

/* -------------------------------------------------------
   Construir query para API
------------------------------------------------------- */
const buildURLFromFilters = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, val]) => {
    if (val === "" || val == null) return;

    if (Array.isArray(val)) {
      if (val.length === 0) return;
      val.forEach((v) => params.append(key, v));
    } else {
      params.set(key, val);
    }
  });

  return params.toString();
};

/* -------------------------------------------------------
    CATALOGO PRINCIPAL
------------------------------------------------------- */
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

  /* -------------------------------------------------------
      Sync URL → filtros
  ------------------------------------------------------- */
  useEffect(() => {
    setFilters(parseFiltersFromURL(location.search));
  }, [location.search]);

  /* -------------------------------------------------------
        Fetch principal
  ------------------------------------------------------- */
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);

      let url = `${BASE_API_URL}/catalog?limit=${LIMIT}&offset=${offset}`;
      const filterQuery = buildURLFromFilters(filters);

      if (filterQuery) {
        url += `&${filterQuery}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      // ⬅ USA NORMALIZADOR UNIVERSAL
      setProducts((data.items || []).map((item, i) => normalizeProduct(item, i)));

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

  /* -------------------------------------------------------
      Regla 1:
      Si se usan FILTROS → se borra q
  ------------------------------------------------------- */
  const removeQIfFiltersApplied = (obj) => {
    const { q, ...others } = obj;

    const hasFilters =
      Object.values({
        product_type: obj.product_type,
        department: obj.department,
        garment_group: obj.garment_group,
        product_group: obj.product_group,
        index_group: obj.index_group,
        section_name: obj.section_name,
        colour: obj.colour,
      }).some((v) => (Array.isArray(v) ? v.length > 0 : v !== ""));

    if (hasFilters) return { ...others, q: "" };

    return obj;
  };

  /* -------------------------------------------------------
      Regla 2:
      Si hay q → limpiar todos los filtros
  ------------------------------------------------------- */
  const clearFiltersIfQ = (obj) => {
    if (!obj.q) return obj;

    return {
      q: obj.q,
      product_type: [],
      department: "",
      garment_group: "",
      product_group: "",
      index_group: "",
      section_name: "",
      colour: "",
      sort: obj.sort || "",
    };
  };

  /* -------------------------------------------------------
      Cambio de filtros (UI FilterBar)
  ------------------------------------------------------- */
  const handleFiltersChange = (newFilters) => {
    let finalFilters = removeQIfFiltersApplied(newFilters);
    finalFilters = clearFiltersIfQ(finalFilters);

    setFilters(finalFilters);

    const params = new URLSearchParams();
    params.set("page", "1");

    const query = buildURLFromFilters(finalFilters);
    if (query) {
      const extra = new URLSearchParams(query);
      for (const [k, v] of extra.entries()) params.append(k, v);
    }

    navigate(`?${params.toString()}`);
  };

  /* -------------------------------------------------------
      Cambio de página
  ------------------------------------------------------- */
  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(location.search);
    params.set("page", newPage);
    navigate(`?${params.toString()}`);
  };

  if (isLoading) return <p className="p-6">Cargando...</p>;

  /* -------------------------------------------------------
      RENDER
  ------------------------------------------------------- */
  return (
    <div className="mt-10">
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

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default Catalog;
