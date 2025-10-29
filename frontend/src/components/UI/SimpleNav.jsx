import React from 'react';
import { useNavigate } from 'react-router-dom';

const SimpleNav = () => {

    const navigate = useNavigate();

    const handleClick = () => {
        navigate("/");
    };

    return (
        <div className='bg-white flex justify-start p-5'>
            <div className='cursor-pointer' onClick={handleClick}><h1 className='text-4xl text-primary-500 font-bold ml-10'>Allure</h1></div>
        </div>
    );
};

export default SimpleNav;