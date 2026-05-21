const router  = require('express').Router();
const Product = require('../models/Product');
const User    = require('../models/User');
const auth    = require('../middleware/auth');

// ── GET /api/products  — all active products (retailer browse)
router.get('/', auth, async (req, res) => {
  try {
    const { category, q } = req.query;
    const filter = { isActive: true };
    if (category && category !== 'All') filter.category = category;
    if (q) filter.$text = { $search: q };

    const products = await Product.find(filter)
      .populate('wholesaler', 'name businessName city')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── GET /api/products/mine  — wholesaler's own products
router.get('/mine', auth, auth.wholesalerOnly, async (req, res) => {
  try {
    const products = await Product.find({ wholesaler: req.user.id })
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── GET /api/products/:id  — single product
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('wholesaler', 'name businessName city');
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── POST /api/products  — create product (wholesaler)
router.post('/', auth, auth.wholesalerOnly, async (req, res) => {
  try {
    const {
      name, description, price, stock, unit, image,
      lowStockThreshold, minOrderQty,
      category, tags,
      bulkPricing, promo,
    } = req.body;

    if (!name || !price || stock === undefined)
      return res.status(400).json({ msg: 'Name, price and stock are required' });

    if (minOrderQty !== undefined && Number(minOrderQty) < 1)
      return res.status(400).json({ msg: 'Minimum order quantity must be at least 1' });

    if (promo?.enabled && (!promo.price || Number(promo.price) >= Number(price)))
      return res.status(400).json({ msg: 'Promotional price must be set and less than the regular price' });

    const wholesaler = await User.findById(req.user.id).select('city');

    const product = await Product.create({
      name,
      description:       description       || '',
      price:             Number(price),
      stock:             Number(stock),
      unit:              unit              || 'item',
      image:             image             || '',
      lowStockThreshold: Number(lowStockThreshold) || 10,
      minOrderQty:       Number(minOrderQty)       || 1,
      category:          category          || 'General',
      tags:              tags              || [],
      bulkPricing:       bulkPricing       || [],
      promo:             promo             || { enabled: false },
      wholesaler:        req.user.id,
      wholesalerCity:    wholesaler?.city  || '',
    });

    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── PUT /api/products/:id  — update product (wholesaler, must own it)
router.put('/:id', auth, auth.wholesalerOnly, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, wholesaler: req.user.id });
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    const {
      name, description, price, stock, unit, image, isActive,
      lowStockThreshold, minOrderQty,
      category, tags,
      bulkPricing, promo,
    } = req.body;

    if (minOrderQty !== undefined && Number(minOrderQty) < 1)
      return res.status(400).json({ msg: 'Minimum order quantity must be at least 1' });

    if (promo?.enabled && (!promo.price || Number(promo.price) >= Number(price ?? product.price)))
      return res.status(400).json({ msg: 'Promotional price must be set and less than the regular price' });

    if (name        !== undefined) product.name              = name;
    if (description !== undefined) product.description       = description;
    if (price       !== undefined) product.price             = Number(price);
    if (stock       !== undefined) product.stock             = Number(stock);
    if (unit        !== undefined) product.unit              = unit;
    if (image       !== undefined) product.image             = image;
    if (isActive    !== undefined) product.isActive          = isActive;
    if (lowStockThreshold !== undefined) product.lowStockThreshold = Number(lowStockThreshold);
    if (minOrderQty       !== undefined) product.minOrderQty       = Number(minOrderQty);
    if (category    !== undefined) product.category          = category;
    if (tags        !== undefined) product.tags              = tags;
    if (bulkPricing !== undefined) product.bulkPricing       = bulkPricing;
    if (promo       !== undefined) product.promo             = promo;

    // Keep wholesalerCity in sync
    const wholesaler = await User.findById(req.user.id).select('city');
    if (wholesaler?.city) product.wholesalerCity = wholesaler.city;

    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── DELETE /api/products/:id  — delete product (wholesaler, must own it)
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