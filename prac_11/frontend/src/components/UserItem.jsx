import React from 'react'

export default function UserItem({ user, onEdit, onDelete }) {
  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'Администратор'
      case 'seller': return 'Продавец'
      default: return 'Пользователь'
    }
  }

  return (
    <div className='userRow'>
      <div className='userMain'>
        <div className='userId'>#{user.id.slice(0, 8)}</div>
        <div className='userName'>{user.first_name} {user.last_name}</div>
        <div className='userEmail'>{user.email}</div>
        <div className='userRole'>{getRoleName(user.role)}</div>
        <div className={`userStatus ${user.isActive !== false ? 'active' : 'blocked'}`}>
          {user.isActive !== false ? 'Активен' : 'Заблокирован'}
        </div>
      </div>
      <div className='userActions'>
        <button className='btn' onClick={() => onEdit(user)}>
          Редактировать
        </button>
        <button className='btn btn--danger' onClick={() => onDelete(user.id)}>
          {user.isActive !== false ? 'Заблокировать' : 'Разблокировать'}
        </button>
      </div>
    </div>
  )
}