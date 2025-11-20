import { useEffect } from 'react';
import CustomButton from '../components/UI/CustomButton';
import SadCat from '../assets/sadcat.jpg';

const Logout = () => {

    useEffect(() => {
        // Clear stored session
        localStorage.removeItem('token');
        localStorage.removeItem('user');    
    }, []);

    const handleRedirectToLogin = () => {
        window.location.href = './Login';
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">

            <div className="allure-card w-full max-w-2xl text-center">

                <h2 className="allure-title mb-6">
                    Sesión cerrada
                </h2>

                <p className="text-lg text-dark-500 mb-8">
                    Esperamos verte pronto de nuevo.
                </p>

                {/*Sad cat image*/}
                <img
                    src={SadCat} 
                    alt="Sad Cat"
                    className="mx-auto mb-10 rounded-xl shadow-lg w-72 h-auto object-cover"
                />

                <CustomButton 
                    text="Volver al inicio de sesión" 
                    onClick={handleRedirectToLogin} 
                />

            </div>
        </div>
    );
}; 

export default Logout;
