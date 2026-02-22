const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST  || 'smtp.gmail.com',
  port:   Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send ticket confirmation email.
 * @param {object} opts
 * @param {string} opts.to         - Recipient email
 * @param {string} opts.name       - Participant name
 * @param {string} opts.eventName  - Event name
 * @param {string} opts.ticketId   - Ticket ID
 * @param {string} opts.qrCode     - Base64 DataURL of QR code
 * @param {Date}   opts.eventDate  - Event start date
 */
exports.sendTicketEmail = async ({ to, name, eventName, ticketId, qrCode, eventDate }) => {
  if (!process.env.EMAIL_USER) return; // Skip if not configured

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#6366f1">Felicity 2026 — Registration Confirmed 🎉</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>You are successfully registered for <strong>${eventName}</strong>.</p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Ticket ID</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${ticketId}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Event Date</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${new Date(eventDate).toDateString()}</td></tr>
      </table>
      ${qrCode ? `<p>Show the QR code below at the venue:</p><img src="${qrCode}" alt="QR Code" style="width:180px;height:180px"/>` : ''}
      <p style="color:#6b7280;font-size:12px">This is an automated message — please do not reply.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: `[Felicity] Registration Confirmed — ${eventName}`,
      html,
    });
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};
