import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SearchBar = ({ products = [] }) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!query.trim()) return;

    // Redirige al catálogo con la query
    navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-lg hidden sm:flex items-center bg-terciary-400 rounded-full px-4 py-2"
    >
      <input
        type="text"
        placeholder="Busca y elige tu siguiente artículo..."
        className="bg-transparent text-gray-800 w-full outline-none"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </form>
  );
};

export default SearchBar;
