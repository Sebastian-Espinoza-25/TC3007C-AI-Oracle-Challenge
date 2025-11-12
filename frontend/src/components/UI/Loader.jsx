import React from "react";

const Loader = ({
  message = "Estamos preparando algo asombroso",
  color = "#24217A",
  textColor = "#4B5563" // gris predeterminado (text-gray-600)
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      {/* Spinner central */}
      <div className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 border-8 border-gray-200 rounded-full"></div>
        <div
          className="absolute inset-0 border-8 rounded-full animate-spin"
          style={{ borderTopColor: color }}
        ></div>
      </div>

      {/* Texto rebotando */}
      <div className="flex space-x-1 text-xl font-semibold"
           style={{ color: textColor }}>
        <span className="animate-bounce">C</span>
        <span className="animate-bounce [animation-delay:0.1s]">a</span>
        <span className="animate-bounce [animation-delay:0.2s]">r</span>
        <span className="animate-bounce [animation-delay:0.3s]">g</span>
        <span className="animate-bounce [animation-delay:0.4s]">a</span>
        <span className="animate-bounce [animation-delay:0.5s]">n</span>
        <span className="animate-bounce [animation-delay:0.6s]">d</span>
        <span className="animate-bounce [animation-delay:0.7s]">o</span>
        <span className="animate-bounce [animation-delay:0.8s]">.</span>
        <span className="animate-bounce [animation-delay:0.9s]">.</span>
        <span className="animate-bounce [animation-delay:1s]">.</span>
      </div>

      {/* Mensaje dinámico */}
      <p className="mt-4 font-medium italic animate-pulse"
         style={{ color: textColor }}>
        {message}
      </p>
    </div>
  );
};

export default Loader;
