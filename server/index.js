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

app.get('/api/test', (req, res) => res.json({ msg: 'Order It API running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));