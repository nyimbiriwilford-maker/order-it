import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" />
  if (role && user?.role !== role) return <Navigate to="/login" />
  return children
}