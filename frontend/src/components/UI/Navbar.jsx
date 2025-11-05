import React, { useState } from 'react';

// Importamos Link de react-router-dom para la navegación interna
import { useLocation, Link } from 'react-router-dom';

import CustomButton from './CustomButton';

import { AiOutlineHome } from "react-icons/ai";
import { MdOutlineShoppingCart } from "react-icons/md";
import { RiAccountCircleLine, RiMenuLine, RiCloseLine, RiSearchLine, RiLogoutBoxLine } from "react-icons/ri"; 
import { RiRobot2Line } from "react-icons/ri";

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => { 
    // Get the location object which includes the current route
    const location = useLocation();
    const currentPath = location.pathname;

    // Route logic: Hide most elements on authentication pages
    const isAuthPage = currentPath.startsWith('/auth');
    // Route logic: Hide only the AI assistant button on cart pages
    const isCartPage = currentPath.startsWith('/cart');
    
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Default to closed
    const [isLogin, setLogin] = useState(true); 
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    
    // Nueva variable: True si el usuario NO está logueado Y NO estamos en una página /auth
    const showAuthButtons = !isLogin && !isAuthPage;

    // Lógica para impedir que el sidebar se abra en rutas /auth
    const effectiveIsSidebarOpen = isAuthPage ? false : isSidebarOpen;

    const sidebarWidthClass = 'md:mr-96'; 

    const navbarContainerClasses = `
        fixed top-0 left-0 right-0 z-50 bg-white shadow-md 
        transition-margin duration-300 ease-in-out 
        ${effectiveIsSidebarOpen ? sidebarWidthClass : ''}
    `;

    // --- Sub-components  ---
    const AgentButton = () => {
        // Lógica: Si se muestran los botones de Iniciar Sesión/Registrarse (showAuthButtons es true),
        // usamos 'flex flex-row' (en lugar de 'flex flex-col')
        const flexClasses = showAuthButtons 
            ? 'flex items-center' // Muestra el ícono y texto en fila (comportamiento de botón estándar)
            : 'flex flex-col items-center justify-center'; // Muestra el ícono sobre el texto (comportamiento de ícono de navbar)

        // Lógica: Si se muestran los botones de Iniciar Sesión/Registrarse, el ícono necesita un margen derecho
        const iconMarginClass = showAuthButtons ? 'mr-1' : 'mx-auto';

        // Lógica: Si estamos en una ruta de autenticación, el botón está inactivo/oculto (aunque ya lo filtramos más abajo)
        const isDisabled = isAuthPage;

        const handleToggle = () => {
            // Impedir toggle si estamos en una ruta de auth
            if (!isDisabled) {
                onToggleSidebar();
            }
        };

        return (
            <button
                onClick={handleToggle}
                // Si showAuthButtons es true, el texto "Asistente" debe ser visible
                className={`
                    ${flexClasses} p-2 rounded-md
                    transition-all duration-300 ease-in-out
                    text-white font-bold text-xs cursor-pointer
                    ${effectiveIsSidebarOpen // Usamos el estado efectivo para el color
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-violet-600 hover:bg-violet-700'
                    }
                `}
                title={effectiveIsSidebarOpen ? "Cerrar Asistente" : "Abrir Asistente AI"}
                disabled={isDisabled}
            >
                <RiRobot2Line className={`w-[25px] h-[25px] ${iconMarginClass}`} />
                {/* El texto debe ser visible si estamos mostrando los botones de LogOut, incluso en móviles, o si es desktop */}
                <p className={`${showAuthButtons ? 'text-sm' : 'hidden sm:block text-xs'}`}> 
                    {effectiveIsSidebarOpen ? "Cerrar" : "Asistente"}
                </p>
            </button>
        );
    };

    const LoggedInLinks = () => (
        <div className='hidden md:flex gap-6 justify-between text-primary-500 font-bold'>
            <Link to="/" className='flex flex-col justify-center items-center cursor-pointer'>
                <AiOutlineHome className='w-[30px] h-[30px]'/>
                <p className='text-xs m-1'>Inicio</p>
            </Link>
            
            <Link to="/cart" className='flex flex-col justify-center items-center cursor-pointer'>
                <MdOutlineShoppingCart className='w-[30px] h-[30px]'/>
                <p className='text-xs m-1'>Carrito</p>
            </Link>

            <div className='relative'>
                <div 
                    className='flex flex-col justify-center items-center cursor-pointer'
                    onClick={() => setIsProfileDropdownOpen(prev => !prev)}
                >
                    <RiAccountCircleLine className='w-[30px] h-[30px]'/>
                    <p className='text-xs m-1'>Perfil</p>
                </div>

                {isProfileDropdownOpen && (
                    <div className='absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-100'>
                        <Link 
                            to="/profile" 
                            className='flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                            onClick={() => setIsProfileDropdownOpen(false)}
                        >
                            <RiAccountCircleLine className='mr-2' /> Ver Perfil
                        </Link>
                        
                        <Link 
                            to="/auth/logout" 
                            className='flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-md'
                            onClick={() => setIsProfileDropdownOpen(false)}
                        >
                            <RiLogoutBoxLine className='mr-2' /> Cerrar Sesión
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );

    const LoggedOutButtons = () => (
        // Se llama solo si showAuthButtons es true, pero se mantiene la estructura por si hay lógica adicional aquí.
        <div className='hidden md:flex gap-6 items-center'>
            <CustomButton text='Iniciar Sesión' style='secondary' route='/auth/login' />
            <CustomButton text='Regístrate' style='secondary' route='/auth/signup' />
        </div>
    );
    
    // ... (SearchInput, MobileSearchIcon, MenuButton permanecen igual)

    const SearchInput = () => (
        // Apply logic: Hide Search Input if on any /auth route
        <div className={`w-1/3 max-w-xl ${isAuthPage ? 'hidden' : 'hidden sm:block'}`}> 
            <input 
                type="text" 
                placeholder='Busca y elije tu siguiente artículo...'
                className='bg-terciary-400 text-gray-800 w-full px-4 py-2 rounded-full'
            />
        </div>
    );

    const MobileSearchIcon = () => (
        // Apply logic: Hide Search Icon if on any /auth route
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

    return (
        <div className={navbarContainerClasses}> 
            {/* Alineación condicional: justify-start si es auth, justify-around en caso contrario. */}
            <div className={`flex items-center p-4 ${isAuthPage ? 'justify-start' : 'justify-around'}`}>
                
                {/* 1. LEFT SECTION: Logo (Desktop) / Hamburger & Search (Mobile) */}
                <div className='flex items-center gap-4'> 
                    
                    {/* Logo (Visible on desktop, aligned left) */}
                    <div className='cursor-pointer hidden md:block'>
                        <Link to="/">
                            <h1 className='text-4xl text-primary-500 font-bold'>Allure</h1>
                        </Link>
                    </div>

                    {/* Mobile Menu & Search Icon (Visible on mobile, aligned left) */}
                    <div className='flex items-center gap-2 md:hidden'>
                        <MenuButton />
                        <MobileSearchIcon />
                    </div>
                </div>

                {/* 2. CENTER SECTION: Search Input (Desktop) */}
                <SearchInput />

                {/* 3. RIGHT SECTION: Links/Buttons and Agent Button */}
                <div className='flex gap-4 items-center'> 
                    
                    {/* Renderiza LoggedInLinks o LoggedOutButtons (si showAuthButtons es true) */}
                    {isLogin ? <LoggedInLinks /> : (showAuthButtons && <LoggedOutButtons />)}
                    
                    {/* Renderiza AgentButton solo si NO es /auth y NO es /cart */}
                    {!(isAuthPage || isCartPage) && <AgentButton />}
                </div>
                
                {/* 4. Mobile Logo (Centered only when menu/search icons are present) */}
                <div className='cursor-pointer md:hidden absolute left-1/2 transform -translate-x-1/2'>
                    <Link to="/">
                        <h1 className='text-4xl text-primary-500 font-bold'>Allure</h1>
                    </Link>
                </div>

            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className='md:hidden absolute top-full left-0 right-0 bg-white shadow-xl flex flex-col items-center py-4 border-t border-gray-200'>
                    {/* Do not display navigation/auth buttons in the mobile menu if on an auth page */}
                    {!isAuthPage && (
                        isLogin ? (
                            <>
                                <div className='w-full flex flex-col text-primary-500 font-bold'>
                                    <Link to="/" className='flex items-center p-3 hover:bg-gray-100 border-b'><AiOutlineHome className='mr-2' /> Inicio</Link>
                                    <Link to="/cart" className='flex items-center p-3 hover:bg-gray-100 border-b'><MdOutlineShoppingCart className='mr-2' /> Carrito</Link>
                                    <Link to="/profile" className='flex items-center p-3 hover:bg-gray-100'><RiAccountCircleLine className='mr-2' /> Perfil</Link>
                                    <Link 
                                        to="/auth/logout" 
                                        className='flex items-center p-3 text-red-600 hover:bg-red-50'
                                    >
                                        <RiLogoutBoxLine className='mr-2' /> Cerrar Sesión
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='w-full flex flex-col p-4 space-y-3'>
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