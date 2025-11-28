import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

const BASE_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";

// ITEM DE SUGERENCIA
const SuggestionItem = ({ product, isActive, onSelect }) => {
  const id = product.external_article_id || product.id;

  return (
    <Link
      to={`/detail/${id}`}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer
        ${isActive ? "bg-gray-100" : "bg-white"} hover:bg-gray-100`}
      onClick={onSelect}
    >
      <img
        src={product.image_url}
        alt={product.prod_name}
        className="w-12 h-12 object-cover rounded"
      />

      <div className="flex flex-col">
        <span className="text-gray-900 text-sm font-medium">
          {product.prod_name}
        </span>

        {product.price && (
          <span className="text-gray-500 text-sm font-semibold">
            ${product.price}
          </span>
        )}
      </div>
    </Link>
  );
};

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const controllerRef = useRef(null);
  const debounceRef = useRef(null);

  // --- DEBOUNCE ---
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Limpia debounce previo
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // --- FETCH SUGERENCIAS ---
  const fetchSuggestions = async (value) => {
    try {
      setLoading(true);

      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = new AbortController();

      const url = `${BASE_API_URL}/catalog?q=${encodeURIComponent(
        value
      )}&limit=5`;

      const res = await fetch(url, {
        signal: controllerRef.current.signal,
      });

      const data = await res.json();

      setSuggestions(data.items || []);
      setActiveIndex(-1);
      setShowSuggestions(true);
    } catch (err) {
      if (err.name !== "AbortError") console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- SUBMIT ---
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!query.trim()) return;

    // Cerrar antes de navegar
    setShowSuggestions(false);
    setSuggestions([]);
    setActiveIndex(-1);

    navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
  };

  // --- TECLADO ---
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      setActiveIndex((prev) =>
        Math.min(prev + 1, suggestions.length - 1)
      );
      return;
    }

    if (e.key === "ArrowUp") {
      setActiveIndex((prev) => Math.max(prev - 1, -1));
      return;
    }

    if (e.key === "Enter") {
      // 1) Cancela debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // 2) Cancela fetch
      if (controllerRef.current) controllerRef.current.abort();

      // 3) Limpia UI inmediatamente
      setShowSuggestions(false);
      setSuggestions([]);

      // 4) Si hay sugerencia activa, ve al detail
      if (activeIndex >= 0) {
        const item = suggestions[activeIndex];
        const id = item.external_article_id || item.id;
        navigate(`/detail/${id}`);
        return;
      }

      // 5) Si no, búsqueda normal
      handleSubmit(e);
    }
  };

  return (
    <div className="relative w-full max-w-lg hidden sm:block">
      {/* INPUT */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center bg-terciary-400 rounded-full px-4 py-2"
      >
        <input
          type="text"
          placeholder="Busca y elige tu siguiente artículo..."
          className="bg-transparent text-gray-800 w-full outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setShowSuggestions(true)}
        />
      </form>

      {/* SUGERENCIAS */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bg-white w-full mt-1 rounded shadow-md z-50 max-h-72 overflow-auto">
          {suggestions.map((product, idx) => (
            <SuggestionItem
              key={product.id}
              product={product}
              isActive={idx === activeIndex}
              onSelect={() => {
                setShowSuggestions(false);
                setSuggestions([]);
                setActiveIndex(-1);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
