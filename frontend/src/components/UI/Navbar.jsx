import React from 'react';
import { useState } from 'react';
import CustomButton from './CustomButton';

import { AiOutlineHome } from "react-icons/ai";
import { MdOutlineShoppingCart } from "react-icons/md";
import { RiAccountCircleLine } from "react-icons/ri";
import { RiRobot2Line } from "react-icons/ri";


const Navbar = ({ onToggleSidebar, isSidebarOpen }) => { 

    const [isLogin, setLogin] = useState();
    
    const sidebarWidthClass = 'md:mr-96'; 

    const navbarContainerClasses = `
        fixed top-0 left-0 right-0 z-50 bg-white shadow-md transition-margin duration-300 ease-in-out 
        ${isSidebarOpen ? sidebarWidthClass : ''}
    `;

    // Assitant button
    const AgentButton = () => (
        <button
            onClick={onToggleSidebar} // Call to function open/close
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
            <p>Tu asistente</p>
        </button>
    );

    return (
        <div className={navbarContainerClasses}> 
            {/* If the user is login*/}
            {isLogin && 
                <div className='flex justify-around items-center p-4'>
                    <div className='cursor-pointer'><h1 className='text-4xl text-primary-500 font-bold'>Allure</h1></div>
                    
                    <div className='w-1/2 max-w-lg'>
                        <input 
                            type="text" 
                            placeholder='Busca y elije tu siguiente artículo...'
                            className='bg-terciary-400 text-gray-800 w-full px-4 py-2 rounded-full'/>
                    </div>
                    
                    <div className='flex gap-4 items-center'> 
                        <div className='flex gap-6 justify-between text-primary-500 font-bold'>
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

                        <AgentButton />
                    </div>
                </div>}
                
            {/* If the user isn't logged */}
            {!isLogin && 
                <div className='flex justify-around items-center p-4'>
                    <div className='cursor-pointer'><h1 className='text-4xl text-primary-500 font-bold'>Allure</h1></div>
                    
                    <div className='w-1/2 m-1 max-w-lg'>
                        <input 
                            type="text" 
                            placeholder='Busca y elije tu siguiente artículo...'
                            className='bg-terciary-400 text-black w-full px-4 py-2 rounded-full'/>
                    </div>
                    
                    <div className='flex gap-6 items-center'>
                        <CustomButton text='Iniciar Sesión' style='secondary' route='/auth/login' />
                        <CustomButton text='Regístrate' style='secondary' route='/auth/signup' />

                        <AgentButton />
                    </div>
                </div>}
        </div>
    );
};

export default Navbar;