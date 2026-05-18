require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const sample = await Order.findOne();
  console.log(JSON.stringify(sample, null, 2));
  process.exit();
});