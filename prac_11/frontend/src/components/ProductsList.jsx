import React from 'react';

export default function ProductsList({ products, onEdit, onDelete }) {
    if (!products || products.length === 0) {
        return <div className="empty">Товары отсутствуют</div>;
    }

    return (
        <div className="grid">
            {products.map(product => (
                <div key={product.id} className="card">
                    <div className="card__top">
                        <div>
                            <div className="card__title">{product.title}</div>
                            <div className="card__meta">{product.category}</div>
                        </div>
                        <div className="card__actions">
                            <button 
                                className="btn btn--ghost" 
                                onClick={() => onEdit(product)}
                                title="Редактировать"
                            >
                                ✏️
                            </button>
                            <button 
                                className="btn btn--danger" 
                                onClick={() => onDelete(product.id)}
                                title="Удалить"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                    
                    {product.description && (
                        <div className="card__desc">{product.description}</div>
                    )}
                    
                    <div className="card__bottom">
                        <span className="badge">
                            {product.price.toLocaleString()} ₽
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}