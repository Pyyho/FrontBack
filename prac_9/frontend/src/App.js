import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProductsPage from './pages/ProductsPage/ProductsPage';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import { api } from './api';
import './App.css';

function App() {
    const handleLogin = () => {
        // Можно добавить логику после логина
    };

    const handleLogout = () => {
        // Можно добавить логику после выхода
    };

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
                <Route 
                    path="/products" 
                    element={
                        <ProtectedRoute>
                            <ProductsPage onLogout={handleLogout} />
                        </ProtectedRoute>
                    } 
                />
                <Route path="/" element={<Navigate to="/products" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;