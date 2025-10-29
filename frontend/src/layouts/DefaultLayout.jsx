import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Navbar from '../components/UI/Navbar';
import SidebarAgent from '../components/UI/SidebarAgent';
import Footer from '../components/UI/Footer';

const DefaultLayout = () => {
    // This state control the sidebar visibility
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const sidebarWidthClass = 'md:mr-96';
    
    // Toggle for open/close
    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    return (
        <div className='flex flex-col h-screen'>
            <Navbar 
                onToggleSidebar={toggleSidebar} 
                isSidebarOpen={isSidebarOpen} 
            />
            
            <main 
                className={`flex-grow h-full overflow-y-auto transition-margin duration-300 ease-in-out ${
                    isSidebarOpen ? sidebarWidthClass : ''
                }`}
            >
                <div className="mt-16 p-4"> 
                    <Outlet />
                </div>
            </main>

            <Footer
                isSidebarOpen={isSidebarOpen}
            />
            
            <SidebarAgent 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />
            
        </div>
    );
};

export default DefaultLayout;