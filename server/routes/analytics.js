const express  = require('express')
const router   = express.Router()
const Order    = require('../models/Order')
const Product  = require('../models/Product')
const User     = require('../models/User')
const auth     = require('../middleware/auth')

// ════════════════════════════════════════════════════════════════════════════
// WHOLESALER ANALYTICS (existing — unchanged)
// GET /api/analytics
// ════════════════════════════════════════════════════════════════════════════
router.get('/', auth, auth.wholesalerOnly, async (req, res) => {
  try {
    const wholesalerId = req.user.id

    const orders = await Order.find({
      orderStatus: { $ne: 'cancelled' },
      'items.wholesaler': wholesalerId,
    }).populate('items.product', 'name')

    // Revenue over last 6 months
    const now    = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key:     `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label:   d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        revenue: 0,
        orders:  0,
      })
    }

    orders.forEach(order => {
      const d   = new Date(order.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = months.find(m => m.key === key)
      if (bucket) {
        const myItems = order.items.filter(item => String(item.wholesaler) === String(wholesalerId))
        const myTotal = myItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        bucket.revenue += myTotal
        bucket.orders  += 1
      }
    })

    // Top products by revenue
    const productMap = {}
    orders.forEach(order => {
      order.items
        .filter(item => String(item.wholesaler) === String(wholesalerId))
        .forEach(item => {
          const name = item.name || item.product?.name || 'Unknown'
          if (!productMap[name]) productMap[name] = { name, revenue: 0, quantity: 0 }
          productMap[name].revenue  += item.price * item.quantity
          productMap[name].quantity += item.quantity
        })
    })
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Order status breakdown
    const allOrders = await Order.find({ 'items.wholesaler': wholesalerId })
    const statusBreakdown = { pending: 0, active: 0, delivered: 0, cancelled: 0 }
    allOrders.forEach(o => {
      const s = o.orderStatus
      if (s === 'pending')                                                    statusBreakdown.pending++
      else if (['confirmed','shipped','collected','in_transit'].includes(s))  statusBreakdown.active++
      else if (['delivered','completed'].includes(s))                         statusBreakdown.delivered++
      else if (s === 'cancelled')                                             statusBreakdown.cancelled++
    })

    const totalRevenue = months.reduce((sum, m) => sum + m.revenue, 0)
    const totalOrders  = allOrders.length

    res.json({ totalRevenue, totalOrders, monthlyRevenue: months, topProducts, statusBreakdown })
  } catch (err) {
    console.error('Analytics error:', err)
    res.status(500).json({ message: 'Failed to load analytics' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN ANALYTICS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/analytics/admin/overview
// Headline KPIs for the admin analytics page
router.get('/admin/overview', auth, auth.adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalOrders, completedOrders, cancelledOrders] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'completed' }),
      Order.countDocuments({ orderStatus: 'cancelled' }),
    ])

    // GMV — sum of all non-cancelled orders
    const gmvAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, gmv: { $sum: '$totalAmount' } } },
    ])
    const gmv = gmvAgg[0]?.gmv || 0

    // Escrow held
    const escrowAgg = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ])
    const escrowHeld = escrowAgg[0]?.total || 0

    // Platform revenue (sum of platformFee on all orders)
    const feeAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } },
    ])
    const platformRevenue = feeAgg[0]?.total || 0

    const fulfilmentRate = totalOrders > 0
      ? Math.round((completedOrders / totalOrders) * 100)
      : 0

    // New users this month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: monthStart } })

    res.json({
      totalUsers, totalOrders, completedOrders, cancelledOrders,
      gmv, escrowHeld, platformRevenue, fulfilmentRate, newUsersThisMonth,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ msg: 'Server error' })
  }
})

// GET /api/analytics/admin/orders
// Order volume over last 6 months + status breakdown
router.get('/admin/orders', auth, auth.adminOnly, async (req, res) => {
  try {
    const now    = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key:    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label:  d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        orders: 0,
        gmv:    0,
      })
    }

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const orders = await Order.find({ createdAt: { $gte: sixMonthsAgo } })

    orders.forEach(order => {
      const d   = new Date(order.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = months.find(m => m.key === key)
      if (bucket) {
        bucket.orders += 1
        if (order.orderStatus !== 'cancelled') bucket.gmv += order.totalAmount
      }
    })

    // Status breakdown — all time
    const allOrders = await Order.find()
    const statusBreakdown = {}
    allOrders.forEach(o => {
      statusBreakdown[o.orderStatus] = (statusBreakdown[o.orderStatus] || 0) + 1
    })

    // Average order value
    const nonCancelled = allOrders.filter(o => o.orderStatus !== 'cancelled')
    const avgOrderValue = nonCancelled.length > 0
      ? Math.round(nonCancelled.reduce((s, o) => s + o.totalAmount, 0) / nonCancelled.length)
      : 0

    res.json({ monthly: months, statusBreakdown, avgOrderValue })
  } catch (err) {
    console.error(err)
    res.status(500).json({ msg: 'Server error' })
  }
})

// GET /api/analytics/admin/users
// User growth over last 6 months + breakdown by role
router.get('/admin/users', auth, auth.adminOnly, async (req, res) => {
  try {
    const now    = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        count: 0,
      })
    }

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const users = await User.find({ createdAt: { $gte: sixMonthsAgo } })

    users.forEach(u => {
      const d   = new Date(u.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = months.find(m => m.key === key)
      if (bucket) bucket.count += 1
    })

    // Role breakdown — all time
    const roleBreakdown = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ])

    // Active vs suspended
    const activeCount    = await User.countDocuments({ isActive: true })
    const suspendedCount = await User.countDocuments({ isActive: false })

    res.json({ monthly: months, roleBreakdown, activeCount, suspendedCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ msg: 'Server error' })
  }
})

// GET /api/analytics/admin/financial
// Revenue breakdown — wholesaler payouts, logistics payouts, platform commission
router.get('/admin/financial', auth, auth.adminOnly, async (req, res) => {
  try {
    const now    = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key:            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label:          d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        toWholesalers:  0,
        toLogistics:    0,
        platformFee:    0,
      })
    }

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const orders = await Order.find({
      createdAt:   { $gte: sixMonthsAgo },
      orderStatus: { $ne: 'cancelled' },
    })

    orders.forEach(order => {
      const d   = new Date(order.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = months.find(m => m.key === key)
      if (bucket) {
        bucket.toWholesalers += order.amountToWholesaler || 0
        bucket.toLogistics   += order.amountToLogistics  || 0
        bucket.platformFee   += order.platformFee        || 0
      }
    })

    // All-time totals
    const totalsAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $group: {
        _id:             null,
        toWholesalers:   { $sum: '$amountToWholesaler' },
        toLogistics:     { $sum: '$amountToLogistics'  },
        platformRevenue: { $sum: '$platformFee'         },
        totalGMV:        { $sum: '$totalAmount'         },
      }},
    ])
    const totals = totalsAgg[0] || { toWholesalers: 0, toLogistics: 0, platformRevenue: 0, totalGMV: 0 }

    // Released vs held
    const releasedAgg = await Order.aggregate([
      { $match: { paymentStatus: 'released' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ])
    const totalReleased = releasedAgg[0]?.total || 0

    const refundedAgg = await Order.aggregate([
      { $match: { paymentStatus: 'refunded' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ])
    const totalRefunded = refundedAgg[0]?.total || 0

    res.json({ monthly: months, totals, totalReleased, totalRefunded })
  } catch (err) {
    console.error(err)
    res.status(500).json({ msg: 'Server error' })
  }
})

module.exports = router