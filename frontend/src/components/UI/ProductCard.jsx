import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CustomButton from './CustomButton';
import imagen from '../../assets/react.svg';

const ProductCard = ({ product, onAddToCart, isOverlay, isLoading }) => {
  // Validamos datos por seguridad
  if (!product) return null;

  // Hook de Draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: product.external_article_id || product.id || 'producto-sin-id',
    data: product,
  });

  // Estilos dinámicos de arrastre
  const style = {
    transform: CSS.Translate.toString(transform),
    // CORRECCIÓN: Si isOverlay es true (estamos en DragOverlay), no aplicar opacidad, zIndex o transform.
    // Si NO es el Overlay y estamos arrastrando, ocultar ligeramente el original (opacity: 0.2)
    opacity: isDragging && !isOverlay ? 0.2 : 1, // <--- AJUSTE CLAVE
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: isOverlay ? 'grabbing' : 'grab',
    // Si estamos arrastrando, el overlay manejará el zIndex, no el elemento original.
    zIndex: isDragging && !isOverlay ? 1 : 'auto', 
    boxShadow: isDragging && !isOverlay
      ? '0 10px 20px rgba(0, 0, 0, 0.0)' // Quitamos la sombra del original arrastrado
      : '0 4px 6px rgba(0, 0, 0, 0.1)',
  };

  // Datos visuales procesados
  const name = product.prod_name || product.name || 'Producto sin nombre';
  const price = product.price || product.retail_price || 99;
  // ... (resto de variables)
  const stock = product.stock || 3;
  const image = product.image_url || product.image || imagen;

  const numericPrice = parseFloat(price) || 0;
  const displayPrice = `$${Math.round(numericPrice)}`;
  const displayName = name.startsWith('&') ? name.substring(1).trim() : name;

  const isInStock = stock > 0;
  const stockMessage = isInStock ? `¡Sólo ${stock} en stock!` : 'Sin stock';
  const buttonText = isInStock ? 'Agregar al carrito' : 'Notificarme';

  // Render del componente
  return (
    <div
      ref={setNodeRef}
      // Solo aplicamos listeners/attributes al elemento original, no al overlay
      {...(!isOverlay ? listeners : {})} 
      {...(!isOverlay ? attributes : {})}
      style={style}
      className={`w-full rounded-xl overflow-hidden bg-white shadow-lg transition-all duration-200 
                  ${!isOverlay ? 'hover:shadow-xl' : 'shadow-none'}`}
    >
      {/* Si es el overlay, renderizar una versión simplificada, o la misma pero sin listeners */}
      <div className="relative h-[350px] overflow-hidden">
        <div className={`absolute top-0 right-0 text-white text-xl font-bold py-2 px-6 rounded-bl-xl z-10 ${isOverlay ? 'bg-indigo-600' : 'bg-red-600'}`}>
          {displayPrice}
        </div>
        <img
          src={image}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-6 text-left">
        <a
          href={`/detail/${product.external_article_id || product.id}`}
          className="block cursor-pointer hover:underline text-gray-900"
        >
          <h3
            className="font-bold text-xl mb-3 overflow-hidden whitespace-nowrap"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
              maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
            }}
          >
            {displayName}
          </h3>
        </a>

        {isInStock && (
          <div className={`inline-block text-white font-bold px-3 py-2 mb-4 rounded-full text-md ${isOverlay ? 'bg-gray-500' : 'bg-red-600'}`}>
            {stockMessage}
          </div>
        )}

        <div className="mt-2">
          {/* El botón no debe ser funcional en el DragOverlay */}
          <CustomButton
              text={isLoading ? "Procesando..." : buttonText}
              disabled={isLoading}
              style={'normal'}
              extraStyles={`
                  w-full text-center py-4 text-xl text-white rounded-lg transition duration-200 
                  ${
                      (!isInStock || isOverlay || isLoading)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-dark-500 hover:opacity-90 cursor-pointer'
                  }
              `}
              onClick={!isOverlay && !isLoading && isInStock ? onAddToCart : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;