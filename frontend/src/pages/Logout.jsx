import React, { useEffect } from 'react';
import CustomButton from '../components/UI/CustomButton';
import SadCat from '../assets/sadcat.jpg';

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
        <div className="flex items-center justify-center h-screen bg-gray-50 px4">
            <div className="bg-white shadow-2xl rounded-2xl p-16 w-full max-w-2xl text-center">
                <h2 className="text-4xl font-bold mb-6">
                    Sesión cerrada
                </h2>
                <p className="text-lg mb-10">
                    Esperamos verte pronto de nuevo.
                </p>
                {/* Sad cat image */}
                <img
                    src={SadCat} 
                    alt="Sad Cat"
                    className="mx-auto mb-10 rounded-lg shadow-md w-80 h-auto object-cover"
                />

                <CustomButton text="Volver al inicio de sesión" onClick={habdleRedirectToLogin} />
            </div>
        </div>

    );


}; 
export default Logout;