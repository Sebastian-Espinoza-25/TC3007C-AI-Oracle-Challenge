import React from 'react';
import CustomButton from '../components/UI/CustomButton';
import { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Intento de login con:", email, password);
  };

  return (
    <div>
      <div className="flex flex-col items-center justify-center h-[80vh] bg-gray-50">
        <div className="bg-white shadow-md rounded-lg p-8 w-[400px]">
          <h2 className="text-2xl font-semibold text-center mb-6">Iniciar sesión</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              className="border p-2 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="border p-2 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <CustomButton text="Entrar" type="submit" />
          </form>
          <p className="text-sm text-center mt-4">
            ¿No tienes cuenta?{' '}
            <span className="text-primary-500 cursor-pointer" onClick={() => window.location.href='./SignUp'}>
              Regístrate
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};



export default Login;
