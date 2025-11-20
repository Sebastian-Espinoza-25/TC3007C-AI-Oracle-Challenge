import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "react-toastify";

//Create context
const AuthContext = createContext();

//Custom hook to use the AuthContext
export const useAuth = () => {
    return useContext(AuthContext);
};

//Function to decode the jwt
const decodeToken = (token) => {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
};
//(Provider)
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
    const [isLoggedIn, setIsLoggedIn] = useState(!!token); 
    const [logoutTimer, setLogoutTimer] = useState(null);

    // Function that will be called on login 
    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        setIsLoggedIn(true);

        //Local storage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));

        scheduleLogout(newToken);
    };

    //Logout
    const [hasExpired, setHasExpired] = useState(false);

    const logout = (fromExpiration = false) => {
        if (fromExpiration) {
            if(!hasExpired){
                setHasExpired(true); 
                toast.info("Tu sesión ha expirado. Vuelve a iniciar sesión.");
                setTimeout(() =>{
                    window.location.href="/auth/login";}, 3000)
            }
        }

        setToken(null);
        setUser(null);
        setIsLoggedIn(false);

        localStorage.removeItem('token');
        localStorage.removeItem('user');

        if (logoutTimer) clearTimeout(logoutTimer);
    
    };

    const scheduleLogout = (jwt) => {
        const decoded = decodeToken(jwt);
        if (!decoded?.exp) return;

        const timeLeft = decoded.exp * 1000 - Date.now();
        if (timeLeft <= 0) {
            logout(true);
            return;
        }

        const timer = setTimeout(() => logout(true), timeLeft);
        setLogoutTimer(timer);
    };

    useEffect(() => {
        if (token) {
            const decoded = decodeToken(token);

            if (decoded?.exp * 1000 < Date.now()) {
                logout(true);
            } else {
                scheduleLogout(token);
            }
        }
    }, []);
    
    
    const contextValue = {
        token,
        user,
        isLoggedIn,
        login, 
        logout,
    };

    return (
        <AuthContext.Provider value={{ token, user, isLoggedIn, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};