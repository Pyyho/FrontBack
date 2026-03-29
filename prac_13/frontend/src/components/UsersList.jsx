import React from 'react'

const getRoleBadgeClass = (role) => {
  switch (role) {
    case 'admin':
      return 'badge badge-admin'
    case 'seller':
      return 'badge badge-seller'
    default:
      return 'badge badge-user'
  }
}

const getRoleName = (role) => {
  switch (role) {
    case 'admin':
      return 'Администратор'
    case 'seller':
      return 'Продавец'
    default:
      return 'Пользователь'
  }
}

export default function UsersList({ users, onEdit, onDelete, currentUserRole }) {
  if (!users || users.length === 0) {
    return <div className='empty'>Пользователей пока нет</div>
  }

  const isAdmin = currentUserRole === 'admin'

  return (
    <div className='users-list'>
      <div className='users-header'>
        <div>Email</div>
        <div>Имя</div>
        <div>Фамилия</div>
        <div>Роль</div>
        <div>Статус</div>
        {isAdmin && <div>Действия</div>}
      </div>
      {users.map(user => (
        <div key={user.id} className='user-row'>
          <div>{user.email}</div>
          <div>{user.first_name}</div>
          <div>{user.last_name}</div>
          <div>
            <span className={getRoleBadgeClass(user.role)}>
              {getRoleName(user.role)}
            </span>
          </div>
          <div>
            <span className={`badge ${user.isActive !== false ? 'badge-active' : 'badge-inactive'}`}>
              {user.isActive !== false ? 'Активен' : 'Заблокирован'}
            </span>
          </div>
          {isAdmin && (
            <div className='user-actions'>
              <button className='btn btn--ghost' onClick={() => onEdit(user)}>
                Редактировать
              </button>
              <button className='btn btn--danger' onClick={() => onDelete(user.id)}>
                {user.isActive !== false ? 'Заблокировать' : 'Разблокировать'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}