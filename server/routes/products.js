const router  = require('express').Router();
const Product = require('../models/Product');
const User    = require('../models/User');
const auth    = require('../middleware/auth');

// GET all active products
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('wholesaler', 'name businessName city')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET wholesaler's own products
router.get('/mine', auth, auth.wholesalerOnly, async (req, res) => {
  try {
    const products = await Product.find({ wholesaler: req.user.id })
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST create product
router.post('/', auth, auth.wholesalerOnly, async (req, res) => {
  try {
    const { name, description, price, stock, unit, image, lowStockThreshold } = req.body;
    if (!name || !price || stock === undefined) {
      return res.status(400).json({ msg: 'Name, price and stock are required' });
    }

    // Pull wholesaler city from their profile
    const wholesaler = await User.findById(req.user.id).select('city');

    const product = await Product.create({
      name, description, price, stock,
      unit:              unit || 'item',
      image:             image || '',
      lowStockThreshold: lowStockThreshold || 10,
      wholesaler:        req.user.id,
      wholesalerCity:    wholesaler?.city || '',
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT update product
router.put('/:id', auth, auth.wholesalerOnly, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, wholesaler: req.user.id });
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    const { name, description, price, stock, unit, image, isActive, lowStockThreshold } = req.body;
    if (name)  product.name  = name;
    if (description !== undefined) product.description = description;
    if (price) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (unit)  product.unit  = unit;
    if (image) product.image = image;
    if (isActive !== undefined) product.isActive = isActive;
    if (lowStockThreshold) product.lowStockThreshold = lowStockThreshold;

    // Keep wholesalerCity in sync
    const wholesaler = await User.findById(req.user.id).select('city');
    if (wholesaler?.city) product.wholesalerCity = wholesaler.city;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE product
router.delete('/:id', auth, auth.wholesalerOnly, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, wholesaler: req.user.id });
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    await product.deleteOne();
    res.json({ msg: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;