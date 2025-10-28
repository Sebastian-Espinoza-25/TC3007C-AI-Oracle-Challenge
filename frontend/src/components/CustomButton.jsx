import { useNavigate } from "react-router";

/**
 * Estilos base para cada tipo de botón predefinido.
 */
const estilos = {
  primary:
    "bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-4 rounded cursor-pointer hover:scale-105",
  secondary:
    "bg-primary-500 flex justify-center items-center border-2 border-gray-50 rounded-[5px] text-white py-2 px-4 cursor-pointer hover:scale-105",
  terciary:
    "bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer hover:scale-105",
  cancel:
    "border [border-color:#02245a] [color:#02245a] bg-white hover:bg-blue-50 font-medium py-2 px-4 rounded cursor-pointer transition-colors duration-150",
  warning:
    "bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded cursor-pointer hover:scale-105",
  normal: "",
};

/**
 * Componente reutilizable para renderizar un botón estilizado, con soporte para navegación o acción personalizada.
 *
 * @param {Object} props
 * @param {string|JSX.Element} props.text - text o contenido que se muestra dentro del botón.
 * @param {function} [props.onClick] - Función a ejecutar al hacer clic si no se especifica una ruta.
 * @param {string} [props.tipo="primario"] - Tipo de botón, que determina el estilo visual (primario, secundario, cancel, peligro, etc.).
 * @param {string} [props.extraClases=""] - Clases adicionales para extender o sobrescribir estilos.
 * @param {string} [props.ruta] - Ruta de navegación (usa react-router) a la que se redirige si se especifica.
 * @param {string} [props.type="button"] - Tipo del botón HTML (por defecto es "button").
 * @returns {JSX.Element} Botón estilizado con comportamiento dinámico.
 */
const CustomButton = ({
    text = "Default button",
    style = "primary",
    extraStyles = "",
    type = "button",
    onClick,
    route
}) => {
  const navigate = useNavigate();
  const clase = `${estilos[style] || estilos.primario} ${extraStyles}`;

  /**
   * Maneja el clic para decidir si se navega o se ejecuta una función personalizada.
   */
  const handleClick = (e) => {
    if (route) {
      e.preventDefault(); // Previene que un botón con type="submit" recargue si es necesario
      navigate(route);
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <button type={type} className={clase} onClick={handleClick}>
      {text}
    </button>
  );
};

export default CustomButton;