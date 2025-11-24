import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CustomButton from './CustomButton';
import imagen from '../../assets/react.svg';

const ProductCard = ({ product, onAddToCart, isOverlay, isLoading }) => {
  // Guard clause to avoid rendering when product is missing or undefined
  if (!product) return null;

  // Make the card draggable and attach product data so the drop target can read it
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: product.external_article_id || product.id || 'producto-sin-id',
    data: product,
  });

  // Use dnd-kit transform to move the element while dragging
  const style = {
    transform: CSS.Translate.toString(transform),
    // Fade the original card while dragging so the DragOverlay feels like the “real” element
    opacity: isDragging && !isOverlay ? 0.2 : 1,
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: isOverlay ? 'grabbing' : 'grab',
    // Keep z-index low on the original card and let the overlay handle stacking
    zIndex: isDragging && !isOverlay ? 1 : 'auto',
    boxShadow: isDragging && !isOverlay
      ? '0 10px 20px rgba(0, 0, 0, 0.0)' // Remove visible shadow from the ghost card
      : '0 4px 6px rgba(0, 0, 0, 0.1)',
  };

  // Normalize product fields so the card works with different backend shapes
  const name = product.prod_name || product.name || 'Producto sin nombre';
  const price = product.price || product.retail_price || 99;
  const stock = product.stock || 3;
  const image = product.image_url || product.image || imagen;

  const numericPrice = parseFloat(price) || 0;
  const displayPrice = `$${Math.round(numericPrice)}`;
  // Strip a leading ampersand that sometimes appears in the raw data
  const displayName = name.startsWith('&') ? name.substring(1).trim() : name;

  const isInStock = stock > 0;
  const stockMessage = isInStock ? `¡Sólo ${stock} en stock!` : 'Sin stock';
  const buttonText = isInStock ? 'Agregar al carrito' : 'Notificarme';

  return (
    <div
      ref={setNodeRef}
      // Attach drag listeners only on the base card, not on the overlay clone
      {...(!isOverlay ? listeners : {})}
      {...(!isOverlay ? attributes : {})}
      style={style}
      className={`w-full rounded-xl overflow-hidden bg-white shadow-lg transition-all duration-200 
                  ${!isOverlay ? 'hover:shadow-xl' : 'shadow-none'}`}
    >
      <div className="relative h-[350px] overflow-hidden">
        {/* Use different ribbon colors for base card vs overlay to visually distinguish them */}
        <div
          className={`absolute top-0 right-0 text-white text-xl font-bold py-2 px-6 rounded-bl-xl z-10 ${
            isOverlay ? 'bg-indigo-600' : 'bg-red-600'
          }`}
        >
          {displayPrice}
        </div>
        <img
          src={image}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-6 text-left">
        {/* Simple anchor to detail page; using href keeps it independent from router hooks */}
        <a
          href={`/detail/${product.external_article_id || product.id}`}
          className="block cursor-pointer hover:underline text-gray-900"
        >
          <h3
            className="font-bold text-xl mb-3 overflow-hidden whitespace-nowrap"
            style={{
              // Apply a gradient mask so long names fade out instead of being abruptly cut
              WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
              maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
            }}
          >
            {displayName}
          </h3>
        </a>

        {isInStock && (
          <div
            className={`inline-block text-white font-bold px-3 py-2 mb-4 rounded-full text-md ${
              isOverlay ? 'bg-gray-500' : 'bg-red-600'
            }`}
          >
            {stockMessage}
          </div>
        )}

        <div className="mt-2">
          {/* Disable button interaction inside DragOverlay to avoid accidental clicks while dragging */}
          <CustomButton
            text={isLoading ? 'Procesando...' : buttonText}
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
