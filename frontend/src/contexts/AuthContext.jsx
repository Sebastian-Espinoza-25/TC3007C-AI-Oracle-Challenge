import React, { createContext, useContext, useState, useEffect } from 'react';

//Create context
const AuthContext = createContext();

//Custom hook to use the AuthContext
export const useAuth = () => {
    return useContext(AuthContext);
};

//(Provider)
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
    const [isLoggedIn, setIsLoggedIn] = useState(!!token); 

    // Function that will be called on login 
    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        setIsLoggedIn(true);

        //Local storage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    //Logout
    const logout = () => {
        //Clean
        setToken(null);
        setUser(null);
        setIsLoggedIn(false);

        //Clean local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };
    
    
    const contextValue = {
        token,
        user,
        isLoggedIn,
        login, 
        logout,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};