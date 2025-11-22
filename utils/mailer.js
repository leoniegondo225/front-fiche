const nodemailer = require('nodemailer');

function createTransporter({ user, pass }) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });
}

async function sendPayslipEmail(transporter, { to, bcc, subject, text, attachments = [] }) {
  const mailOptions = {
    from: transporter.options.auth.user,
    to,
    bcc,
    subject,
    text,
    attachments,
  };
  return transporter.sendMail(mailOptions);
}

// Alias francophone pour compatibilité avec le reste du code
const sendBulletinEmail = sendPayslipEmail;

module.exports = { createTransporter, sendPayslipEmail, sendBulletinEmail };
