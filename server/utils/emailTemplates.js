// ── Shared layout wrapper ─────────────────────────────────────────────────────
const layout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order It</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a3a6b 0%,#0d6efd 50%,#00c853 100%);border-radius:16px 16px 0 0;padding:28px 40px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Logo — matches app exactly -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#f0f0f0;border-radius:50px;padding:10px 22px;display:inline-block">
                          <span style="font-size:22px;font-weight:900;color:#1a3a6b;font-family:Arial,sans-serif;letter-spacing:-0.5px">order</span><span style="font-size:22px;font-weight:900;color:#1a3a6b;font-family:Arial,sans-serif"> </span><span style="font-size:22px;font-weight:900;color:#00c853;font-family:Arial,sans-serif;letter-spacing:-0.5px">·it</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="color:rgba(255,255,255,0.8);font-size:13px;vertical-align:middle">
                    B2B Marketplace · Malawi
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;padding:40px">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#1a3a6b;border-radius:0 0 16px 16px;padding:24px 40px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:rgba(255,255,255,0.7);font-size:12px;line-height:1.8">
                    <strong style="color:#fff">Order It</strong> — B2B E-Commerce Platform<br/>
                    Connecting wholesalers, retailers and logistics across Malawi.<br/>
                    <span style="color:rgba(255,255,255,0.4)">This is an automated message. Please do not reply to this email.</span>
                  </td>
                  <td align="right" style="vertical-align:top">
                    <span style="background:#00c853;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px">LIVE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Shared components ─────────────────────────────────────────────────────────
const badge = (text, color = '#1a3a6b') =>
  `<span style="background:${color};color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;display:inline-block">${text}</span>`;

const divider = () =>
  `<tr><td colspan="2" style="border-bottom:1px solid #f0f0f0;padding:0;height:1px"></td></tr>`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding:10px 0;color:#888;font-size:13px;width:40%">${label}</td>
    <td style="padding:10px 0;color:#1a3a6b;font-size:13px;font-weight:600;text-align:right">${value}</td>
  </tr>
  ${divider()}
`;

const itemsTable = (items) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #f0f0f0;border-radius:10px;overflow:hidden">
    <tr style="background:#f8f9fc">
      <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px">Item</td>
      <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:center">Qty</td>
      <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:right">Amount</td>
    </tr>
    ${items.map((i, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#fff' : '#fafbff'}">
      <td style="padding:12px 16px;font-size:14px;color:#333">${i.name}</td>
      <td style="padding:12px 16px;font-size:14px;color:#666;text-align:center">× ${i.quantity}</td>
      <td style="padding:12px 16px;font-size:14px;color:#1a3a6b;font-weight:600;text-align:right">MWK ${Number(i.price * i.quantity).toLocaleString()}</td>
    </tr>`).join('')}
  </table>
`;

const totalBox = (label, amount, color = '#1a3a6b') => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
    <tr>
      <td style="background:linear-gradient(135deg,${color},#00c853);border-radius:10px;padding:16px 20px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:rgba(255,255,255,0.85);font-size:13px">${label}</td>
            <td style="color:#fff;font-size:20px;font-weight:700;text-align:right">MWK ${Number(amount).toLocaleString()}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

const alertBox = (icon, text, bg = '#f0f7ff', border = '#1a3a6b') => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
    <tr>
      <td style="background:${bg};border-left:4px solid ${border};border-radius:0 8px 8px 0;padding:14px 18px;font-size:13px;color:#333;line-height:1.6">
        ${icon} ${text}
      </td>
    </tr>
  </table>
`;

