import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Navbar from '../components/Navbar';
import SidebarAgent from '../components/SidebarAgent';

const DefaultLayout = () => {
    // Definimos el estado para controlar la visibilidad del sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // 🌟 CORRECCIÓN: Definimos sidebarWidthClass.
    // Debe coincidir con el ancho fijo del Sidebar (md:w-96, que es 384px en Tailwind).
    const sidebarWidthClass = 'md:mr-96';
    
    // Función de alternar (toggle) para abrir/cerrar el sidebar
    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    return (
        // Contenedor principal: Altura completa de la pantalla
        <div className='flex flex-col h-screen'>
            
            {/* 1. Navbar: Fijo en la parte superior y se ajusta con el margen */}
            <Navbar 
                onToggleSidebar={toggleSidebar} 
                isSidebarOpen={isSidebarOpen} 
            />
            
            {/* 2. Main Content: Ocupa el espacio restante, permite scroll y ajusta su margen derecho */}
            <main 
                // Usamos la variable definida 'sidebarWidthClass'
                className={`flex-grow h-full overflow-y-auto transition-margin duration-300 ease-in-out ${
                    isSidebarOpen ? sidebarWidthClass : ''
                }`}
            >
                {/* Añadimos un div interno con padding superior para que el contenido no quede debajo del Navbar fijo */}
                <div className="mt-16 p-4"> 
                    <Outlet />
                </div>
            </main>
            
            {/* 3. SidebarAgent: Fijo a la derecha */}
            <SidebarAgent 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />
            
        </div>
    );
};

export default DefaultLayout;