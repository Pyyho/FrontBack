import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductsPage.scss';
import ProductsList from '../../components/ProductsList';
import ProductModal from '../../components/ProductModal';
import { api } from '../../api';

export default function ProductsPage({ onLogout }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingProduct, setEditingProduct] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const navigate = useNavigate();
    const user = api.getCurrentUser();

    useEffect(() => {
        loadProducts();
        loadUserInfo();
    }, []);

    const loadUserInfo = async () => {
        try {
            const userData = await api.getCurrentUserInfo();
            setUserInfo(userData);
            // Обновляем сохраненного пользователя
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (err) {
            console.error('Ошибка загрузки информации о пользователе:', err);
        }
    };

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await api.getProducts();
            setProducts(data);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) {
                await api.logout();
                navigate('/login');
            } else {
                alert('Ошибка загрузки товаров');
            }
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setModalMode('create');
        setEditingProduct(null);
        setModalOpen(true);
    };

    const openEdit = product => {
        setModalMode('edit');
        setEditingProduct(product);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingProduct(null);
    };

    const handleDelete = async id => {
        const ok = window.confirm('Удалить товар?');
        if (!ok) return;

        try {
            await api.deleteProduct(id);
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error(err);
            alert('Ошибка удаления товара');
        }
    };

    const handleSubmitModal = async payload => {
        try {
            if (modalMode === 'create') {
                const newProduct = await api.createProduct(payload);
                setProducts(prev => [...prev, newProduct]);
            } else {
                const updatedProduct = await api.updateProduct(payload.id, payload);
                setProducts(prev =>
                    prev.map(p => (p.id === payload.id ? updatedProduct : p))
                );
            }
            closeModal();
        } catch (err) {
            console.error(err);
            alert('Ошибка сохранения товара');
        }
    };

    const handleLogout = async () => {
        await api.logout();
        onLogout?.();
        navigate('/login');
    };

    // Получаем имя для отображения (из userInfo или из localStorage)
    const displayName = userInfo 
        ? `${userInfo.first_name} ${userInfo.last_name}`
        : user 
            ? `${user.first_name} ${user.last_name}`
            : 'Пользователь';

    return (
        <div className='page'>
            <header className='header'>
                <div className='header__inner'>
                    <div className='brand'>Sport Shop</div>
                    <div className='header__right'>
                        <div className='user-info'>
                            <span className='user-name'>{displayName}</span>
                            <span className='user-email'>{userInfo?.email || user?.email}</span>
                        </div>
                        <button 
                            className='btn btn--ghost' 
                            onClick={handleLogout}
                        >
                            Выйти
                        </button>
                    </div>
                </div>
            </header>

            <main className='main'>
                <div className='container'>
                    <div className='toolbar'>
                        <h1 className='title'>Товары</h1>
                        <button className='btn btn--primary' onClick={openCreate}>
                            + Добавить товар
                        </button>
                    </div>

                    {loading ? (
                        <div className='empty'>Загрузка...</div>
                    ) : (
                        <ProductsList
                            products={products}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </main>

            <footer className='footer'>
                <div className='footer__inner'>
                    © {new Date().getFullYear()} Sport Shop
                </div>
            </footer>

            <ProductModal
                open={modalOpen}
                mode={modalMode}
                initialProduct={editingProduct}
                onClose={closeModal}
                onSubmit={handleSubmitModal}
            />
        </div>
    );
}