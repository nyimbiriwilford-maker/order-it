const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User     = require('../models/User');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helper: sign JWT ────────────────────────────────────────────────────────
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const publicUser = (user) => ({
  id: user._id, name: user.name, email: user.email,
  role: user.role, avatar: user.avatar || null,
});

// ─── Register (email/password) ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, businessName, phone, address } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ msg: 'Name, email, password and role are required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role, businessName, phone, address });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── Login (email/password) ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    // Block Google-only accounts from using password login
    if (!user.password)
      return res.status(400).json({ msg: 'This account uses Google Sign-In. Please sign in with Google.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: 'Invalid credentials' });

    if (!user.isActive) return res.status(403).json({ msg: 'Account suspended' });

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// POST /api/auth/google
// Body: { credential: <Google ID token>, role?: 'retailer'|'wholesaler'|'logistics' }
//
// Flow:
//   1. Verify Google ID token → extract name, email, googleId, avatar
//   2. Existing user with this googleId → log them straight in
//   3. Existing user with same email (password account) → link googleId, log in
//   4. New user, role provided → create account, log in
//   5. New user, no role → return 202 + profile so frontend shows role picker
router.post('/google', async (req, res) => {
  try {
    const { credential, role } = req.body;

    if (!credential)
      return res.status(400).json({ msg: 'Google credential is required' });

    // 1. Verify token with Google
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ msg: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture: avatar } = payload;

    // 2. Existing Google account
    let user = await User.findOne({ googleId });
    if (user) {
      if (!user.isActive) return res.status(403).json({ msg: 'Account suspended' });
      return res.json({ token: signToken(user), user: publicUser(user) });
    }

    // 3. Email already registered (password account) → link Google
    user = await User.findOne({ email });
    if (user) {
      if (!user.isActive) return res.status(403).json({ msg: 'Account suspended' });
      user.googleId = googleId;
      if (!user.avatar) user.avatar = avatar;
      await user.save();
      return res.json({ token: signToken(user), user: publicUser(user) });
    }

    // 4. Brand-new user — role required
    if (!role)
      return res.status(202).json({
        needsRole: true,
        profile: { googleId, email, name, avatar },
      });

    const validRoles = ['retailer', 'wholesaler', 'logistics'];
    if (!validRoles.includes(role))
      return res.status(400).json({ msg: 'Invalid role' });

    user = await User.create({ name, email, googleId, avatar, role });
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;