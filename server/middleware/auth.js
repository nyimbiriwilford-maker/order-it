const jwt = require('jsonwebtoken');

// Verify token
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token, access denied' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

// Role guards
auth.wholesalerOnly = (req, res, next) => {
  if (req.user?.role !== 'wholesaler') return res.status(403).json({ msg: 'Wholesalers only' });
  next();
};

auth.retailerOnly = (req, res, next) => {
  if (req.user?.role !== 'retailer') return res.status(403).json({ msg: 'Retailers only' });
  next();
};

auth.logisticsOnly = (req, res, next) => {
  if (req.user?.role !== 'logistics') return res.status(403).json({ msg: 'Logistics only' });
  next();
};

auth.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ msg: 'Admins only' });
  next();
};

module.exports = auth;