import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CustomButton from './CustomButton';
import placeholderImg from '../../assets/react.svg';

const ProductCard = ({
  product,
  onAddToCart,
  isOverlay = false,
  isLoading = false,
  draggable = true,
}) => {
  if (!product) return null;

  /* -------------------------------------------------------
     1) ID ESTABLE PARA DND
  ------------------------------------------------------- */
  const stableId =
    product.id ||
    product.external_article_id ||
    String(product?.product_code || '') ||
    String(product?.sku || '');

  /* -------------------------------------------------------
     2) DRAGGABLE CONFIG
  ------------------------------------------------------- */
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    draggable && !isOverlay
      ? useDraggable({
          id: stableId,
          data: { product },
        })
      : {
          attributes: {},
          listeners: {},
          setNodeRef: () => {},
          transform: null,
          isDragging: false,
        };

  /* -------------------------------------------------------
     3) FIX: YA NO SE OCULTA → opacity para evitar "desaparición"
  ------------------------------------------------------- */
const style = {
  transform: CSS.Translate.toString(transform),
  opacity: 1, // SIEMPRE 100%
  cursor: isDragging || isOverlay ? 'grabbing' : 'grab',
  zIndex: isOverlay ? 9999 : isDragging ? 999 : 'auto',
  boxShadow:
    isOverlay || isDragging
      ? '0 10px 25px rgba(0,0,0,0.10)'
      : '0 4px 6px rgba(0,0,0,0.10)',
  transition: 'box-shadow 150ms ease',
};

  /* -------------------------------------------------------
     4) DATA NORMALIZATION
  ------------------------------------------------------- */
  const name = product.name || product.prod_name || 'Producto';
  const price = parseFloat(product.price || 0);
  const stock = product.stock || 0;
  const image = product.image || product.image_url || placeholderImg;
  const color = product.color || '';

  const displayName = name.startsWith('&') ? name.substring(1).trim() : name;

  return (
    <div
      ref={setNodeRef}
      {...(draggable && !isOverlay ? listeners : {})}
      {...(draggable && !isOverlay ? attributes : {})}
      style={style}
      className={`w-full bg-white rounded-xl overflow-hidden shadow-lg transition-all ${
        !isOverlay ? 'hover:shadow-xl' : ''
      }`}
    >
      <div className="relative h-[350px] overflow-hidden">
        <div className="absolute top-0 right-0 text-white text-xl font-bold py-2 px-6 bg-red-600 rounded-bl-xl z-10">
          ${Math.round(price)}
        </div>

        <img src={image} alt={displayName} className="w-full h-full object-cover" />
      </div>

      <div className="p-6 text-left">
        <a
          href={`/detail/${stableId}`}
          className="block cursor-pointer hover:underline text-gray-900"
        >
          <h3
            className="font-bold text-xl mb-3 overflow-hidden whitespace-nowrap"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
            }}
          >
            {`${displayName} ${color}`}
          </h3>
        </a>

        {stock > 0 && (
          <div
            className={`inline-block text-white font-bold px-3 py-2 mb-4 rounded-full text-md ${
              isOverlay ? 'bg-gray-500' : 'bg-red-600'
            }`}
          >
            ¡Sólo {stock} en stock!
          </div>
        )}

        <CustomButton
          text={isLoading ? 'Procesando...' : stock > 0 ? 'Agregar al carrito' : 'Notificarme'}
          disabled={isLoading}
          style={'secondary'}
          extraStyles={`
            w-full py-4 text-xl text-white rounded-lg
            ${stock === 0 || isOverlay ? 'bg-gray-400 cursor-not-allowed' : 'bg-dark-500 hover:opacity-90'}
          `}
          onClick={!isOverlay && stock > 0 && !isLoading ? onAddToCart : undefined}
        />
      </div>
    </div>
  );
};

export default ProductCard;
