const nodemailer = require('nodemailer');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  family: 4,
  connectionTimeout: 8000,  // fail after 8 seconds, not 60+
  greetingTimeout:   8000,
  socketTimeout:     8000,
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to, subject, html,
    });
    console.log('✅ Email sent to', to);
  } catch (err) {
    console.error('❌ Email error:', err.message);
    // Swallow the error — never let email failures bubble up
  }
};

module.exports = sendEmail;