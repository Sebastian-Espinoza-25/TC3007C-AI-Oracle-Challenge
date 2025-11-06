// In /src/components/UI/ProductCard.jsx
import React from 'react';
import CustomButton from './CustomButton';
import imagen from '../../assets/react.svg';

const ProductCard = ({
    name = 'Producto por default',
    price = '$99',
    stock = 3,
    image = imagen,
}) => {
    // --- Data Transformation & Logic ---

    // 1. Price Rounding and Formatting
    // Extracts the number (assuming a format like '$XXX.YY' or '$XXX'),
    // rounds it, and re-adds the '$' sign.
    const numericPriceMatch = price.match(/(\d+(\.\d+)?)/);
    let displayPrice = price;

    if (numericPriceMatch) {
        const numericPrice = parseFloat(numericPriceMatch[0]);
        const roundedPrice = Math.round(numericPrice);
        displayPrice = `$${roundedPrice}`;
    }

    // 2. Product Name Truncation (Removes first 4 characters)
    const displayName = name.substring(4).trim();
    
    // Determine the stock message and button text based on the stock count
    const isInStock = stock > 0;
    const stockMessage = isInStock ? `¡Sólo ${stock} en stock!` : 'Sin stock';
    const buttonText = isInStock ? 'Agregar al carrito' : 'Notificarme';

    // A utility function to generate a unique gradient ID for the mask style (kept for completeness)
    const gradientId = `gradient-mask-${name.replace(/\s/g, '-')}`;

    return (
        <div className='w-full rounded-xl overflow-hidden bg-white shadow-lg'>

            {/* Redesign: Increased image height and added object-cover for consistent sizing */}
            <div className='relative h-[350px] overflow-hidden'>
                {/* Price remains in the top right corner */}
                <div className='absolute top-0 right-0 bg-red-600 text-white text-xl font-bold py-2 px-6 rounded-bl-xl z-10'>
                    {/* Use the rounded price */}
                    {displayPrice} 
                </div>
                <img
                    src={image}
                    alt='imagen de producto'
                    className='w-full h-full object-cover' // Ensures image covers the area
                />
            </div>

            <div className='p-6 text-left'>
                <h3
                    className='font-bold text-xl mb-3 overflow-hidden whitespace-nowrap'
                    style={{
                        WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
                        maskImage: 'linear-gradient(to right, black 90%, transparent 100%)', // Add gradient overflow for the text
                    }}
                >
                    {/* Use the modified name */}
                    {displayName} 
                </h3>
                
                {/* Stock Status remains */}
                {isInStock && (
                    <div className='inline-block bg-red-600 text-white font-bold px-2 py-2 mb-4 rounded-full text-md'>
                        {stockMessage}
                    </div>
                )}
                
                {/* Custom Button remains */}
                <div className='mt-2'>
                    <CustomButton
                        text={buttonText}
                        style={'normal'} 
                        extraStyles='w-full cursor-pointer bg-dark-500 text-center py-4 text-xl text-white rounded-lg hover:opacity-90 transition duration-200'
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductCard;