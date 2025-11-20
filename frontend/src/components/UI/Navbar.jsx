import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import CustomButton from "./CustomButton";
import { useAuth } from "../../contexts/AuthContext";

// Group icon imports so visual dependencies are easy to scan and maintain
import { AiOutlineHome } from "react-icons/ai";
import { MdOutlineShoppingCart } from "react-icons/md";
import {
  RiAccountCircleLine,
  RiMenuLine,
  RiCloseLine,
  RiSearchLine,
  RiLogoutBoxLine,
  RiRobot2Line,
} from "react-icons/ri";

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => {
  const { isLoggedIn, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Keep auth-related routes visually simpler so users focus on login/signup flows
  const isAuthPage = currentPath.startsWith("/auth");
  // Do not show the AI assistant on cart/checkout to avoid distracting during purchase flow
  const isCartPage = currentPath.startsWith("/cart");
  const isCheckoutPage = currentPath.startsWith("/checkout");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Only show login/register buttons when user is logged out and not already on an auth page
  const showAuthButtons = !isLoggedIn && !isAuthPage;

  // Centralize sidebar margin so layout changes only require edits in one place
  const sidebarWidthClass = "md:mr-96";

  const navbarContainerClasses = `
        fixed top-0 left-0 right-0 z-50 bg-white shadow-md 
        transition-margin duration-300 ease-in-out 
        ${isSidebarOpen ? sidebarWidthClass : ""}  
    `;

  // --- Sub-components ---
  const AgentButton = () => {
    // Switch layout depending on whether auth buttons are visible so things align nicely in both states
    const flexClasses = showAuthButtons
      ? "flex items-center"
      : "flex flex-col items-center justify-center";

    const iconMarginClass = showAuthButtons ? "mr-1" : "mx-auto";

    // Do not allow toggling the assistant while the user is on auth routes
    const isDisabled = isAuthPage;

    const handleToggle = () => {
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
                    ${
                      isSidebarOpen
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-violet-600 hover:bg-violet-700"
                    }
                `}
        title={isSidebarOpen ? "Cerrar Asistente" : "Abrir Asistente AI"}
        disabled={isDisabled}
      >
        <RiRobot2Line className={`w-[25px] h-[25px] ${iconMarginClass}`} />
        {/* Hide text on very small screens to keep the button compact while preserving icon meaning */}
        <p className={`${showAuthButtons ? "text-sm" : "hidden sm:block text-xs"}`}>
          {isSidebarOpen ? "Cerrar" : "Asistente"}
        </p>
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
            <Link
              to="/profile"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsProfileDropdownOpen(false)}
            >
              <RiAccountCircleLine className="mr-2" /> Ver Perfil
            </Link>

            {/* Keep logout inside the dropdown so it is harder to click by mistake */}
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
    // Only show these on desktop to avoid overcrowding the mobile navbar
    <div className="hidden md:flex gap-6 items-center">
      <CustomButton text="Iniciar Sesión" style="secondary" route="/auth/login" />
      <CustomButton text="Regístrate" style="secondary" route="/auth/signup" />
    </div>
  );

  const SearchInput = () => (
    // Hide search input on auth pages to keep the layout focused on authentication
    <div className={`w-1/3 max-w-xl ${isAuthPage ? "hidden" : "hidden sm:block"}`}>
      <input
        type="text"
        placeholder="Busca y elije tu siguiente artículo..."
        className="bg-terciary-400 text-gray-800 w-full px-4 py-2 rounded-full"
      />
    </div>
  );

  const MobileSearchIcon = () =>
    // Do not show search on auth screens in mobile either
    isAuthPage ? null : (
      <div className="block sm:hidden cursor-pointer p-2 text-gray-700 hover:text-primary-500">
        <RiSearchLine className="w-6 h-6" />
      </div>
    );

  const MenuButton = () => (
    // A single toggle for the mobile menu keeps the interaction predictable
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
    // Redirect to a dedicated logout/auth route to run any extra logic there
    navigate("/auth/logout");
  };

  return (
    <div className={navbarContainerClasses}>
      {/* Align content differently on auth pages to visually separate them from the main app */}
      <div
        className={`flex items-center p-4 ${
          isAuthPage ? "justify-start" : "justify-around"
        }`}
      >
        {/* 1. LEFT SECTION: Desktop logo / Mobile menu + search */}
        <div className="flex items-center gap-4">
          <div className={`cursor-pointer hidden md:block ${isAuthPage ? "px-4" : ""}`}>
            <Link to="/">
              <h1 className="text-4xl text-primary-500 font-bold">Allure</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <MenuButton />
            <MobileSearchIcon />
          </div>
        </div>

        {/* 2. CENTER SECTION: Desktop search */}
        <SearchInput />

        {/* 3. RIGHT SECTION: Auth controls and assistant button */}
        <div className="flex gap-4 items-center">
          {/* Avoid duplicating auth UI while already on auth pages */}
          {!isAuthPage && (isLoggedIn ? <LoggedInLinks /> : <LoggedOutButtons />)}

          {/* Keep the assistant out of cart/checkout/auth flows for a simpler mental model */}
          {!(isAuthPage || isCartPage || isCheckoutPage) && <AgentButton />}
        </div>

        {/* 4. MOBILE logo pinned to center to balance the layout with menu on the left */}
        <div className="cursor-pointer md:hidden absolute left-1/2 transform -translate-x-1/2">
          <Link to="/">
            <h1 className="text-4xl text-primary-500 font-bold">Allure</h1>
          </Link>
        </div>
      </div>

      {/* Mobile menu overlay should only show navigation when not on auth routes */}
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
                  <div
                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-md cursor-pointer"
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
