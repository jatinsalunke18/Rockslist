const nodemailer = require('nodemailer');

/**
 * Email service using Nodemailer + Gmail SMTP (free tier)
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in Firebase config
 */

let transporter = null;

function initTransporter(gmailUser, gmailAppPassword) {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
  }
  return transporter;
}

async function sendRsvpConfirmationEmail(email, rsvpData, eventData) {
  try {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      console.warn('Email credentials not configured, skipping email');
      return { success: false, error: 'Email not configured' };
    }

    const transport = initTransporter(gmailUser, gmailAppPassword);

    const mailOptions = {
      from: `Rockslist <${gmailUser}>`,
      to: email,
      subject: `RSVP Confirmed: ${eventData.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🎉 RSVP Confirmed!</h2>
          <p>Your spot is reserved for:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${eventData.name}</h3>
            <p><strong>📅 Date:</strong> ${eventData.date} at ${eventData.time}</p>
            <p><strong>📍 Venue:</strong> ${eventData.location}, ${eventData.city}</p>
            <p><strong>👥 Party Size:</strong> ${rsvpData.guestCount} ${rsvpData.guestCount === 1 ? 'person' : 'people'}</p>
          </div>
          <p>See you there!</p>
          <p style="color: #666; font-size: 12px;">- Rockslist Team</p>
        </div>
      `,
    };

    await transport.sendMail(mailOptions);
    console.log(`Email sent successfully to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendRsvpConfirmationEmail };
