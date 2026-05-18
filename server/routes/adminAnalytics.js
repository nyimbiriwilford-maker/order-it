const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');
const LogisticsCompany = require('../models/LogisticsCompany');
const Payout = require('../models/Payout');

// All routes require admin
router.use(protect, adminOnly);

// ─────────────────────────────────────────────────────────────
// GET /api/admin/analytics/overview
// ─────────────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const [
      totalOrders,
      completedOrders,
      cancelledOrders,
      disputedOrders,
      pendingEscrowOrders,
      totalUsers,
      activeUsers,
      totalLogistics,
      approvedLogistics,
      gmvResult,
      commissionResult,
      escrowResult,
      payoutResult,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'completed' }),
      Order.countDocuments({ orderStatus: 'cancelled' }),
      Order.countDocuments({ orderStatus: 'disputed' }),
      Order.countDocuments({
        orderStatus: { $nin: ['cancelled', 'completed'] },
        paymentStatus: { $ne: 'refunded' },
      }),
      User.countDocuments(),
      User.countDocuments({ isActive: { $ne: false } }),
      LogisticsCompany.countDocuments(),
      LogisticsCompany.countDocuments({ status: 'approved' }),
      // GMV — all non-cancelled orders
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      // Commission — platformFee on non-cancelled orders
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } },
      ]),
      // Escrow held — all active orders not cancelled/completed/refunded
      Order.aggregate([
        {
          $match: {
            orderStatus: { $nin: ['cancelled', 'completed'] },
            paymentStatus: { $ne: 'refunded' },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      // Total paid out
      Payout.aggregate([
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]),
    ]);

    const activeOrderCount = totalOrders - cancelledOrders;
    const fulfilmentRate =
      activeOrderCount > 0
        ? Math.round((completedOrders / activeOrderCount) * 100)
        : 0;

    res.json({
      totalOrders,
      completedOrders,
      cancelledOrders,
      disputedOrders,
      pendingEscrowOrders,
      fulfilmentRate,
      totalUsers,
      activeUsers,
      totalLogistics,
      approvedLogistics,
      gmv: gmvResult[0]?.total || 0,
      totalCommission: commissionResult[0]?.total || 0,
      escrowHeld: escrowResult[0]?.total || 0,
      totalPaidOut: payoutResult[0]?.total || 0,
    });
  } catch (err) {
    console.error('Admin analytics overview error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/analytics/orders
// ─────────────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period] || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const groupFormat =
      days <= 30
        ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        : { $dateToString: { format: '%Y-%m', date: '$createdAt' } };

    const [volumeByDay, statusBreakdown, topWholesalers, topRetailers] =
      await Promise.all([
        // Volume over time
        Order.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: groupFormat,
              count: { $sum: 1 },
              revenue: { $sum: '$totalAmount' },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Status breakdown
        Order.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Top wholesalers — join through product to find wholesaler owner
        Order.aggregate([
          { $match: { createdAt: { $gte: since }, orderStatus: { $ne: 'cancelled' } } },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.product',
              foreignField: '_id',
              as: 'productDoc',
            },
          },
{ $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },          {
            $group: {
              _id: '$productDoc.wholesaler',
              orderCount: { $addToSet: '$_id' },
              revenue: {
                $sum: { $multiply: ['$items.price', '$items.quantity'] },
              },
            },
          },
          {
            $project: {
              orderCount: { $size: '$orderCount' },
              revenue: 1,
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $project: {
              name: { $arrayElemAt: ['$user.businessName', 0] },
              email: { $arrayElemAt: ['$user.email', 0] },
              orderCount: 1,
              revenue: 1,
            },
          },
        ]),

        // Top retailers by spend
        Order.aggregate([
          { $match: { createdAt: { $gte: since }, orderStatus: { $ne: 'cancelled' } } },
          {
            $group: {
              _id: '$retailer',
              orderCount: { $sum: 1 },
              totalSpent: { $sum: '$totalAmount' },
            },
          },
          { $sort: { totalSpent: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $project: {
              name: { $arrayElemAt: ['$user.name', 0] },
              businessName: { $arrayElemAt: ['$user.businessName', 0] },
              email: { $arrayElemAt: ['$user.email', 0] },
              orderCount: 1,
              totalSpent: 1,
            },
          },
        ]),
      ]);

    res.json({
      period,
      volumeByDay,
      statusBreakdown,
      topWholesalers,
      topRetailers,
    });
  } catch (err) {
    console.error('Admin analytics orders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/analytics/financial
// ─────────────────────────────────────────────────────────────
router.get('/financial', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period] || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const groupFormat =
      days <= 30
        ? { $dateToString: { format: '%Y-%m-%d', date: '$releasedAt' } }
        : { $dateToString: { format: '%Y-%m', date: '$releasedAt' } };

    const [
      payoutSummary,
      payoutsByType,
      payoutsByDay,
      refundTotal,
      commissionTotal,
      vatTotal,
    ] = await Promise.all([
      Payout.aggregate([
        { $match: { releasedAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            grossTotal: { $sum: '$grossAmount' },
            vatTotal: { $sum: '$vatAmount' },
            netTotal: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Payout.aggregate([
        { $match: { releasedAt: { $gte: since } } },
        {
          $group: {
            _id: '$recipientType',
            gross: { $sum: '$grossAmount' },
            vat: { $sum: '$vatAmount' },
            net: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Payout.aggregate([
        { $match: { releasedAt: { $gte: since } } },
        {
          $group: {
            _id: groupFormat,
            gross: { $sum: '$grossAmount' },
            net: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'refunded', updatedAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' }, createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$platformFee' }, count: { $sum: 1 } } },
      ]),
      Payout.aggregate([
        { $match: { releasedAt: { $gte: since }, recipientType: 'wholesaler' } },
        { $group: { _id: null, total: { $sum: '$vatAmount' } } },
      ]),
    ]);

    res.json({
      period,
      summary: payoutSummary[0] || { grossTotal: 0, vatTotal: 0, netTotal: 0, count: 0 },
      byRecipientType: payoutsByType,
      payoutsByDay,
      refunds: refundTotal[0] || { total: 0, count: 0 },
      commission: commissionTotal[0] || { total: 0, count: 0 },
      vatCollected: vatTotal[0]?.total || 0,
    });
  } catch (err) {
    console.error('Admin analytics financial error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/analytics/logistics
// ─────────────────────────────────────────────────────────────
router.get('/logistics', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period] || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [companyStats, statusBreakdown] = await Promise.all([
      // Per-company stats via Payout collection
      Payout.aggregate([
        { $match: { releasedAt: { $gte: since }, recipientType: 'logistics' } },
        {
          $group: {
            _id: '$recipient',
            totalFees: { $sum: '$netAmount' },
            payoutCount: { $sum: 1 },
          },
        },
        { $sort: { totalFees: -1 } },
        {
          $lookup: {
            from: 'logisticscompanies',
            localField: '_id',
            foreignField: '_id',
            as: 'company',
          },
        },
        {
          $lookup: {
            from: 'logisticsratings',
            localField: '_id',
            foreignField: 'logisticsCompany',
            as: 'ratings',
          },
        },
        {
          $project: {
            companyName: { $arrayElemAt: ['$company.name', 0] },
            status: { $arrayElemAt: ['$company.status', 0] },
            totalFees: 1,
            payoutCount: 1,
            avgRating: { $avg: '$ratings.rating' },
            ratingCount: { $size: '$ratings' },
          },
        },
      ]),

      // Delivery status breakdown using deliveryStatus field
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: since },
            deliveryStatus: { $exists: true, $ne: 'unassigned' },
          },
        },
        { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({ period, companyStats, statusBreakdown });
  } catch (err) {
    console.error('Admin analytics logistics error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/analytics/users
// ─────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[period] || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const groupFormat =
      days <= 30
        ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        : { $dateToString: { format: '%Y-%m', date: '$createdAt' } };

    const [growthByDay, byRole, totalByRole, recentSignups] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: groupFormat, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name email role businessName createdAt isActive'),
    ]);

    res.json({
      period,
      growthByDay,
      newUsersByRole: byRole,
      totalByRole,
      recentSignups,
    });
  } catch (err) {
    console.error('Admin analytics users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;