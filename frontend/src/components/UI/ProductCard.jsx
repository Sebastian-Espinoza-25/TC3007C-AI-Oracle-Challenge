import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CustomButton from './CustomButton';
import imagen from '../../assets/react.svg';

const ProductCard = ({ product }) => {
  // Validamos datos por seguridad
  if (!product) return null;

  // 1️⃣ Hook de Draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: product.external_article_id || product.id || 'producto-sin-id',
    data: product,
  });

  // 2️⃣ Estilos dinámicos de arrastre
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.8 : 1,
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: 'grab',
    zIndex: isDragging ? 100 : 'auto',
    boxShadow: isDragging
      ? '0 10px 20px rgba(0, 0, 0, 0.2)'
      : '0 4px 6px rgba(0, 0, 0, 0.1)',
  };

  // 3️⃣ Datos visuales procesados
  const name = product.prod_name || product.name || 'Producto sin nombre';
  const price = product.price || product.retail_price || 99;
  const stock = product.stock || 3;
  const image = product.image_url || product.image || imagen;

  const numericPrice = parseFloat(price) || 0;
  const displayPrice = `$${Math.round(numericPrice)}`;
  const displayName = name.startsWith('&') ? name.substring(1).trim() : name;

  const isInStock = stock > 0;
  const stockMessage = isInStock ? `¡Sólo ${stock} en stock!` : 'Sin stock';
  const buttonText = isInStock ? 'Agregar al carrito' : 'Notificarme';

  // 4️⃣ Render del componente
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="w-full rounded-xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-200"
    >
      {/* Imagen */}
      <div className="relative h-[350px] overflow-hidden">
        <div className="absolute top-0 right-0 bg-red-600 text-white text-xl font-bold py-2 px-6 rounded-bl-xl z-10">
          {displayPrice}
        </div>
        <img
          src={image}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Información */}
      <div className="p-6 text-left">
        <a
          href={`/detail/${product.external_article_id || product.id}`}
          className="block cursor-pointer hover:underline text-gray-900"
        >
          <h3
            className="font-bold text-xl mb-3 overflow-hidden whitespace-nowrap"
            style={{
              WebkitMaskImage:
                'linear-gradient(to right, black 90%, transparent 100%)',
              maskImage:
                'linear-gradient(to right, black 90%, transparent 100%)',
            }}
          >
            {displayName}
          </h3>
        </a>

        {isInStock && (
          <div className="inline-block bg-red-600 text-white font-bold px-3 py-2 mb-4 rounded-full text-md">
            {stockMessage}
          </div>
        )}

        <div className="mt-2">
          <CustomButton
            text={buttonText}
            style={'normal'}
            extraStyles="w-full cursor-pointer bg-dark-500 text-center py-4 text-xl text-white rounded-lg hover:opacity-90 transition duration-200"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
