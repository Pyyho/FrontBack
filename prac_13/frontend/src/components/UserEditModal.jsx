import React, { useEffect, useState } from 'react'

export default function UserEditModal({ open, user, onClose, onSubmit }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    role: 'user',
    isActive: true
  })

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'user',
        isActive: user.isActive !== false
      })
    }
  }, [user])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(user.id, form)
  }

  const setField = (key) => (e) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const setCheckbox = (key) => (e) => {
    setForm(prev => ({ ...prev, [key]: e.target.checked }))
  }

  return (
    <div className='backdrop' onClick={onClose}>
      <div className='modal' onClick={e => e.stopPropagation()}>
        <div className='modal__header'>
          <div className='modal__title'>
            Редактировать пользователя
          </div>
          <button className='iconBtn' onClick={onClose} type='button'>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className='label'>
            Имя
            <input
              className='input'
              value={form.first_name}
              onChange={setField('first_name')}
            />
          </label>

          <label className='label'>
            Фамилия
            <input
              className='input'
              value={form.last_name}
              onChange={setField('last_name')}
            />
          </label>

          <label className='label'>
            Роль
            <select className='input' value={form.role} onChange={setField('role')}>
              <option value="user">Пользователь</option>
              <option value="seller">Продавец</option>
              <option value="admin">Администратор</option>
            </select>
          </label>

          <label className='label label-checkbox'>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={setCheckbox('isActive')}
            />
            Активен (не заблокирован)
          </label>

          <div className='modal__footer'>
            <button type='button' className='btn' onClick={onClose}>
              Отмена
            </button>
            <button type='submit' className='btn btn--primary'>
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}