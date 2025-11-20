import { useState } from 'react';
import CustomButton from '../components/UI/CustomButton';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Error en la autenticación');
      }

      const data = await response.json();
      login(data.access_token, data.user);

      toast.success('Inicio de sesión exitoso. Redirigiendo a la página principal...', {
        icon: '✅',
      });

      setTimeout(() => {
        window.location.href = '/';
      }, 3000);

    } catch (error) {
      console.error('Error durante el login:', error);
      toast.error('Error al iniciar sesión. Verifica tus credenciales e intenta de nuevo.', {
        icon: '⚠️',     
      });
    }
  };

  return (
  <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-6">
      <div className="allure-card w-full max-w-2xl">

        <h2 className="allure-title">
          Iniciar sesión
        </h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-8 text-lg">

          <input
            type="email"
            placeholder="Correo electrónico"
            className="allure-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="allure-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <CustomButton text="Entrar" type="submit" />
        </form>

        <p className="text-medium text-center mt-6 text-dark-500">
          ¿No tienes cuenta?{' '}
          <span 
            className="text-primary-500 cursor-pointer hover:underline font-medium"
            onClick={() => window.location.href='./SignUp'}>
            Regístrate
          </span>
        </p>
      </div>
    </div>
  );

};

export default Login;
