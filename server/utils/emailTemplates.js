const orderConfirmationRetailer = ({ retailerName, orderId, items, totalAmount }) => ({
  subject: `Order confirmed — #${orderId}`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#1a3a6b,#00c853);padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">Order It</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #f0f0f0;border-radius:0 0 12px 12px">
        <h2 style="color:#1a3a6b">Order Confirmed ✅</h2>
        <p>Hi ${retailerName}, your order <strong>#${orderId}</strong> has been placed successfully.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          ${items.map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.name} × ${i.quantity}</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #f0f0f0">MWK ${Number(i.price * i.quantity).toLocaleString()}</td></tr>`).join('')}
        </table>
        <p style="font-size:18px;font-weight:700;color:#1a3a6b">Total: MWK ${Number(totalAmount).toLocaleString()}</p>
        <p style="color:#666;font-size:13px">You will receive updates as your order progresses.</p>
      </div>
    </div>
  `
});

const newOrderNotificationWholesaler = ({ orderId, retailerName, retailerEmail, items, totalAmount }) => ({
  subject: `New order received — #${orderId}`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#1a3a6b,#00c853);padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">Order It</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #f0f0f0;border-radius:0 0 12px 12px">
        <h2 style="color:#1a3a6b">New Order #${orderId}</h2>
        <p>From: <strong>${retailerName}</strong> (${retailerEmail})</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          ${items.map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.name} × ${i.quantity}</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #f0f0f0">MWK ${Number(i.price * i.quantity).toLocaleString()}</td></tr>`).join('')}
        </table>
        <p style="font-size:18px;font-weight:700;color:#1a3a6b">Total: MWK ${Number(totalAmount).toLocaleString()}</p>
      </div>
    </div>
  `
});

const newAssignmentNotificationLogistics = ({ logisticsName, orderId, retailerName, retailerEmail, deliveryAddress, items, totalAmount, deliveryFee }) => ({
  subject: `New delivery assignment — #${orderId}`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#1a3a6b,#00c853);padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">Order It</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #f0f0f0;border-radius:0 0 12px 12px">
        <h2 style="color:#1a3a6b">New Delivery Assignment 🚚</h2>
        <p>Hi ${logisticsName}, you have a new delivery for order <strong>#${orderId}</strong>.</p>
        <p>Retailer: <strong>${retailerName}</strong> (${retailerEmail})</p>
        <p>Deliver to: <strong>${deliveryAddress?.street}, ${deliveryAddress?.city}</strong></p>
        <p style="font-weight:700;color:#1a3a6b">Your delivery fee: MWK ${Number(deliveryFee).toLocaleString()}</p>
      </div>
    </div>
  `
});

const readyForCollectionNotificationLogistics = ({ logisticsName, orderId, retailerName, deliveryAddress, items, deliveryFee, wholesalerName, wholesalerPhone }) => ({
  subject: `Goods ready for collection — #${orderId}`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#1a3a6b,#00c853);padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">Order It</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #f0f0f0;border-radius:0 0 12px 12px">
        <h2 style="color:#1a3a6b">Goods Ready for Collection 🏭</h2>
        <p>Hi ${logisticsName}, order <strong>#${orderId}</strong> is ready for pickup.</p>
        <p>Collect from: <strong>${wholesalerName}</strong> — ${wholesalerPhone}</p>
        <p>Deliver to: <strong>${retailerName}</strong> at ${deliveryAddress?.street}, ${deliveryAddress?.city}</p>
        <p style="font-weight:700;color:#1a3a6b">Delivery fee: MWK ${Number(deliveryFee).toLocaleString()}</p>
      </div>
    </div>
  `
});

module.exports = {
  orderConfirmationRetailer,
  newOrderNotificationWholesaler,
  newAssignmentNotificationLogistics,
  readyForCollectionNotificationLogistics,
};