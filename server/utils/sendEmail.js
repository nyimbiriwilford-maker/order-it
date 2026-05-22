const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  console.log(`📧 Attempting email TO: ${to} | SUBJECT: ${subject}`);
  try {
    await resend.emails.send({
      from: 'Order It <onboarding@resend.dev>',
      to, subject, html,
    });
    console.log(`✅ Email sent to: ${to}`);
  } catch (err) {
    console.error(`❌ Email error to ${to}:`, err.message);
  }
};

module.exports = sendEmail;