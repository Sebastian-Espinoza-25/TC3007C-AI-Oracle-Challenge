import React from 'react';
import { FiX, FiSend } from 'react-icons/fi';

const SidebarAgent = ({ isOpen, onClose }) => {

    if (!isOpen) {
        return null;
    }

    // Message components
    const UserMessage = ({ text }) => (
        <div className="flex justify-end mb-4">
            <div className="bg-indigo-900 text-white rounded-lg p-3 max-w-xs md:max-w-md shadow-md">
                {text}
            </div>
            <div className="ml-2 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm">
                <FiSend className="transform rotate-45" /> 
            </div>
        </div>
    );

    const AgentMessage = ({ text }) => (
        <div className="flex mb-4 items-start">
            <div className="mr-2 w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-lg p-1">
                🛍️
            </div>
            <div className="bg-gray-100 rounded-lg p-3 max-w-xs md:max-w-md shadow-md border border-gray-200">
                {text}
            </div>
        </div>
    );

    // Utilizamos 'fixed' como lo habías solicitado
    return (
        <div className="fixed top-0 right-0 w-full md:w-96 h-screen bg-white shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h1 className="text-xl font-semibold text-gray-800">Asistente AI</h1>
                <button 
                    onClick={onClose} 
                    className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                    <FiX size={24} />
                </button>
            </div>
            
            {/* Chat Body */}
            <div className="flex-grow p-4 overflow-y-auto">
                <AgentMessage 
                    text="¡Hola! Soy tu asistente de moda. Arrastra un producto aquí o cuéntame qué buscas. ¡Estoy para encontrar tu outfit perfecto!" 
                />
                <UserMessage 
                    text="Busco algo para una boda en la playa." 
                />
                <div className="h-48"></div>
                <UserMessage text="¿Tienes alguna sugerencia de zapatos?" />
                <AgentMessage text="Claro, para la playa te recomiendo sandalias de tiras o alpargatas." />
            </div>
            
            {/* Footer / Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="relative flex items-center">
                    <input 
                        type="text" 
                        placeholder="Escribe tu mensaje..."
                        className="w-full py-3 pl-4 pr-12 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-violet-500"
                    />
                    <button className="absolute right-0 mr-1 p-2 text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition duration-150">
                        <FiSend size={24} />
                    </button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">Arrastra y suelta un producto aquí</p>
            </div>
        </div> 
    );
};

export default SidebarAgent;