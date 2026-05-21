import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [user,  setUser]  = useState(JSON.parse(localStorage.getItem('user') || 'null'))
  const navigate = useNavigate()

  const login = (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setToken(token)
    setUser(user)

    if (user.role === 'retailer')   navigate('/')
    if (user.role === 'wholesaler') navigate('/wholesaler')
    if (user.role === 'logistics')  navigate('/logistics')
    if (user.role === 'admin')      navigate('/admin')
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    navigate('/login')
  }

  // Merge partial updates into the stored user object (used by ProfilePage after save)
  const updateUser = (partial) => {
    setUser(prev => {
      const updated = { ...prev, ...partial }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)