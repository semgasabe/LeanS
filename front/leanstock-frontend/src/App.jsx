import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import Login        from './pages/Login'
import Register     from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard    from './pages/Dashboard'
import Products     from './pages/Products'
import Inventory    from './pages/Inventory'
import Orders       from './pages/Orders'
import Locations    from './pages/Locations'
import Users        from './pages/Users'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

          {/* Private */}
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute roles={['ADMIN','MANAGER']}><Orders /></PrivateRoute>} />
          <Route path="/locations" element={<PrivateRoute><Locations /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute roles={['ADMIN']}><Users /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
