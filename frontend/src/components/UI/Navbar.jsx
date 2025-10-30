import React, { useState } from 'react';
import CustomButton from './CustomButton';

import { AiOutlineHome } from "react-icons/ai";
import { MdOutlineShoppingCart } from "react-icons/md";
import { RiAccountCircleLine, RiMenuLine, RiCloseLine, RiSearchLine } from "react-icons/ri";
import { RiRobot2Line } from "react-icons/ri";

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => { 
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLogin, setLogin] = useState(true); // Set to true for demonstration
    
    const sidebarWidthClass = 'md:mr-96'; 

    const navbarContainerClasses = `
        fixed top-0 left-0 right-0 z-50 bg-white shadow-md 
        transition-margin duration-300 ease-in-out 
        ${isSidebarOpen ? sidebarWidthClass : ''}
    `;

    // --- Sub-components (omitted for brevity, they remain mostly the same) ---
    const AgentButton = () => (
        // ... (AgentButton implementation remains the same)
        <button
            onClick={onToggleSidebar}
            className={`
                flex items-center justify-center p-2 rounded-md
                transition-all duration-300 ease-in-out
                text-white font-bold text-xs cursor-pointer
                ${isSidebarOpen 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-violet-600 hover:bg-violet-700'
                }
            `}
            title={isSidebarOpen ? "Cerrar Asistente" : "Abrir Asistente AI"}
        >
            <RiRobot2Line className='w-[25px] h-[25px] mr-2' />
            <p className='hidden sm:block text-base'> 
                {isSidebarOpen ? "Cerrar" : "Tu asistente"}
            </p>
        </button>
    );

    const LoggedInLinks = () => (
        <div className='hidden md:flex gap-6 justify-between text-primary-500 font-bold'>
            <div className='flex flex-col justify-center items-center cursor-pointer'>
                <AiOutlineHome className='w-[30px] h-[30px]'/>
                <p className='text-xs m-1'>Inicio</p>
            </div>
            <div className='flex flex-col justify-center items-center cursor-pointer'>
                <MdOutlineShoppingCart className='w-[30px] h-[30px]'/>
                <p className='text-xs m-1'>Carrito</p>
            </div>
            <div className='flex flex-col justify-center items-center cursor-pointer'>
                <RiAccountCircleLine className='w-[30px] h-[30px]'/>
                <p className='text-xs m-1'>Perfil</p>
            </div>
        </div>
    );

    const LoggedOutButtons = () => (
        <div className='hidden md:flex gap-6 items-center'>
            <CustomButton text='Iniciar Sesión' style='secondary' route='/auth/login' />
            <CustomButton text='Regístrate' style='secondary' route='/auth/signup' />
        </div>
    );
    
    const SearchInput = () => (
        // FIX: Adjusted width on desktop to prevent crowding links/buttons
        <div className='w-1/3 max-w-xl hidden sm:block'> 
            <input 
                type="text" 
                placeholder='Busca y elije tu siguiente artículo...'
                className='bg-terciary-400 text-gray-800 w-full px-4 py-2 rounded-full'
            />
        </div>
    );

    const MobileSearchIcon = () => (
        <div className='block sm:hidden cursor-pointer p-2 text-gray-700 hover:text-primary-500'>
            <RiSearchLine className='w-6 h-6' />
        </div>
    );

    const MenuButton = () => (
        <button 
            onClick={() => setIsMenuOpen(prev => !prev)}
            className='p-2 md:hidden text-gray-700 hover:text-primary-500'
        >
            {isMenuOpen ? <RiCloseLine className='w-8 h-8' /> : <RiMenuLine className='w-8 h-8' />}
        </button>
    );
    // ------------------------------------------------------------------------

    return (
        <div className={navbarContainerClasses}> 
            <div className='flex justify-between items-center p-4'>
                
                {/* 1. LEFT SECTION: Logo (Desktop) / Hamburger & Search (Mobile) */}
                <div className='flex items-center gap-4'> 
                    
                    {/* Logo (Visible on desktop, aligned left) */}
                    {/* FIX: Removed 'absolute' centering and applied 'md:block' to ensure it's on the left on desktop */}
                    <div className='cursor-pointer hidden md:block'>
                        <h1 className='text-4xl text-primary-500 font-bold'>Allure</h1>
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
                    {isLogin ? <LoggedInLinks /> : <LoggedOutButtons />}
                    
                    <AgentButton />
                </div>
                
                {/* 4. Mobile Logo (Centered only when menu/search icons are present) */}
                {/* FIX: Add the logo back in the center for mobile view where we removed it from the left section */}
                <div className='cursor-pointer md:hidden absolute left-1/2 transform -translate-x-1/2'>
                    <h1 className='text-4xl text-primary-500 font-bold'>Allure</h1>
                </div>

            </div>

            {/* --- Mobile Menu Overlay --- (remains the same) */}
            {isMenuOpen && (
                <div className='md:hidden absolute top-full left-0 right-0 bg-white shadow-xl flex flex-col items-center py-4 border-t border-gray-200'>
                    {isLogin ? (
                        <>
                            <div className='w-full flex flex-col text-primary-500 font-bold'>
                                <a href="#" className='flex items-center p-3 hover:bg-gray-100 border-b'><AiOutlineHome className='mr-2' /> Inicio</a>
                                <a href="#" className='flex items-center p-3 hover:bg-gray-100 border-b'><MdOutlineShoppingCart className='mr-2' /> Carrito</a>
                                <a href="#" className='flex items-center p-3 hover:bg-gray-100'><RiAccountCircleLine className='mr-2' /> Perfil</a>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className='w-full flex flex-col p-4 space-y-3'>
                                <CustomButton text='Iniciar Sesión' style='secondary' route='/auth/login' extraStyles='w-full py-3' />
                                <CustomButton text='Regístrate' style='secondary' route='/auth/signup' extraStyles='w-full py-3' />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Navbar;