import React, { useEffect } from 'react';
import CustomButton from '../components/UI/CustomButton';

// This is the logout page. It redirects the user to the login page after logging out. 

const Logout = () => {
    useEffect(() => {
        //Clearer user token 
        localStorage.removeItem('token');
        localStorage.removeItem('user');    
    }, []);

    const habdleRedirectToLogin = () => {
        window.location.href = './Login';
    };

    return (
        <div className="flex flex-col items-center justify-center h-[80vh] bg-gray-50">
            <div className="bg-white shadow-md rounded-lg p-8 w-[400px] text-center">
                <h2 className="text-2xl font-semibold mb-6">Sesión cerrada</h2>
                <p className="mb-6">Has cerrado sesión correctamente</p>
                <CustomButton text="Volver al inicio de sesión" onClick={habdleRedirectToLogin} />
            </div>
        </div>

    );


}; 
export default Logout;