import React from 'react';
import CustomButton from '../components/UI/CustomButton';
import { useState } from 'react';


const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const API_URL=import.meta.env.VITE_API_URL;

  const handleLogin = async(e) => {
    e.preventDefault();
    try{
      const response= await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password}),
      });

      alert(response)

      if(!response.ok){
        throw new Error('Error en la autenticación');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to home page after successful login
      window.location.href = '/';
    } catch (error){
      console.error('Error during login:', error);
      alert('Error al iniciar sesión. Por favor, verifica tus credenciales e intenta de nuevo.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center h-[100vh] bg-gray-50 px-6">
        <div className="bg-white shadow-2xl rounded-2xl p-16 w-full max-w-2xl">
          <h2 className="text-4xl font-bold text-center mb-10">
            Iniciar sesión
          </h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-8 text-lg">
            <input
              type="email"
              placeholder="Correo electrónico"
              className="border p-4 rounded text-lg text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="border p-4 rounded text-lg text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <CustomButton text="Entrar" type="submit" />
          </form>
          <p className="text-medium text-center mt-6">
            ¿No tienes cuenta?{' '}
            <span 
              className="text-primary-500 cursor-pointer hover:underline front-medium"
              onClick={() => window.location.href='./SignUp'}>
              Regístrate
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};



export default Login;
