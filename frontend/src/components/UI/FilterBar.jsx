import React from "react";

const FilterBar = ({
    productTypes = [],
    departments = [],
    garmentGroups = [],
    indexGroups = [],
    productGroups = [],
    sections = [],
    colours = [],
    sortOptions = [],
    filters,
    onChangeFilters
}) => {

    const handleChange = (key, value) => {
        const updated = { ...filters, [key]: value };

        // Eliminar filtros vacíos
        Object.keys(updated).forEach(k => {
            if (
                updated[k] === "" ||
                updated[k] === null ||
                (Array.isArray(updated[k]) && updated[k].length === 0)
            ) {
                delete updated[k];
            }
        });

        onChangeFilters(updated);
    };

    return (
        <div className="w-full bg-white shadow-sm rounded-md p-4 flex flex-wrap gap-4 items-center">

            {/* Product Type (SELECT normal) */}
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">
                    Tipo de Producto
                </label>

                <select
                    value={
                        Array.isArray(filters.product_type)
                            ? filters.product_type[0] || ""
                            : filters.product_type || ""
                    }
                    onChange={(e) => handleChange("product_type", e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    <option value="">Todos</option>
                    {productTypes.map((pt) => (
                        <option key={pt} value={pt}>
                            {pt}
                        </option>
                    ))}
                </select>
            </div>

            {/* Department */}
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Departamento</label>
                <select
                    value={filters.department || ""}
                    onChange={(e) => handleChange("department", e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    <option value="">Todos</option>
                    {departments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
            </div>

            {/* Garment Group */}
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Grupo de Prenda</label>
                <select
                    value={filters.garment_group || ""}
                    onChange={(e) => handleChange("garment_group", e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    <option value="">Todos</option>
                    {garmentGroups.map((g) => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>
            </div>

            {/* Product Group */}
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Grupo de Producto</label>
                <select
                    value={filters.product_group || ""}
                    onChange={(e) => handleChange("product_group", e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    <option value="">Todos</option>
                    {productGroups.map((pg) => (
                        <option key={pg} value={pg}>{pg}</option>
                    ))}
                </select>
            </div>

            {/* Index Group */}
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Grupo</label>
                <select
                    value={filters.index_group || ""}
                    onChange={(e) => handleChange("index_group", e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    <option value="">Todos</option>
                    {indexGroups.map((ig) => (
                        <option key={ig} value={ig}>{ig}</option>
                    ))}
                </select>
            </div>

            {/* Section */}
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Sección</label>
                <select
                    value={filters.section_name || ""}
                    onChange={(e) => handleChange("section_name", e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    <option value="">Todas</option>
                    {sections.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            {/* Colour */}
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Color</label>
                <select
                    value={filters.colour || ""}
                    onChange={(e) => handleChange("colour", e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    <option value="">Todos</option>
                    {colours.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* Sort */}
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Ordenar por</label>
                <select
                    value={filters.sort || ""}
                    onChange={(e) => handleChange("sort", e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    {sortOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

        </div>
    );
};

export default FilterBar;
