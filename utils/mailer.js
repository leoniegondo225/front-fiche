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

async function sendPayslipEmail(transporter, { to, subject, text, attachments = [] }) {
  const mailOptions = {
    from: transporter.options.auth.user,
    to,
    subject,
    text,
    attachments
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { createTransporter, sendPayslipEmail };
