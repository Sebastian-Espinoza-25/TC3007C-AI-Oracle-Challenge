import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import CustomButton from "./CustomButton";
import SearchBar from "./SearchBar";
import { useAuth } from "../../contexts/AuthContext";

import { AiOutlineHome } from "react-icons/ai";
import { MdOutlineShoppingCart } from "react-icons/md";
import {
  RiAccountCircleLine,
  RiMenuLine,
  RiCloseLine,
  RiSearchLine,
  RiLogoutBoxLine,
  RiRobot2Line,
  RiPaintBrushLine
} from "react-icons/ri";

const Navbar = ({ onToggleSidebar, isSidebarOpen, featuredProducts }) => {
  const { isLoggedIn, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isAuthPage = currentPath.startsWith("/auth");
  const isCartPage = currentPath.startsWith("/cart");
  const isCheckoutPage = currentPath.startsWith("/checkout");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const showAuthButtons = !isLoggedIn && !isAuthPage;

  const sidebarWidthClass = "md:mr-96";

  const navbarContainerClasses = `
        fixed top-0 left-0 right-0 z-50 bg-white shadow-md 
        transition-margin duration-300 ease-in-out 
        ${isSidebarOpen ? sidebarWidthClass : ""}  
    `;

  // =======================
  //    COMPONENTES EXTRA
  // =======================

  /** Nuevo botón ATELIER */
  const AtelierButton = () => {
    if (!isLoggedIn || isAuthPage || isCartPage || isCheckoutPage) return null;

    return (
      <button
        onClick={() => navigate("/atelier")}
        className="
          flex flex-col items-center p-2 rounded-md
          transition-all duration-300 ease-in-out
          text-white font-bold text-xs cursor-pointer
          bg-primary-500 hover:bg-blue-700
        "
        title="Ir a Atelier"
      >
        <RiPaintBrushLine className="w-[25px] h-[25px] mr-1" />
        <p className="text-sm">Atelier</p>
      </button>
    );
  };

  /** Botón del asistente */
  const AgentButton = () => {
    const isDisabled = isAuthPage;

    return (
      <button
        onClick={() => !isDisabled && onToggleSidebar()}
        className={`
          ${isLoggedIn ? "flex flex-col" : "flex"} 
          items-center p-2 rounded-md
          transition-all duration-300 ease-in-out
          text-white font-bold text-xs cursor-pointer
          ${
            isSidebarOpen
              ? "bg-red-500 hover:bg-red-600"
              : "bg-violet-600 hover:bg-violet-700"
          }
        `}
        title={isSidebarOpen ? "Cerrar Asistente" : "Abrir Asistente AI"}
        disabled={isDisabled}
      >
        <RiRobot2Line className="w-[25px] h-[25px] mr-1" />
        <p className="text-sm">{isSidebarOpen ? "Cerrar" : "Asistente"}</p>
      </button>
    );
  };

  const LoggedInLinks = () => (
    <div className="hidden md:flex gap-6 justify-between text-primary-500 font-bold">
      <Link to="/" className="flex flex-col justify-center items-center cursor-pointer">
        <AiOutlineHome className="w-[30px] h-[30px]" />
        <p className="text-xs m-1">Inicio</p>
      </Link>

      <Link to="/cart" className="flex flex-col justify-center items-center cursor-pointer">
        <MdOutlineShoppingCart className="w-[30px] h-[30px]" />
        <p className="text-xs m-1">Carrito</p>
      </Link>

      <div className="relative">
        <div
          className="flex flex-col justify-center items-center cursor-pointer"
          onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
        >
          <RiAccountCircleLine className="w-[30px] h-[30px]" />
          <p className="text-xs m-1">Perfil</p>
        </div>

        {isProfileDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-100">
            <div
              className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-md cursor-pointer"
              onClick={handleLogout}
            >
              <RiLogoutBoxLine className="mr-2" /> Cerrar Sesión
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const LoggedOutButtons = () => (
    <div className="hidden md:flex gap-6 items-center">
      <CustomButton text="Iniciar Sesión" style="secondary" route="/auth/login" />
      <CustomButton text="Regístrate" style="secondary" route="/auth/signup" />
    </div>
  );

  const MenuButton = () => (
    <button
      onClick={() => setIsMenuOpen((prev) => !prev)}
      className="p-2 md:hidden text-gray-700 hover:text-primary-500"
    >
      {isMenuOpen ? <RiCloseLine className="w-8 h-8" /> : <RiMenuLine className="w-8 h-8" />}
    </button>
  );

  const handleLogout = () => {
    logout();
    setIsProfileDropdownOpen(false);
    navigate("/auth/logout");
  };

  return (
    <div className={navbarContainerClasses}>
      <div
        className={`flex items-center p-4 ${
          isAuthPage ? "justify-start" : "justify-around"
        }`}
      >
        {/* LEFT */}
        <div className="flex items-center gap-4">
          <div className={`cursor-pointer hidden md:block ${isAuthPage ? "px-4" : ""}`}>
            <Link to="/">
              <h1 className="text-4xl text-primary-500 font-bold">Allure</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <MenuButton />
            {!isAuthPage && (
              <div className="block sm:hidden cursor-pointer p-2 text-gray-700 hover:text-primary-500">
                <RiSearchLine className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>

        {/* CENTER (SearchBar DESACTIVADA en auth pages) */}
        {!isAuthPage && (
          <SearchBar products={featuredProducts} />
        )}

        {/* RIGHT */}
        <div className="flex gap-4 items-center">
          {!isAuthPage && (isLoggedIn ? <LoggedInLinks /> : <LoggedOutButtons />)}

          {/* Nuevo botón ATELIER */}
          <AtelierButton />

          {/* Botón Asistente */}
          {!(isAuthPage || isCartPage || isCheckoutPage) && <AgentButton />}
        </div>

        {/* Mobile Logo */}
        <div className="cursor-pointer md:hidden absolute left-1/2 transform -translate-x-1/2">
          <Link to="/">
            <h1 className="text-4xl text-primary-500 font-bold">Allure</h1>
          </Link>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-xl flex flex-col items-center py-4 border-t border-gray-200">
          {!isAuthPage &&
            (isLoggedIn ? (
              <>
                <div className="w-full flex flex-col text-primary-500 font-bold">
                  <Link
                    to="/"
                    className="flex items-center p-3 hover:bg-gray-100 border-b"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <AiOutlineHome className="mr-2" /> Inicio
                  </Link>
                  <Link
                    to="/cart"
                    className="flex items-center p-3 hover:bg-gray-100 border-b"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <MdOutlineShoppingCart className="mr-2" /> Carrito
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center p-3 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <RiAccountCircleLine className="mr-2" /> Perfil
                  </Link>

                  {/* ATELIER en móvil */}
                  <Link
                    to="/atelier"
                    className="flex items-center p-3 hover:bg-blue-50 border-t"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <RiPaintBrushLine className="mr-2" /> Atelier
                  </Link>

                  <div
                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <RiLogoutBoxLine className="mr-2" /> Cerrar Sesión
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-full flex flex-col p-4 space-y-3">
                  <CustomButton
                    text="Iniciar Sesión"
                    style="secondary"
                    route="/auth/login"
                    extraStyles="w-full py-3"
                  />
                  <CustomButton
                    text="Regístrate"
                    style="secondary"
                    route="/auth/signup"
                    extraStyles="w-full py-3"
                  />
                </div>
              </>
            ))}
        </div>
      )}
    </div>
  );
};

export default Navbar;
