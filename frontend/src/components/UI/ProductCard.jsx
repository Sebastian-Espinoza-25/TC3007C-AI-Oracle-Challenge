import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CustomButton from './CustomButton';
import imagen from '../../assets/react.svg';

const ProductCard = ({ product, onAddToCart, isOverlay, isLoading, draggable = true }) => {
  // Guard clause to avoid rendering when product is missing or undefined
  if (!product) return null;

  // Build a stable draggable ID. Avoid fallback strings since that breaks the DragOverlay.
  const stableId = product.external_article_id || product.id;
  if (!stableId) {
    console.warn("Product without valid ID detected:", product);
  }

  // Make the card draggable and attach product data so the drop target can read it
  const draggableConfig = useDraggable({
    id: stableId,
    // Passing the whole product object can break DnD serialization internally.
    // Wrap it inside another object to avoid unexpected data shape bugs.
    data: { product },
  });

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    draggable
      ? draggableConfig
      : { attributes: {}, listeners: {}, setNodeRef: () => {}, transform: null, isDragging: false };

  // Use dnd-kit transform to move the element while dragging
  const style = {
    transform: CSS.Translate.toString(transform),
    // When dragging the base card, hide it but keep layout: avoid disappearance glitches
    visibility: isDragging && !isOverlay ? 'hidden' : 'visible',
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: isOverlay ? 'grabbing' : draggable ? 'grab' : 'default',
    zIndex: isOverlay ? 9999 : isDragging ? 1 : 'auto',
    boxShadow: isDragging && !isOverlay
      ? '0 10px 20px rgba(0, 0, 0, 0.15)'
      : '0 4px 6px rgba(0, 0, 0, 0.1)',
    willChange: 'transform',
    // Avoid flickering when the overlay appears
    position: isOverlay ? 'relative' : 'static',
  };

  // Normalize product fields so the card works with different backend shapes
  const name = product.prod_name || product.name || 'Producto sin nombre';
  const price = product.price || product.retail_price || 99;
  const stock = product.stock || 3;
  const image = product.image_url || product.image || imagen;
  const color = product.color || 'N/A';

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
      {...(draggable && !isOverlay ? listeners : {})}
      {...(draggable && !isOverlay ? attributes : {})}
      style={style}
      className={`w-full rounded-xl overflow-hidden bg-white shadow-lg transition-all duration-200 
                  ${!isOverlay ? 'hover:shadow-xl' : 'shadow-none'}`}
    >
      <div className="relative h-[350px] overflow-hidden">
        {/* Use different ribbon colors for base card vs overlay to visually distinguish them */}
        <div
          className={`absolute top-0 right-0 text-white text-xl font-bold py-2 px-6 rounded-bl-xl z-10 bg-red-600`}
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
            {displayName + ' ' + color}
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
            style={'secondary'}
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
