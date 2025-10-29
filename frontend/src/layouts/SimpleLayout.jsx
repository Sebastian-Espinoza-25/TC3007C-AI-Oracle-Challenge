import React from 'react';
import SimpleNav from '../components/UI/SimpleNav';
import { Outlet } from 'react-router-dom';

const SimpleLayout = () => {
    return (
        <div className='flex flex-col h-screen'>
            <SimpleNav></SimpleNav>
            <main className='h-full overflow-y-auto'>
                <Outlet></Outlet>
            </main>
        </div>
    );
};

export default SimpleLayout;