const { sendMail } = require('../config/mailer');

async function sendResetPasswordEmail(to, link) {
  const html = `
    <p>Xin chào,</p>
    <p>Nhấp vào liên kết dưới đây để đặt lại mật khẩu:</p>
    <p><a href="${link}">${link}</a></p>
    <p>Liên kết sẽ hết hạn sau 30 phút.</p>
    <p>- TechShop Blue</p>
  `;
  await sendMail({ to, subject: 'Đặt lại mật khẩu', html });
}

module.exports = { sendResetPasswordEmail };
