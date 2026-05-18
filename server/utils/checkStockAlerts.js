const sendEmail = require('./sendEmail');
const Product   = require('../models/Product');
const User      = require('../models/User');

const checkStockAlerts = async (productId, currentStock, productName) => {
  try {
    const product    = await Product.findById(productId);
    const wholesaler = await User.findById(product.wholesaler);
    if (!wholesaler) return;

    if (currentStock <= product.lowStockThreshold) {
      await sendEmail({
        to:      wholesaler.email,
        subject: `⚠️ Low stock alert — ${productName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#1a3a6b,#00c853);padding:24px 32px;border-radius:12px 12px 0 0">
              <h1 style="color:#fff;margin:0;font-size:22px">Order It</h1>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #f0f0f0;border-radius:0 0 12px 12px">
              <h2 style="color:#1a3a6b">Low Stock Alert</h2>
              <p><strong>${productName}</strong> is running low.</p>
              <p>Current stock: <strong style="color:#e53935">${currentStock} units</strong></p>
              <p>Please restock soon to avoid missing orders.</p>
            </div>
          </div>
        `
      });
    }
  } catch (err) {
    console.error('Stock alert error:', err.message);
  }
};

module.exports = checkStockAlerts;