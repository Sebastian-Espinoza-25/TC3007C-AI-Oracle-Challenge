import { useNavigate } from "react-router";

/**
 * Default Styles for button
 */
const styles = {
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

const CustomButton = ({
    text = "Default button",
    style = "primary",
    extraStyles = "",
    type = "button",
    onClick,
    route
}) => {
  const navigate = useNavigate();

  const baseStyle = styles[style] !== undefined ? styles[style] : styles.primary;
  
  const clase = `${baseStyle} ${extraStyles}`;

  /**
   * Manage the click to decide if navigate or execute some function predetermination
   */
  const handleClick = (e) => {
    if (route) {
      e.preventDefault(); // Prevents default behaviour
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