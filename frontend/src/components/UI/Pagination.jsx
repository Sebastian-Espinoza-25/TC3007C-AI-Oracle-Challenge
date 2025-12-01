import React from "react";

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const MAX_BUTTONS = 11;

  const getPageNumbers = () => {
    let pages = [];

    if (totalPages <= MAX_BUTTONS) {
      // Caso 1: Total de páginas menor o igual a 11 → Mostrar todas
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Caso 2: Muchas páginas → Crear ventana de 11
    const windowSize = 7; // botones centrales alrededor de la página
    let start = Math.max(2, page - Math.floor(windowSize / 2));
    let end = Math.min(totalPages - 1, start + windowSize - 1);

    // Ajustar si se rompe el límite
    if (end - start < windowSize - 1) {
      start = Math.max(2, end - (windowSize - 1));
    }

    // Agregar primera página
    pages.push(1);

    // Agregar "..." al inicio si aplica
    if (start > 2) {
      pages.push("...");
    }

    // Agregar ventana dinámica
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Agregar "..." al final si aplica
    if (end < totalPages - 1) {
      pages.push("...");
    }

    // Agregar última página
    pages.push(totalPages);

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex justify-center mt-8 gap-2 flex-wrap">
      {/* Prev */}
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="px-3 py-1 border rounded disabled:opacity-40"
      >
        «
      </button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={i} className="px-3 py-1">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 border rounded ${
              p === page ? "bg-black text-white" : ""
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="px-3 py-1 border rounded disabled:opacity-40"
      >
        »
      </button>
    </div>
  );
};

export default Pagination;
