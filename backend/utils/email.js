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

  // Extract base64 data from the DataURL (strip "data:image/png;base64," prefix)
  const qrBase64 = qrCode ? qrCode.replace(/^data:image\/png;base64,/, '') : null;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">Felicity 2026</h1>
      </div>
      <div style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <h2 style="color:#6366f1">Registration Confirmed 🎉</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>You are successfully registered for <strong>${eventName}</strong>.</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Ticket ID</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${ticketId}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Event Date</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${new Date(eventDate).toDateString()}</td></tr>
        </table>
        ${qrBase64 ? `
        <p style="margin-top:16px"><strong>Show this QR code at the venue:</strong></p>
        <img src="cid:qrcode" alt="QR Code" style="width:180px;height:180px;display:block;margin:8px 0"/>
        ` : ''}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px"/>
        <p style="color:#9ca3af;font-size:11px;text-align:center">This is an automated message — please do not reply.</p>
      </div>
    </div>
  `;

  try {
    const mailOptions = {
      from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: `[Felicity] Registration Confirmed — ${eventName}`,
      html,
    };

    // Attach QR code as inline CID image so email clients render it correctly
    if (qrBase64) {
      mailOptions.attachments = [{
        filename:    'qrcode.png',
        content:     Buffer.from(qrBase64, 'base64'),
        cid:         'qrcode',          // referenced as cid:qrcode in html
        contentType: 'image/png',
      }];
    }

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};

// ── Helper: fire-and-forget sender ────────────────────────────────────────────
const send = async (to, subject, html) => {
  if (!process.env.EMAIL_USER) return;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: `[Felicity] ${subject}`,
      html: wrap(html),
    });
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};

const wrap = (body) => `
  <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1f2937">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">Felicity 2026</h1>
    </div>
    <div style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px"/>
      <p style="color:#9ca3af;font-size:11px;text-align:center">This is an automated message — please do not reply.</p>
    </div>
  </div>
`;

// ── Payment Approved ──────────────────────────────────────────────────────────
exports.sendPaymentApprovedEmail = async ({ to, name, eventName, ticketId }) => {
  await send(to, `Payment Approved — ${eventName}`, `
    <h2 style="color:#16a34a">Payment Approved ✅</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your payment for <strong>${eventName}</strong> has been approved.</p>
    <p>Your ticket ID is: <code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;font-size:14px">${ticketId}</code></p>
    <p>See you at the event!</p>
  `);
};

// ── Payment Rejected ──────────────────────────────────────────────────────────
exports.sendPaymentRejectedEmail = async ({ to, name, eventName, reason }) => {
  await send(to, `Payment Rejected — ${eventName}`, `
    <h2 style="color:#dc2626">Payment Rejected ⚠️</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Unfortunately your payment for <strong>${eventName}</strong> was not approved.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    <p>You may re-register and submit a new payment proof if you believe this was a mistake.</p>
  `);
};

// ── Attendance Confirmed ──────────────────────────────────────────────────────
exports.sendAttendanceEmail = async ({ to, name, eventName }) => {
  await send(to, `Attendance Confirmed — ${eventName}`, `
    <h2 style="color:#6366f1">Attendance Marked 📋</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your attendance for <strong>${eventName}</strong> has been recorded. Enjoy the event!</p>
  `);
};

// ── Password Reset Approved (Organizer) ───────────────────────────────────────
exports.sendPasswordResetApprovedEmail = async ({ to, organizerName, tempPassword, comment }) => {
  await send(to, 'Password Reset Approved', `
    <h2 style="color:#16a34a">Password Reset Approved 🔑</h2>
    <p>Hi <strong>${organizerName}</strong>,</p>
    <p>An admin has approved your password reset request.</p>
    <p>Your temporary password is:</p>
    <p style="background:#f3f4f6;padding:12px 16px;border-radius:8px;font-family:monospace;font-size:16px;text-align:center;letter-spacing:2px">
      ${tempPassword}
    </p>
    ${comment ? `<p><strong>Admin note:</strong> ${comment}</p>` : ''}
    <p><strong>Please change this password immediately after logging in.</strong></p>
  `);
};

// ── Password Reset Rejected (Organizer) ───────────────────────────────────────
exports.sendPasswordResetRejectedEmail = async ({ to, organizerName, comment }) => {
  await send(to, 'Password Reset Rejected', `
    <h2 style="color:#dc2626">Password Reset Rejected</h2>
    <p>Hi <strong>${organizerName}</strong>,</p>
    <p>Your password reset request has been rejected by an admin.</p>
    ${comment ? `<p><strong>Reason:</strong> ${comment}</p>` : ''}
    <p>You may submit a new request if needed.</p>
  `);
};

// ── Event Status Change (notify all registered participants) ──────────────────
exports.sendEventStatusEmail = async ({ to, name, eventName, newStatus }) => {
  const statusMsg = {
    Cancelled: { color: '#dc2626', title: 'Event Cancelled ❌',    body: 'has been <strong>cancelled</strong>. We apologise for the inconvenience.' },
    Completed: { color: '#16a34a', title: 'Event Completed 🎊',    body: 'is now <strong>completed</strong>. Thanks for being part of it!' },
    Ongoing:   { color: '#6366f1', title: 'Event Starting Now 🚀',  body: 'is now <strong>ongoing</strong>. Head to the venue!' },
  }[newStatus];
  if (!statusMsg) return;

  await send(to, `${statusMsg.title} — ${eventName}`, `
    <h2 style="color:${statusMsg.color}">${statusMsg.title}</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>The event <strong>${eventName}</strong> ${statusMsg.body}</p>
  `);
};
