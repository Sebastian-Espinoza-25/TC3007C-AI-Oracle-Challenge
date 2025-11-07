import React, { createContext, useContext, useState, useEffect } from 'react';

// ====================================================================
// 1. CREACIÓN DEL CONTEXTO Y EL CUSTOM HOOK (CONSUMIDOR)
// ====================================================================

// Creamos el Contexto
const AuthContext = createContext();

// Creamos un Custom Hook para usar el Contexto fácilmente
export const useAuth = () => {
    const context = useContext(AuthContext);
    
    // Comprobación de seguridad: asegura que useAuth se use dentro del Provider
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider. Revisa que tu componente esté envuelto.');
    }
    return context;
};

// ====================================================================
// 2. EL COMPONENTE PROVEEDOR (PROVIDER)
// ====================================================================

export const AuthProvider = ({ children }) => {
    
    // ESTADO
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);
    const [user, setUser] = useState(() => {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    });
    // Determinar si está logueado basado en la existencia del token
    const [isLoggedIn, setIsLoggedIn] = useState(!!token); 

    // FUNCIÓN DE LOGIN
    const login = (newToken, userData) => {
        // Actualizar el estado
        setToken(newToken);
        setUser(userData);
        setIsLoggedIn(true);

        // Persistir en el almacenamiento local
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    // FUNCIÓN DE LOGOUT
    const logout = () => {
        // Limpiar el estado
        setToken(null);
        setUser(null);
        setIsLoggedIn(false);

        // Limpiar el almacenamiento local
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };
    
    // VALORES DEL CONTEXTO
    const contextValue = {
        token,
        user,
        isLoggedIn,
        login, 
        logout,
        // Puedes añadir aquí otras funciones de la API
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};