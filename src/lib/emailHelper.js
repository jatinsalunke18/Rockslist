import emailjs from '@emailjs/browser';
import { emailConfig } from './emailConfig';

/**
 * Centralized Email Sending Helper
 * 
 * CRITICAL: Firebase Spark plan - NO Cloud Functions
 * All email sending happens CLIENT-SIDE using EmailJS
 */

/**
 * Sends confirmation email to guest
 * Fire-and-forget - never blocks UI
 * 
 * @param {Object} params - Email parameters
 * @param {Object} params.event - Event details (name, date, time, location, city)
 * @param {Object} params.guest - Guest details (name, email)
 * @param {string} params.addedBy - 'self' | 'organizer'
 * @returns {Promise<void>}
 */
export async function sendConfirmationEmail({ event, guest, addedBy = 'self' }) {
    // Skip if no email or EmailJS not configured
    if (!guest.email || !emailConfig.PUBLIC_KEY || emailConfig.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
        console.warn('Email not sent: Missing email or EmailJS not configured');
        return;
    }
    
    try {
        const message = addedBy === 'organizer' 
            ? `You've been added to the guestlist for ${event.name}!`
            : `Your RSVP for ${event.name} is confirmed!`;
        
        await emailjs.send(
            emailConfig.SERVICE_ID,
            emailConfig.TEMPLATE_ID,
            {
                email: guest.email,
                user_name: guest.name,
                event_name: event.name,
                event_date: event.date,
                event_time: event.time,
                event_location: event.location,
                message: message,
                reply_to: 'noreply@rockslist.com'
            },
            emailConfig.PUBLIC_KEY
        );
        
        console.log(`✓ Confirmation email sent to ${guest.email}`);
    } catch (error) {
        console.error('Email send failed (non-blocking):', error);
        // Never throw - email failure should not break RSVP
    }
}
