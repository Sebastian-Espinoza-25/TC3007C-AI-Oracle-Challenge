import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import CartNavbar from '../components/UI/CartNavbar';

const CartLayout = () => {
    return (
        <div className='flex flex-col min-h-screen'> 
            <CartNavbar />
            
            <main className="flex-grow mt-16 p-4"> 
                <Outlet />
            </main>
        </div>
    );
}



export default CartLayout;