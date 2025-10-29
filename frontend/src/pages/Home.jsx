import React from 'react';
import ProductCard from '../components/UI/ProductCard';

const Home = () => {
    return (
        <div className=''>
            <section>
                <img src={null} alt="banner" />
                <div>
                    <h1>Encuentra tu estilo perfecto</h1>
                    <p>Descubre las últimas tendencias y clásicos atemporales.</p>
                    
                </div>
            </section>
            <ProductCard></ProductCard>
        </div>
    );
};

export default Home;