import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import ProtectedRoute from './components/ProtectedRoute'

// Auth
import Login    from './pages/auth/Login'
import Register from './pages/auth/Register'

// Retailer
import Home         from './pages/retailer/Home'
import Cart         from './pages/retailer/Cart'
import Checkout     from './pages/retailer/Checkout'
import Orders       from './pages/retailer/Orders'
import OrderDetail  from './pages/retailer/OrderDetail'
import RateDelivery from './pages/retailer/RateDelivery'
import RaiseDispute from './pages/retailer/RaiseDispute'

// Wholesaler
import WholesalerDashboard from './pages/wholesaler/Dashboard'
import WholesalerProducts  from './pages/wholesaler/Products'
import WholesalerAnalytics from './pages/wholesaler/Analytics'
import WholesalerEarnings  from './pages/wholesaler/Earnings'

// Logistics
import LogisticsDashboard from './pages/logistics/Dashboard'
import LogisticsRoutes    from './pages/logistics/Routes'
import LogisticsEarnings  from './pages/logistics/Earnings'

// Admin
import AdminDashboard      from './pages/admin/Dashboard'
import AdminOrders         from './pages/admin/Orders'
import AdminOrderDetail    from './pages/admin/OrderDetail'
import AdminLogistics      from './pages/admin/Logistics'
import AdminUsers          from './pages/admin/Users'
import AdminDisputes       from './pages/admin/Disputes'
import AdminAuditLog       from './pages/admin/AuditLog'
import AdminEscrow         from './pages/admin/Escrow'
import AdminAnalytics      from './pages/admin/Analytics'
import AdminConfig         from './pages/admin/AdminConfig'
import AdminNotifications  from './pages/admin/Notifications'
import AdminPaymentsLog    from './pages/admin/PaymentsLog'
import AdminRevenue        from './pages/admin/Revenue'           // ← NEW

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>

            {/* ── Public ─────────────────────────────────────────────────── */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ── Retailer ───────────────────────────────────────────────── */}
            <Route path="/"            element={<ProtectedRoute role="retailer"><Home /></ProtectedRoute>} />
            <Route path="/cart"        element={<ProtectedRoute role="retailer"><Cart /></ProtectedRoute>} />
            <Route path="/checkout"    element={<ProtectedRoute role="retailer"><Checkout /></ProtectedRoute>} />
            <Route path="/orders"      element={<ProtectedRoute role="retailer"><Orders /></ProtectedRoute>} />
            <Route path="/orders/:id"  element={<ProtectedRoute role="retailer"><OrderDetail /></ProtectedRoute>} />
            <Route path="/rate/:id"    element={<ProtectedRoute role="retailer"><RateDelivery /></ProtectedRoute>} />
            <Route path="/dispute/:id" element={<ProtectedRoute role="retailer"><RaiseDispute /></ProtectedRoute>} />

            {/* ── Wholesaler ─────────────────────────────────────────────── */}
            <Route path="/wholesaler"           element={<ProtectedRoute role="wholesaler"><WholesalerDashboard /></ProtectedRoute>} />
            <Route path="/wholesaler/products"  element={<ProtectedRoute role="wholesaler"><WholesalerProducts /></ProtectedRoute>} />
            <Route path="/wholesaler/analytics" element={<ProtectedRoute role="wholesaler"><WholesalerAnalytics /></ProtectedRoute>} />
            <Route path="/wholesaler/earnings"  element={<ProtectedRoute role="wholesaler"><WholesalerEarnings /></ProtectedRoute>} />

            {/* ── Logistics ──────────────────────────────────────────────── */}
            <Route path="/logistics"          element={<ProtectedRoute role="logistics"><LogisticsDashboard /></ProtectedRoute>} />
            <Route path="/logistics/routes"   element={<ProtectedRoute role="logistics"><LogisticsRoutes /></ProtectedRoute>} />
            <Route path="/logistics/earnings" element={<ProtectedRoute role="logistics"><LogisticsEarnings /></ProtectedRoute>} />

            {/* ── Admin ──────────────────────────────────────────────────── */}
            <Route path="/admin"               element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/orders"        element={<ProtectedRoute role="admin"><AdminOrders /></ProtectedRoute>} />
            <Route path="/admin/orders/:id"    element={<ProtectedRoute role="admin"><AdminOrderDetail /></ProtectedRoute>} />
            <Route path="/admin/logistics"     element={<ProtectedRoute role="admin"><AdminLogistics /></ProtectedRoute>} />
            <Route path="/admin/users"         element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/disputes"      element={<ProtectedRoute role="admin"><AdminDisputes /></ProtectedRoute>} />
            <Route path="/admin/audit"         element={<ProtectedRoute role="admin"><AdminAuditLog /></ProtectedRoute>} />
            <Route path="/admin/escrow"        element={<ProtectedRoute role="admin"><AdminEscrow /></ProtectedRoute>} />
            <Route path="/admin/analytics"     element={<ProtectedRoute role="admin"><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/config"        element={<ProtectedRoute role="admin"><AdminConfig /></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute role="admin"><AdminNotifications /></ProtectedRoute>} />
            <Route path="/admin/payments"      element={<ProtectedRoute role="admin"><AdminPaymentsLog /></ProtectedRoute>} />
            <Route path="/admin/revenue"       element={<ProtectedRoute role="admin"><AdminRevenue /></ProtectedRoute>} />  {/* ← NEW */}

            {/* ── Fallback ───────────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/login" />} />

          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}