import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface LoginProps {
    onLogin: (token: string, username: string) => void;
    /** Aviso a mostrar arriba del formulario (ej. "Tu sesión expiró"). */
    notice?: string | null;
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

export default function Login({ onLogin, notice }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Credenciales incorrectas');
                return;
            }

            onLogin(data.token, data.username);
        } catch (err) {
            setError('Error de conexión con el servidor');
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        Acceso Restringido
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Ingresa tus credenciales de administrador
                    </p>
                </div>
                {notice && (
                    <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium text-center px-4 py-3 rounded-xl">
                        {notice}
                    </div>
                )}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label className="sr-only">Usuario</label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                                placeholder="Usuario"
                            />
                        </div>
                        <div>
                            <label className="sr-only">Contraseña</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                                placeholder="Contraseña"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
                        >
                            Iniciar Sesión
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
