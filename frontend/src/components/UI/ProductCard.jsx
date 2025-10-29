import React from 'react';
import CustomButton from './CustomButton';
import imagen from '../../assets/react.svg';

const ProductCard = ({
    name = 'Producto por default',
    price = '$99',
    stock = 3,
    image = imagen,
}) => {
    // Determine the stock message and button text based on the stock count
    const isInStock = stock > 0;
    const stockMessage = isInStock ? `¡Sólo ${stock} en stock!` : 'Sin stock';
    const buttonText = isInStock ? 'Agregar al carrito' : 'Notificarme';

    // A utility function to generate a unique gradient ID for the mask style
    const gradientId = `gradient-mask-${name.replace(/\s/g, '-')}`;

    return (
        <div className='w-[300px] mx-auto rounded-xl overflow-hidden bg-white shadow-lg'>

            <div className='relative h-[250px] flex justify-center items-center p-8'>
                <div className='absolute top-0 right-0 bg-red-600 text-white text-xl font-bold py-2 px-6 rounded-bl-xl z-10'>
                    {price}
                </div>
                <img
                    src={image}
                    alt='imagen de producto'
                    className='max-h-full max-w-full object-contain'
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
                    {name}
                </h3>
                
                {/* Stock Status */}
                {isInStock && (
                    <div className='inline-block bg-red-600 text-white font-bold px-2 py-2 mb-4 rounded-full text-md'>
                        {stockMessage}
                    </div>
                )}
                
                {/* Custom Button */}
                <div className='mt-2'>
                    <CustomButton
                        text={buttonText}
                        style={'normal'} 
                        extraStyles='w-full cursor-pointer bg-dark-500 text-center py-4 text-xl bg-darl-500 text-white rounded-lg hover:opacity-90 transition duration-200'
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductCard;