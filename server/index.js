require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth',                require('./routes/auth'));
app.use('/api/products',            require('./routes/products'));
app.use('/api/orders',              require('./routes/orders'));
app.use('/api/logistics',           require('./routes/logistics'));
app.use('/api/admin/analytics',     require('./routes/adminAnalytics'));
app.use('/api/admin/financials',    require('./routes/adminFinancials'));
app.use('/api/admin',               require('./routes/admin'));
app.use('/api/profile',             require('./routes/profile'));
app.use('/api/analytics',           require('./routes/analytics'));
app.use('/api/upload',              require('./routes/upload'));
app.use('/api/disputes',            require('./routes/disputes'));
app.use('/api/config',              require('./routes/config'));
app.use('/api/payouts',             require('./routes/payouts'));
app.use('/api/visual-search',       require('./routes/visualSearch'));
require('./jobs/autoConfirm');

// ── Temporary email test route — remove after confirming emails work ──────────
app.get('/api/test-email', async (req, res) => {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: 'Order It <onboarding@resend.dev>',
      to:   process.env.EMAIL_USER,
      subject: 'Test from Render',
      html: '<p>Email works on Render via Resend!</p>',
    });
    res.json({ ok: true, sentTo: process.env.EMAIL_USER });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.get('/api/test', (req, res) => res.json({ msg: 'Order It API running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));