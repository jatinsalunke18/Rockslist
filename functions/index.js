const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { sendRsvpConfirmationEmail } = require('./emailService');

admin.initializeApp();

/**
 * Cloud Function: Sends RSVP confirmation emails for all guests
 * Triggers on: Firestore onCreate at lists/{eventId}/rsvps/{rsvpId}
 * 
 * Logic:
 * 1. Fetch RSVP data and event data
 * 2. Send email to ALL guests with email addresses
 * 3. Mark emails as sent to prevent duplicates
 * 4. Log results (non-blocking, failures don't break RSVP)
 */
exports.sendRsvpNotifications = functions.firestore
  .document('lists/{eventId}/rsvps/{rsvpId}')
  .onCreate(async (snap, context) => {
    const rsvpData = snap.data();
    const { eventId, rsvpId } = context.params;

    try {
      // Check if emails already sent to prevent duplicates
      if (rsvpData.emailSent) {
        console.log(`Emails already sent for RSVP ${rsvpId}, skipping`);
        return null;
      }

      // Fetch event details
      const eventDoc = await admin.firestore().collection('lists').doc(eventId).get();
      if (!eventDoc.exists) {
        console.error(`Event ${eventId} not found`);
        return null;
      }
      const eventData = eventDoc.data();

      // Get all guests with email addresses
      const guests = rsvpData.guests || [];
      const guestsWithEmail = guests.filter(guest => guest.email);
      
      if (guestsWithEmail.length === 0) {
        console.log(`No guests with email found in RSVP ${rsvpId}`);
        return null;
      }

      const guestCount = guests.length;

      // Prepare notification data
      const notificationData = {
        rsvpData: { guestCount },
        eventData: {
          name: eventData.name,
          date: eventData.date,
          time: eventData.time,
          location: eventData.location,
          city: eventData.city,
        },
      };

      // Send emails to all guests with email addresses
      const emailPromises = guestsWithEmail.map(guest => 
        sendRsvpConfirmationEmail(guest.email, notificationData.rsvpData, notificationData.eventData)
          .then(result => ({ email: guest.email, ...result }))
      );

      // Wait for all emails to complete
      const results = await Promise.allSettled(emailPromises);

      // Log results
      let successCount = 0;
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { email, success, error } = result.value;
          if (success) {
            console.log(`✓ Email sent to ${email} for RSVP ${rsvpId}`);
            successCount++;
          } else {
            console.warn(`✗ Email failed for ${email} in RSVP ${rsvpId}: ${error}`);
          }
        } else {
          console.error(`Email promise rejected:`, result.reason);
        }
      });

      // Mark emails as sent to prevent duplicates
      await snap.ref.update({ emailSent: true });
      
      console.log(`Email notifications completed for RSVP ${rsvpId}: ${successCount}/${guestsWithEmail.length} sent`);
      return null;
    } catch (error) {
      console.error('Error in sendRsvpNotifications:', error);
      // Don't throw - we don't want to break the RSVP flow
      return null;
    }
  });
