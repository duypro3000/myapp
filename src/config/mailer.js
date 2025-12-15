const nodemailer = require('nodemailer');

function createTransport() {
  if (!process.env.MAIL_HOST) {
    // Dev: log-only transport
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: String(process.env.MAIL_SECURE || 'false') === 'true',
    auth: process.env.MAIL_USER ? {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    } : undefined
  });
}

async function sendMail({ to, subject, html }) {
  const transporter = createTransport();
  const from = process.env.MAIL_FROM || 'no-reply@techshop.local';
  const info = await transporter.sendMail({ from, to, subject, html });
  if (info.message) {
    console.log('--- Email (dev) ---\n' + info.message.toString() + '\n-------------------');
  } else {
    console.log('Email sent:', info.response);
  }
}

module.exports = { sendMail };
