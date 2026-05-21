const nodemailer = require('nodemailer');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  host: '74.125.133.108',  // smtp.gmail.com IPv4 — bypasses IPv6 resolution entirely
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    servername: 'smtp.gmail.com',  // required when using IP directly
  },
  connectionTimeout: 10000,
  greetingTimeout:   10000,
  socketTimeout:     10000,
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
  }
};

module.exports = sendEmail;