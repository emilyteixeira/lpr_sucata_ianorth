import React, { createContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../src/config';

interface User {
    matricula: string;
    nome: string;
    role: string;
    cargo: string;
}

interface AuthContextType {
    user: User | null;
    login: (loginId: string, p: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('lpr_token');
        const savedUser = localStorage.getItem('lpr_user');
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (loginId: string, password: string) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: loginId, password }) 
        });
        
        if (!res.ok) throw new Error("Usuário ou senha incorretos");
        
        const data = await res.json();
        
        // Se o Backend enviar o objeto quebrado, nós consertamos na hora!
        let cargoCorrigido = "Classificador";
        if (typeof data.user.cargo === 'string') {
            cargoCorrigido = data.user.cargo;
        } else if (typeof data.user.cargo === 'object' && data.user.cargo !== null) {
            cargoCorrigido = data.user.cargo.cargo || "Classificador";
        }

        const usuarioSeguro = {
            ...data.user,
            cargo: cargoCorrigido
        };
        // ================================================================

        localStorage.setItem('lpr_token', data.access_token);
        localStorage.setItem('lpr_user', JSON.stringify(usuarioSeguro));
        setUser(usuarioSeguro);
    };

    const logout = () => {
        localStorage.removeItem('lpr_token');
        localStorage.removeItem('lpr_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
