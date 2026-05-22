const { BrevoClient } = require('@getbrevo/brevo');

const sendEmail = async ({ to, subject, html }) => {
  try {
    const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

    await client.transactionalEmails.sendTransacEmail({
      sender: { name: 'Order It', email: 'nyimbiriwilford@gmail.com' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });

    console.log('✅ Email sent to', to);
  } catch (err) {
    console.error('❌ Email error:', err.message);
  }
};

module.exports = sendEmail;