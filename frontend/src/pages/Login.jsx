import React, { useState } from 'react';
import CustomButton from '../components/UI/CustomButton';
import { useAuth } from '../contexts/AuthContext';
// 🟢 NUEVO: importar toastify
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
    <div className="flex items-center justify-center h-[100vh] bg-gray-50 px-6">
      <div className="bg-white shadow-2xl rounded-2xl p-16 w-full max-w-2xl">
        <h2 className="text-4xl font-bold text-center mb-10">
          Iniciar sesión
        </h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-8 text-lg">
          <input
            type="email"
            placeholder="Correo electrónico"
            className="border p-4 rounded text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="border p-4 rounded text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <CustomButton text="Entrar" type="submit" />
        </form>
        <p className="text-medium text-center mt-6">
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