// ── 1. Order confirmation — Retailer ─────────────────────────────────────────
const orderConfirmationRetailer = ({ retailerName, orderId, items, totalAmount }) => ({
  subject: `✅ Order #${orderId} confirmed — Order It`,
  html: layout(`
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:8px">${badge('Order Confirmed', '#00c853')}</td></tr>
      <tr><td style="padding:16px 0 8px">
        <h2 style="margin:0;color:#1a3a6b;font-size:24px">Your order is placed! 🎉</h2>
      </td></tr>
      <tr><td style="padding-bottom:24px;color:#555;font-size:15px;line-height:1.7">
        Hi <strong>${retailerName}</strong>, thank you for your order. We've received it and notified your wholesaler. You'll get updates as things progress.
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fc;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <tr>${infoRow('Order Reference', `#${orderId}`)}</tr>
      <tr>${infoRow('Status', '<span style="color:#00c853;font-weight:700">Pending wholesaler confirmation</span>')}</tr>
      <tr>${infoRow('Items', `${items.length} item${items.length > 1 ? 's' : ''}`)}</tr>
    </table>

    <p style="font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">Order Summary</p>
    ${itemsTable(items)}
    ${totalBox('Order Total', totalAmount)}

    ${alertBox('📦', 'Your order is now with the wholesaler for confirmation. Once confirmed, a logistics company will be assigned to deliver your goods.')}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
      <tr>
        <td style="background:#f8f9fc;border-radius:10px;padding:16px 20px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px">What happens next?</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:13px;color:#555">1. Wholesaler confirms your order</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#555">2. Goods are prepared for collection</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#555">3. Logistics company picks up and delivers</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#555">4. You confirm receipt to release payment</td></tr>
          </table>
        </td>
      </tr>
    </table>
  `)
});

// ── 2. New order notification — Wholesaler ────────────────────────────────────
const newOrderNotificationWholesaler = ({ orderId, retailerName, retailerEmail, items, totalAmount }) => ({
  subject: `🛒 New order #${orderId} from ${retailerName}`,
  html: layout(`
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:8px">${badge('New Order', '#1a3a6b')}</td></tr>
      <tr><td style="padding:16px 0 8px">
        <h2 style="margin:0;color:#1a3a6b;font-size:24px">You have a new order!</h2>
      </td></tr>
      <tr><td style="padding-bottom:24px;color:#555;font-size:15px;line-height:1.7">
        A retailer has placed an order through Order It. Please log in to confirm it as soon as possible.
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fc;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <tr>${infoRow('Order Reference', `#${orderId}`)}</tr>
      <tr>${infoRow('Retailer', retailerName)}</tr>
      <tr>${infoRow('Contact', retailerEmail)}</tr>
      <tr>${infoRow('Items', `${items.length} item${items.length > 1 ? 's' : ''}`)}</tr>
    </table>

    <p style="font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">Items Ordered</p>
    ${itemsTable(items)}
    ${totalBox('Order Value', totalAmount)}

    ${alertBox('⚡', 'Action required: Log in to your wholesaler dashboard and confirm this order. The retailer is waiting for your confirmation before logistics can be dispatched.', '#fff8e1', '#f59e0b')}
  `)
});

// ── 3. New delivery assignment — Logistics ────────────────────────────────────
const newAssignmentNotificationLogistics = ({ logisticsName, orderId, retailerName, retailerEmail, deliveryAddress, items, totalAmount, deliveryFee }) => ({
  subject: `🚚 New delivery assignment — Order #${orderId}`,
  html: layout(`
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:8px">${badge('New Assignment', '#0d6efd')}</td></tr>
      <tr><td style="padding:16px 0 8px">
        <h2 style="margin:0;color:#1a3a6b;font-size:24px">New delivery assigned to you</h2>
      </td></tr>
      <tr><td style="padding-bottom:24px;color:#555;font-size:15px;line-height:1.7">
        Hi <strong>${logisticsName}</strong>, you have been assigned a new delivery on Order It. Please review the details below and await the ready-for-collection notification.
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fc;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <tr>${infoRow('Order Reference', `#${orderId}`)}</tr>
      <tr>${infoRow('Retailer', retailerName)}</tr>
      <tr>${infoRow('Retailer Contact', retailerEmail)}</tr>
      <tr>${infoRow('Deliver To', `${deliveryAddress?.street || ''}, ${deliveryAddress?.city || ''}`)}</tr>
    </table>

    <p style="font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">Items to Deliver</p>
    ${itemsTable(items)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
      <tr>
        <td style="width:48%;background:#f0f7ff;border-radius:10px;padding:16px 20px">
          <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Order Value</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#1a3a6b">MWK ${Number(totalAmount).toLocaleString()}</p>
        </td>
        <td style="width:4%"></td>
        <td style="width:48%;background:linear-gradient(135deg,#1a3a6b,#00c853);border-radius:10px;padding:16px 20px">
          <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:0.5px">Your Delivery Fee</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff">MWK ${Number(deliveryFee).toLocaleString()}</p>
        </td>
      </tr>
    </table>

    ${alertBox('📋', 'You will receive another email when the wholesaler marks the goods as ready for collection. At that point you can proceed to the pickup location.')}
  `)
});

// ── 4. Ready for collection — Logistics ──────────────────────────────────────
const readyForCollectionNotificationLogistics = ({ logisticsName, orderId, retailerName, deliveryAddress, items, deliveryFee, wholesalerName, wholesalerPhone }) => ({
  subject: `📦 Goods ready for collection — Order #${orderId}`,
  html: layout(`
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:8px">${badge('Ready for Collection', '#00c853')}</td></tr>
      <tr><td style="padding:16px 0 8px">
        <h2 style="margin:0;color:#1a3a6b;font-size:24px">Goods are ready — time to collect! 🏭</h2>
      </td></tr>
      <tr><td style="padding-bottom:24px;color:#555;font-size:15px;line-height:1.7">
        Hi <strong>${logisticsName}</strong>, the wholesaler has packed and marked order <strong>#${orderId}</strong> as ready. Please collect the goods and proceed with delivery.
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <!-- Pickup -->
        <td style="width:48%;background:#fff8e1;border:1px solid #fde68a;border-radius:10px;padding:18px 20px;vertical-align:top">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.5px">📍 Collect From</p>
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#333">${wholesalerName}</p>
          <p style="margin:0;font-size:13px;color:#666">${wholesalerPhone || 'Contact via Order It dashboard'}</p>
        </td>
        <td style="width:4%;text-align:center;vertical-align:middle;font-size:20px">→</td>
        <!-- Delivery -->
        <td style="width:48%;background:#f0fff4;border:1px solid #86efac;border-radius:10px;padding:18px 20px;vertical-align:top">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#00c853;text-transform:uppercase;letter-spacing:0.5px">🏠 Deliver To</p>
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#333">${retailerName}</p>
          <p style="margin:0;font-size:13px;color:#666">${deliveryAddress?.street || ''}, ${deliveryAddress?.city || ''}</p>
        </td>
      </tr>
    </table>

    <p style="font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px">Items in this Delivery</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #f0f0f0;border-radius:10px;overflow:hidden">
      <tr style="background:#f8f9fc">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px">Item</td>
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;text-align:right">Qty</td>
      </tr>
      ${items.map((i, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#fafbff'}">
        <td style="padding:12px 16px;font-size:14px;color:#333">${i.name}</td>
        <td style="padding:12px 16px;font-size:14px;color:#1a3a6b;font-weight:600;text-align:right">× ${i.quantity}</td>
      </tr>`).join('')}
    </table>

    ${totalBox('Your Delivery Fee', deliveryFee, '#00833a')}

    ${alertBox('✅', 'Once delivered, log in to your logistics dashboard and mark the order as <strong>Delivered</strong>. Payment will be released to you after the retailer confirms receipt.', '#f0fff4', '#00c853')}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px">
      <tr>
        <td style="background:#f8f9fc;border-radius:10px;padding:16px 20px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px">Delivery Checklist</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:13px;color:#555">☐ &nbsp;Collect goods from wholesaler and verify items</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#555">☐ &nbsp;Mark order as <strong>Collected</strong> in your dashboard</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#555">☐ &nbsp;Mark order as <strong>In Transit</strong> when dispatched</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#555">☐ &nbsp;Mark order as <strong>Delivered</strong> upon successful delivery</td></tr>
          </table>
        </td>
      </tr>
    </table>
  `)
});

// ── 5. Order status update — Retailer ─────────────────────────────────────────
const orderStatusUpdateRetailer = ({ retailerName, orderId, status, message }) => {
  const statusConfig = {
    confirmed:            { label: 'Order Confirmed',       color: '#00c853', icon: '✅', badge: '#00c853' },
    ready_for_collection: { label: 'Goods Being Prepared',  color: '#f59e0b', icon: '🏭', badge: '#f59e0b' },
    collected:            { label: 'Goods Collected',       color: '#0d6efd', icon: '📦', badge: '#0d6efd' },
    in_transit:           { label: 'Out for Delivery',      color: '#8b5cf6', icon: '🚚', badge: '#8b5cf6' },
    delivered:            { label: 'Order Delivered',       color: '#00c853', icon: '🏠', badge: '#00c853' },
    cancelled:            { label: 'Order Cancelled',       color: '#ef4444', icon: '❌', badge: '#ef4444' },
  };
  const cfg = statusConfig[status] || { label: status, color: '#1a3a6b', icon: '📋', badge: '#1a3a6b' };

  return {
    subject: `${cfg.icon} Order #${orderId} — ${cfg.label}`,
    html: layout(`
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding-bottom:8px">${badge(cfg.label, cfg.badge)}</td></tr>
        <tr><td style="padding:16px 0 8px">
          <h2 style="margin:0;color:#1a3a6b;font-size:24px">${cfg.icon} ${cfg.label}</h2>
        </td></tr>
        <tr><td style="padding-bottom:24px;color:#555;font-size:15px;line-height:1.7">
          Hi <strong>${retailerName}</strong>, here's an update on your order <strong>#${orderId}</strong>.
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fc;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <tr>${infoRow('Order Reference', `#${orderId}`)}</tr>
        <tr>${infoRow('Current Status', `<span style="color:${cfg.color};font-weight:700">${cfg.label}</span>`)}</tr>
      </table>

      ${message ? alertBox('📋', message) : ''}

      <!-- Progress bar -->
      <p style="font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:24px 0 12px">Order Progress</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${['Pending', 'Confirmed', 'Ready', 'In Transit', 'Delivered'].map((step, i) => {
          const steps = ['pending', 'confirmed', 'ready_for_collection', 'in_transit', 'delivered'];
          const currentIdx = steps.indexOf(status);
          const isActive  = i <= currentIdx;
          return `
          <tr>
            <td style="width:28px;text-align:center;padding:6px 0">
              <div style="width:20px;height:20px;border-radius:50%;background:${isActive ? cfg.color : '#e0e0e0'};display:inline-block;line-height:20px;font-size:11px;color:#fff;font-weight:700">${isActive ? '✓' : ''}</div>
            </td>
            <td style="padding:6px 12px;font-size:13px;color:${isActive ? '#1a3a6b' : '#aaa'};font-weight:${isActive ? '600' : '400'}">${step}</td>
          </tr>`;
        }).join('')}
      </table>
    `)
  };
};

module.exports = {
  orderConfirmationRetailer,
  newOrderNotificationWholesaler,
  newAssignmentNotificationLogistics,
  readyForCollectionNotificationLogistics,
  orderStatusUpdateRetailer,
};