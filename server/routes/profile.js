const router = require('express').Router();
const User   = require('../models/User');
const auth   = require('../middleware/auth');

// GET own profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT update profile
router.put('/', auth, async (req, res) => {
  try {
    const { name, phone, businessName, address, city } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (name)         user.name         = name;
    if (phone)        user.phone        = phone;
    if (businessName) user.businessName = businessName;
    if (address)      user.address      = address;
    if (city)         user.city         = city;

    await user.save();

    // Update wholesalerCity on all their products
    if (city && user.role === 'wholesaler') {
      const Product = require('../models/Product');
      await Product.updateMany({ wholesaler: user._id }, { wholesalerCity: city });
    }

    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, city: user.city });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;