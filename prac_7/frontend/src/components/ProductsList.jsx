import React from 'react'
import ProductCard from './ProductCard'

export default function ProductsList({ products, onEdit, onDelete }) {
  if (!products || products.length === 0) {
    return <div className='empty'>Товаров пока нет</div>
  }

  return (
    <div className='grid'>
      {products.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}