require('dotenv').config();
const mongoose = require('mongoose');
const Product  = require('./models/Product');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await Product.updateMany({ name: /banana/i },  { category: 'Food & Grocery' });
  await Product.updateMany({ name: /maize/i },   { category: 'Food & Grocery' });
  await Product.updateMany({ name: /iphone/i },  { category: 'Electronics' });
  await Product.updateMany({ name: /car/i },     { category: 'General' });
  console.log('Done');
  process.exit();
});