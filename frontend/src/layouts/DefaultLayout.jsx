import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Navbar from '../components/UI/Navbar';
import SidebarAgent from '../components/UI/SidebarAgent';
import Footer from '../components/UI/Footer';

const DefaultLayout = () => {
    // This state control the sidebar visibility
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarWidthClass = 'md:mr-96';
    
    // Toggle for open/close
    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    return (
        // 1. Main container: Set to flex column and fill the viewport height
        <div className='flex flex-col min-h-screen'> 
            <Navbar 
                onToggleSidebar={toggleSidebar} 
                isSidebarOpen={isSidebarOpen} 
            />
            
            {/* 2. Main content: Use flex-grow to consume remaining vertical space */}
            <main 
                className={`flex-grow transition-margin duration-300 ease-in-out ${
                    isSidebarOpen ? sidebarWidthClass : ''
                }`}
            >
                {/* 3. The inner content wrapper where routing occurs. 
                     ACTION: Removed 'p-4' (padding) to allow content to fill the space.
                     Kept 'mt-16' (margin-top) to ensure content is below the Navbar.
                */}
                <div className="mt-16"> 
                    <Outlet />
                </div>
            </main>

            {/* Footer remains at the bottom, pushed by the growing main content */}
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