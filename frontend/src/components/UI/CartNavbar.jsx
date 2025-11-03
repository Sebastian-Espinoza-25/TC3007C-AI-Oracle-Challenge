import React, { useState } from 'react';

import { AiOutlineHome } from "react-icons/ai";
import { MdOutlineShoppingCart } from "react-icons/md";
import { RiAccountCircleLine, RiMenuLine, RiCloseLine, RiSearchLine } from "react-icons/ri";
import { useNavigate } from 'react-router-dom';

const CartNavbar = () => { 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = useNavigate();

  const navbarContainerClasses = `
    fixed top-0 left-0 right-0 z-50 bg-white shadow-md 
    transition-all duration-300 ease-in-out
  `;

  // --- Sub-components ---
  const LoggedInLinks = () => (
    <div className='hidden md:flex gap-6 justify-between text-primary-500 font-bold mr-[158px]'>
      <a href="#" className='flex flex-col justify-center items-center cursor-pointer' onClick={() => navigate('/')}>
        <AiOutlineHome className='w-[30px] h-[30px]'/>
        <p className='text-xs m-1'>Inicio</p>
      </a>
      <a href="#" className='flex flex-col justify-center items-center cursor-pointer'>
        <MdOutlineShoppingCart className='w-[30px] h-[30px]'/>
        <p className='text-xs m-1'>Carrito</p>
      </a>
      <a href="#" className='flex flex-col justify-center items-center cursor-pointer'>
        <RiAccountCircleLine className='w-[30px] h-[30px]'/>
        <p className='text-xs m-1'>Perfil</p>
      </a>
    </div>
  );

  const SearchInput = () => (
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
      aria-label='Abrir menú'
    >
      {isMenuOpen ? <RiCloseLine className='w-8 h-8' /> : <RiMenuLine className='w-8 h-8' />}
    </button>
  );
  // ----------------------

  return (
    <div className={navbarContainerClasses}> 
      <div className='flex justify-between items-center p-4'>
        
        {/* 1) Sección izquierda: Logo (desktop) / Hamburguesa + búsqueda (mobile) */}
        <div className='flex items-center gap-4'> 
          {/* Logo desktop */}
          <div className='cursor-pointer hidden md:block' onClick={() => navigate('/')}>
            <h1 className='text-4xl text-primary-500 font-bold'>Allure</h1>
          </div>

          {/* Mobile: menú + icono búsqueda */}
          <div className='flex items-center gap-2 md:hidden'>
            <MenuButton />
            <MobileSearchIcon />
          </div>
        </div>

        {/* 2) Centro: buscador (desktop) */}
        <SearchInput />

        {/* 3) Derecha: links solo para usuarios loggeados */}
        <div className='flex gap-4 items-center'> 
          <LoggedInLinks />
        </div>
        
        {/* 4) Logo centrado en mobile */}
        <div className='cursor-pointer md:hidden absolute left-1/2 transform -translate-x-1/2'>
          <h1 className='text-4xl text-primary-500 font-bold'>Allure</h1>
        </div>
      </div>

      {/* Menú móvil para usuarios loggeados */}
      {isMenuOpen && (
        <div className='md:hidden absolute top-full left-0 right-0 bg-white shadow-xl flex flex-col items-center py-4 border-t border-gray-200'>
          <div className='w-full flex flex-col text-primary-500 font-bold'>
            <a href="#" className='flex items-center p-3 hover:bg-gray-100 border-b'>
              <AiOutlineHome className='mr-2' /> Inicio
            </a>
            <a href="#" className='flex items-center p-3 hover:bg-gray-100 border-b'>
              <MdOutlineShoppingCart className='mr-2' /> Carrito
            </a>
            <a href="#" className='flex items-center p-3 hover:bg-gray-100'>
              <RiAccountCircleLine className='mr-2' /> Perfil
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartNavbar;