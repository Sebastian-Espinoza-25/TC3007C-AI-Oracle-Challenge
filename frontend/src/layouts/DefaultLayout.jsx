import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Navbar from '../components/UI/Navbar';
import SidebarAgent from '../components/UI/SidebarAgent';
import Footer from '../components/UI/Footer';

const DefaultLayout = () => {
    // Estado de la sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarWidthClass = 'md:mr-96';

    // Toggle de apertura/cierre
    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* --- Navbar --- */}
            <Navbar 
                onToggleSidebar={toggleSidebar} 
                isSidebarOpen={isSidebarOpen}
            />

            {/* --- Contenido principal --- */}
            <main
                className={`flex-grow transition-margin duration-300 ease-in-out w-full ${
                    isSidebarOpen ? sidebarWidthClass : ''
                }`}
            >
                {/* Pasa el estado al Outlet */}
                <div className="mt-16 p-4 w-full">
                    <Outlet context={{ isSidebarOpen }} />
                </div>
            </main>

            {/* --- Footer --- */}
            <Footer isSidebarOpen={isSidebarOpen} />

            {/* --- Sidebar Agent --- */}
            <SidebarAgent 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
        </div>
    );
};

export default DefaultLayout;
