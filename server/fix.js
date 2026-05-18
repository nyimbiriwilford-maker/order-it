require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Product = require('./models/Product');
  const Order   = require('./models/Order');
  const oldId   = '69fa4fbcde43399dc4c6f3cc';

  // Fix products with no wholesaler
  await Product.updateMany({ wholesaler: { $exists: false } }, { wholesaler: oldId });
  await Product.updateMany({ wholesaler: null }, { wholesaler: oldId });
  console.log('products fixed');

  // Fix orders with no wholesaler using updateOne to bypass validation
  const orders = await Order.find({ wholesaler: null });
  console.log('orders to fix:', orders.length);
  for (const o of orders) {
    const p = await Product.findById(o.items[0]?.product).select('wholesaler');
    if (p?.wholesaler) {
      await Order.updateOne({ _id: o._id }, { wholesaler: p.wholesaler });
    }
  }
  console.log('done');
  process.exit();
});