import React from "react";

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const MAX_BUTTONS = 11;
  const pages = [];

  let start = Math.max(1, page - Math.floor(MAX_BUTTONS / 2));
  let end = start + MAX_BUTTONS - 1;

  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - MAX_BUTTONS + 1);
  }

  // Agregar páginas en orden, sin duplicados
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex gap-2 justify-center mt-8">

      {/* Prev */}
      <button
        key="prev"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 bg-gray-200 rounded disabled:bg-gray-300"
      >
        Prev
      </button>

      {/* Números */}
      {pages.map((num) => (
        <button
          key={`page-${num}`}   // ← ← ← CLAVE: key único SIEMPRE
          onClick={() => onPageChange(num)}
          className={`px-3 py-2 rounded ${
            num === page ? "bg-red-600 text-white" : "bg-gray-200"
          }`}
        >
          {num}
        </button>
      ))}

      {/* Next */}
      <button
        key="next"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-2 bg-gray-200 rounded disabled:bg-gray-300"
      >
        Next
      </button>

    </div>
  );
};

export default Pagination;
