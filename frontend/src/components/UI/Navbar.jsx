import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import CustomButton from './CustomButton';
import { useAuth } from '../../contexts/AuthContext';

// Icon Imports
import { AiOutlineHome } from "react-icons/ai";
import { MdOutlineShoppingCart } from "react-icons/md";
import { RiAccountCircleLine, RiMenuLine, RiCloseLine, RiSearchLine, RiLogoutBoxLine } from "react-icons/ri"; 
import { RiRobot2Line } from "react-icons/ri";

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => { 
    const { isLoggedIn, logout } = useAuth();

    // Get the location object which includes the current route
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    // Route logic: Hide most elements on authentication pages
    const isAuthPage = currentPath.startsWith('/auth');
    // Route logic: Hide only the AI assistant button on cart pages
    const isCartPage = currentPath.startsWith('/cart');
    
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Default to closed
    
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    
    // Logic to determine if LogOut buttons should use the alternative layout for the AgentButton
    const showAuthButtons = !isLoggedIn && !isAuthPage;

    // Removed effectiveIsSidebarOpen. Now using isSidebarOpen directly from props.
    // NOTE: The initial state of isSidebarOpen must be managed by the parent component (set to false initially).
    
    const sidebarWidthClass = 'md:mr-96'; 

    const navbarContainerClasses = `
        fixed top-0 left-0 right-0 z-50 bg-white shadow-md 
        transition-margin duration-300 ease-in-out 
        ${isSidebarOpen ? sidebarWidthClass : ''}  // <-- CAMBIADO a 'isSidebarOpen'
    `;

    // --- Sub-components  ---
    const AgentButton = () => {
        // Class changes based on whether LoggedOut buttons are visible
        const flexClasses = showAuthButtons 
            ? 'flex items-center' // Horizontal layout when LogOut buttons are shown
            : 'flex flex-col items-center justify-center'; // Vertical layout for logged-in user

        const iconMarginClass = showAuthButtons ? 'mr-1' : 'mx-auto';

        const isDisabled = isAuthPage;

        const handleToggle = () => {
            // Prevent toggle if on an auth route
            if (!isDisabled) {
                onToggleSidebar();
            }
        };

        return (
            <button
                onClick={handleToggle}
                className={`
                    ${flexClasses} p-2 rounded-md
                    transition-all duration-300 ease-in-out
                    text-white font-bold text-xs cursor-pointer
                    ${isSidebarOpen // Use isSidebarOpen directly
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-violet-600 hover:bg-violet-700'
                    }
                `}
                title={isSidebarOpen ? "Cerrar Asistente" : "Abrir Asistente AI"}
                disabled={isDisabled}
            >
                <RiRobot2Line className={`w-[25px] h-[25px] ${iconMarginClass}`} />
                {/* Text visibility change based on layout and screen size */}
                <p className={`${showAuthButtons ? 'text-sm' : 'hidden sm:block text-xs'}`}> 
                    {isSidebarOpen ? "Cerrar" : "Asistente"}
                </p>
            </button>
        );
    };

    const LoggedInLinks = () => (
        <div className='hidden md:flex gap-6 justify-between text-primary-500 font-bold'>
            {/* Home Link */}
            <Link to="/" className='flex flex-col justify-center items-center cursor-pointer'>
                <AiOutlineHome className='w-[30px] h-[30px]'/>
                <p className='text-xs m-1'>Inicio</p>
            </Link>
            
            {/* Cart Link */}
            <Link to="/cart" className='flex flex-col justify-center items-center cursor-pointer'>
                <MdOutlineShoppingCart className='w-[30px] h-[30px]'/>
                <p className='text-xs m-1'>Carrito</p>
            </Link>

            {/* Profile Dropdown Container */}
            <div className='relative'>
                <div 
                    className='flex flex-col justify-center items-center cursor-pointer'
                    onClick={() => setIsProfileDropdownOpen(prev => !prev)}
                >
                    <RiAccountCircleLine className='w-[30px] h-[30px]'/>
                    <p className='text-xs m-1'>Perfil</p>
                </div>

                {/* Dropdown Menu */}
                {isProfileDropdownOpen && (
                    <div className='absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-100'>
                        {/* View Profile Link */}
                        <Link 
                            to="/profile" 
                            className='flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                            onClick={() => setIsProfileDropdownOpen(false)}
                        >
                            <RiAccountCircleLine className='mr-2' /> Ver Perfil
                        </Link>
                        
                        {/* Logout Link */}
                        <div 
                            className='flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-md cursor-pointer'
                            onClick={handleLogout}
                        >
                            <RiLogoutBoxLine className='mr-2' /> Cerrar Sesión
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const LoggedOutButtons = () => (
        // Authentication buttons (Login/Signup)
        <div className='hidden md:flex gap-6 items-center'>
            <CustomButton text='Iniciar Sesión' style='secondary' route='/auth/login' />
            <CustomButton text='Regístrate' style='secondary' route='/auth/signup' />
        </div>
    );

    const SearchInput = () => (
        // Hide Search Input if on any /auth route
        <div className={`w-1/3 max-w-xl ${isAuthPage ? 'hidden' : 'hidden sm:block'}`}> 
            <input 
                type="text" 
                placeholder='Busca y elije tu siguiente artículo...'
                className='bg-terciary-400 text-gray-800 w-full px-4 py-2 rounded-full'
            />
        </div>
    );

    const MobileSearchIcon = () => (
        // Hide Search Icon if on any /auth route
        isAuthPage ? null : (
            <div className='block sm:hidden cursor-pointer p-2 text-gray-700 hover:text-primary-500'>
                <RiSearchLine className='w-6 h-6' />
            </div>
        )
    );

    const MenuButton = () => (
        <button 
            onClick={() => setIsMenuOpen(prev => !prev)}
            className='p-2 md:hidden text-gray-700 hover:text-primary-500'
        >
            {isMenuOpen ? <RiCloseLine className='w-8 h-8' /> : <RiMenuLine className='w-8 h-8' />}
        </button>
    );

    const handleLogout = () => {
        logout(); // Llama a la función 'logout' del contexto
        setIsProfileDropdownOpen(false); // Cierra el menú
        navigate('/auth/logout'); // Redirige al usuario a la página de login
    };

    return (
        <div className={navbarContainerClasses}> 
            {/* Conditional alignment: justify-start if auth page, justify-around otherwise. */}
            <div className={`flex items-center p-4 ${isAuthPage ? 'justify-start' : 'justify-around'}`}>
                
                {/* 1. LEFT SECTION: Logo (Desktop) / Hamburger & Search (Mobile) */}
                <div className='flex items-center gap-4'> 
                    
                    {/* Logo (Visible on desktop, aligned left) */}
                    {/* Applying px-4 padding when on an auth page for separation */}
                    <div className={`cursor-pointer hidden md:block ${isAuthPage ? 'px-4' : ''}`}>
                        <Link to="/">
                            <h1 className='text-4xl text-primary-500 font-bold'>Allure</h1>
                        </Link>
                    </div>

                    {/* Mobile Menu & Search Icon */}
                    <div className='flex items-center gap-2 md:hidden'>
                        <MenuButton />
                        <MobileSearchIcon />
                    </div>
                </div>

                {/* 2. CENTER SECTION: Search Input (Desktop) */}
                <SearchInput />

                {/* 3. RIGHT SECTION: Links/Buttons and Agent Button */}
                <div className='flex gap-4 items-center'> 
                    
                    {/* Hide LoggedIn/LoggedOut buttons if on any /auth route */}
                    {!isAuthPage && (
                        isLoggedIn ? <LoggedInLinks /> : <LoggedOutButtons />
                    )}
                    
                    {/* Render AgentButton only if NOT /auth and NOT /cart pages */}
                    {!(isAuthPage || isCartPage) && <AgentButton />}
                </div>
                
                {/* 4. Mobile Logo (Centered) */}
                <div className='cursor-pointer md:hidden absolute left-1/2 transform -translate-x-1/2'>
                    <Link to="/">
                        <h1 className='text-4xl text-primary-500 font-bold'>Allure</h1>
                    </Link>
                </div>

            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className='md:hidden absolute top-full left-0 right-0 bg-white shadow-xl flex flex-col items-center py-4 border-t border-gray-200'>
                    {/* Hide navigation buttons in the mobile menu if on an auth page */}
                    {!isAuthPage && (
                        isLoggedIn ? (
                            <>
                                <div className='w-full flex flex-col text-primary-500 font-bold'>
                                    {/* Mobile Logged In Links */}
                                    <Link to="/" className='flex items-center p-3 hover:bg-gray-100 border-b'><AiOutlineHome className='mr-2' /> Inicio</Link>
                                    <Link to="/cart" className='flex items-center p-3 hover:bg-gray-100 border-b'><MdOutlineShoppingCart className='mr-2' /> Carrito</Link>
                                    <Link to="/profile" className='flex items-center p-3 hover:bg-gray-100'><RiAccountCircleLine className='mr-2' /> Perfil</Link>
                                    {/* Mobile Logout Option */}
                                    <div 
                                        className='flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-md cursor-pointer'
                                        onClick={handleLogout}
                                    >
                                        <RiLogoutBoxLine className='mr-2' /> Cerrar Sesión
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='w-full flex flex-col p-4 space-y-3'>
                                    {/* Mobile Logged Out Buttons */}
                                    <CustomButton text='Iniciar Sesión' style='secondary' route='/auth/login' extraStyles='w-full py-3' />
                                    <CustomButton text='Regístrate' style='secondary' route='/auth/signup' extraStyles='w-full py-3' />
                                </div>
                            </>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default Navbar;