import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api';
import './RegisterPage.scss';

export default function RegisterPage({ onLogin }) {
    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        setLoading(true);

        try {
            const { confirmPassword, ...userData } = formData;
            await api.register(userData);
            onLogin?.();
            navigate('/products');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка при регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Регистрация</h1>
                
                {error && <div className="auth-error">{error}</div>}
                
                <form onSubmit={handleSubmit} className="auth-form">
                    <label className="auth-label">
                        Email
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="auth-input"
                            placeholder="your@email.com"
                        />
                    </label>

                    <div className="auth-row">
                        <label className="auth-label">
                            Имя
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                required
                                className="auth-input"
                                placeholder="Иван"
                            />
                        </label>

                        <label className="auth-label">
                            Фамилия
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                required
                                className="auth-input"
                                placeholder="Иванов"
                            />
                        </label>
                    </div>

                    <label className="auth-label">
                        Пароль
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="auth-input"
                            placeholder="••••••••"
                        />
                    </label>

                    <label className="auth-label">
                        Подтверждение пароля
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            className="auth-input"
                            placeholder="••••••••"
                        />
                    </label>

                    <button 
                        type="submit" 
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </button>
                </form>

                <p className="auth-footer">
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
                </p>
            </div>
        </div>
    );
}