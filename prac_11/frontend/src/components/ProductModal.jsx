import React, { useState, useEffect } from 'react';

export default function ProductModal({ 
    open, 
    mode, 
    initialProduct, 
    onClose, 
    onSubmit 
}) {
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        price: ''
    });

    useEffect(() => {
        if (mode === 'edit' && initialProduct) {
            setFormData({
                title: initialProduct.title || '',
                category: initialProduct.category || '',
                description: initialProduct.description || '',
                price: initialProduct.price || ''
            });
        } else {
            setFormData({
                title: '',
                category: '',
                description: '',
                price: ''
            });
        }
    }, [mode, initialProduct, open]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const payload = {
            ...formData,
            price: Number(formData.price)
        };
        
        if (mode === 'edit' && initialProduct) {
            payload.id = initialProduct.id;
        }
        
        onSubmit(payload);
    };

    if (!open) return null;

    return (
        <div className="backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal__header">
                    <span className="modal__title">
                        {mode === 'create' ? 'Новый товар' : 'Редактировать товар'}
                    </span>
                    <button className="iconBtn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="label">
                        Название *
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className="input"
                            placeholder="Введите название"
                        />
                    </label>

                    <label className="label">
                        Категория *
                        <input
                            type="text"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            required
                            className="input"
                            placeholder="Введите категорию"
                        />
                    </label>

                    <label className="label">
                        Описание
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="input"
                            rows="3"
                            placeholder="Введите описание (необязательно)"
                        />
                    </label>

                    <label className="label">
                        Цена *
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            required
                            min="0"
                            step="1"
                            className="input"
                            placeholder="Введите цену"
                        />
                    </label>

                    <div className="modal__footer">
                        <button type="button" className="btn" onClick={onClose}>
                            Отмена
                        </button>
                        <button type="submit" className="btn btn--primary">
                            {mode === 'create' ? 'Создать' : 'Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}