import React from 'react';
import { FaFacebookF, FaInstagram, FaTwitter } from 'react-icons/fa'; 

const Footer = ({ isSidebarOpen }) => { 
    const shopLinks = [
        { name: 'Novedades', href: '/new-arrivals' },
        { name: 'Mujer', href: '/women' },
        { name: 'Hombre', href: '/men' },
        { name: 'Accesorios', href: '/accessories' },
    ];

    const helpLinks = [
        { name: 'Contacto', href: '/contact' },
        { name: 'FAQs', href: '/faqs' },
        { name: 'Envíos y Devoluciones', href: '/shipping-returns' },
        { name: 'Guía de tallas', href: '/size-guide' },
    ];

    const LinkColumn = ({ title, links }) => (
        <div className="flex flex-col space-y-3">
            <h4 className="text-xl font-extrabold text-black mb-1">{title}</h4>
            {links.map((link, index) => (
                <a 
                    key={index} 
                    href={link.href} 
                    className="text-base text-gray-700 hover:text-black transition-colors duration-150"
                >
                    {link.name}
                </a>
            ))}
        </div>
    );
    
    const sidebarWidthClass = 'md:mr-96'; 

    // Styles applied to footer
    const footerClasses = `
        bg-neutral-50 pt-16 transition-margin duration-300 ease-in-out
        ${isSidebarOpen ? sidebarWidthClass : ''}
    `;

    return (
        <footer className={footerClasses}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12">
                    
                    <div className="space-y-3">
                        <h3 className="text-2xl font-extrabold text-black">Allure</h3>
                        <p className="text-base text-gray-700">
                            Tu tienda de moda inteligente.
                        </p>
                    </div>

                    <LinkColumn title="Tienda" links={shopLinks} />

                    <LinkColumn title="Ayuda" links={helpLinks} />
                    
                    <div className="flex flex-col space-y-4">
                        <h4 className="text-xl font-extrabold text-black">Síguenos</h4>
                        <div className="flex space-x-4">
                            <a 
                                href="https://facebook.com" 
                                aria-label="Facebook"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-black hover:text-gray-700 transition-colors"
                            >
                                <FaFacebookF className="h-6 w-6 p-1 border-2 border-black" />
                            </a>
                            <a 
                                href="https://instagram.com" 
                                aria-label="Instagram"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-black hover:text-gray-700 transition-colors"
                            >
                                <FaInstagram className="h-6 w-6 p-1 border-2 border-black" />
                            </a>
                            <a 
                                href="https://twitter.com" 
                                aria-label="Twitter"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-black hover:text-gray-700 transition-colors"
                            >
                                <FaTwitter className="h-6 w-6 p-1 border-2 border-black" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-300 pt-6 pb-8">
                    <p className="text-center text-sm text-gray-500">
                        © 2025 Allure. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;