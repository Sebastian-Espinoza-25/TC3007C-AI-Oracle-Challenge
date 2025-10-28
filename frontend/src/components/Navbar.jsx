import React from 'react';
import { useState } from 'react';
import CustomButton from './CustomButton';

import { CiHome } from "react-icons/ci";
import { MdOutlineShoppingCart } from "react-icons/md";
import { VscAccount } from "react-icons/vsc";
import { RiRobot2Line } from "react-icons/ri"; // Icono para el Asistente

// Acepta las props para manejar el estado del Sidebar
const Navbar = ({ onToggleSidebar, isSidebarOpen }) => { 

    const [isLogin, setLogin] = useState(true); // Cambié a 'true' para propósitos de demostración.
    
    // Define la clase de ancho del sidebar para el ajuste de margen
    const sidebarWidthClass = 'md:mr-96'; 
    
    // Estilos para el contenedor principal de la Navbar (Fixed + Ajuste de Margen)
    const navbarContainerClasses = `
        fixed top-0 left-0 right-0 z-50 bg-white shadow-md transition-margin duration-300 ease-in-out 
        ${isSidebarOpen ? sidebarWidthClass : ''}
    `;

    // Botón del Asistente
    const AgentButton = () => (
        <button
            onClick={onToggleSidebar} // Llama a la función para abrir/cerrar el sidebar
            className={`
                flex items-center justify-center p-2 rounded-full 
                transition-all duration-300 ease-in-out
                text-white font-bold text-sm
                ${isSidebarOpen 
                    ? 'bg-red-500 hover:bg-red-600' // Si está abierto, usa color de "cerrar" (rojo)
                    : 'bg-violet-600 hover:bg-violet-700' // Si está cerrado, usa color llamativo (violeta)
                }
            `}
            title={isSidebarOpen ? "Cerrar Asistente" : "Abrir Asistente AI"}
        >
            <RiRobot2Line className='w-[24px] h-[24px] mr-1' />
            <span className='hidden sm:inline'>{isSidebarOpen ? "Cerrar" : "Asistente AI"}</span>
        </button>
    );

    return (
        // Aplicamos la posición fija y la clase condicional de margen aquí
        <div className={navbarContainerClasses}> 
            {/* Si el usuario está logeado */}
            {isLogin && 
                <div className='flex justify-around items-center p-4'>
                    <div className='cursor-pointer'><h1 className='text-4xl text-primary-500 font-bold'>Allure</h1></div>
                    
                    <div className='w-1/2 max-w-lg'>
                        <input 
                            type="text" 
                            placeholder='Busca y elije tu siguiente artículo...'
                            className='bg-terciary-400 text-gray-800 w-full px-4 py-2 rounded-full'/>
                    </div>
                    
                    {/* Contenedor de íconos de navegación y el botón del asistente */}
                    <div className='flex gap-4 items-center'> 
                        <div className='flex gap-6 justify-between text-primary-500 font-bold'>
                            <div className='flex flex-col justify-center items-center cursor-pointer'>
                                <CiHome className='w-[30px] h-[30px]'/>
                                <p className='text-xs m-1'>Inicio</p>
                            </div>
                            <div className='flex flex-col justify-center items-center cursor-pointer'>
                                <MdOutlineShoppingCart className='w-[30px] h-[30px]'/>
                                <p className='text-xs m-1'>Carrito</p>
                            </div>
                            <div className='flex flex-col justify-center items-center cursor-pointer'>
                                <VscAccount className='w-[30px] h-[30px]'/>
                                <p className='text-xs m-1'>Perfil</p>
                            </div>
                        </div>
                        {/* Agregamos el botón del agente aquí */}
                        <AgentButton />
                    </div>
                </div>}
                
            {/* Si el usuario no está logeado */}
            {!isLogin && 
                <div className='flex justify-around items-center p-4'>
                    <div className='cursor-pointer'><h1 className='text-4xl text-primary-500 font-bold'>Allure</h1></div>
                    
                    <div className='w-1/2 m-1 max-w-lg'>
                        <input 
                            type="text" 
                            placeholder='Busca y elije tu siguiente artículo...'
                            className='bg-terciary-400 text-black w-full px-4 py-2 rounded-full'/>
                    </div>
                    
                    {/* Contenedor de botones de autenticación y el botón del asistente */}
                    <div className='flex gap-6 items-center'>
                        <CustomButton text='Iniciar Sesión' style='secondary' route='/auth/login' />
                        <CustomButton text='Regístrate' style='secondary' route='/auth/signup' />
                        {/* Agregamos el botón del agente aquí también */}
                        <AgentButton />
                    </div>
                </div>}
        </div>
    );
};

export default Navbar;