const nodemailer = require('nodemailer');

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

async function sendVerificationEmail(toEmail, code) {
  const subject = 'RunBarbie – Verify your email';
  const text = `Your verification code is: ${code}\n\nIt expires in 15 minutes.\n\nIf you didn't sign up, you can ignore this email.`;
  const html = `
    <p>Your verification code is: <strong>${code}</strong></p>
    <p>It expires in 15 minutes.</p>
    <p>If you didn't sign up for RunBarbie, you can ignore this email.</p>
  `;

  const transporter = getTransporter();
  if (!transporter) {
    console.log('[Email] No SMTP configured. Verification code for', toEmail, ':', code);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    throw err;
  }
}

async function sendPasswordResetEmail(toEmail, code) {
  const subject = 'RunBarbie – Reset your password';
  const text = `Your password reset code is: ${code}\n\nIt expires in 1 hour.\n\nIf you didn't request this, you can ignore this email.`;
  const html = `
    <p>Your password reset code is: <strong>${code}</strong></p>
    <p>It expires in 1 hour.</p>
    <p>If you didn't request a password reset, you can ignore this email.</p>
  `;

  const transporter = getTransporter();
  if (!transporter) {
    console.log('[Email] No SMTP configured. Password reset code for', toEmail, ':', code);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    throw err;
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
