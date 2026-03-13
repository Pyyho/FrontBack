import React from 'react'
export default function UserItem ({ user, onEdit, onDelete }) {
  return (
    <div className='userRow'>
      <div className='userMain'>
        <div className='userId'>#{user.id}</div>
        <div className='userName'>{user.name}</div>
        <div className='userAge'>{user.age} лет</div>
      </div>
      <div className='userActions'>
        <button className='btn' onClick={() => onEdit(user)}>
          Редактировать
        </button>
        <button className='btn btn--danger' onClick={() => onDelete(user.id)}>
          Удалить
        </button>
      </div>
    </div>
  )
}
