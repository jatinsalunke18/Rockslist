
/**
 * Centralized Wati (WhatsApp) Helper
 * 
 * CRITICAL: Client-side implementation.
 * API Tokens stored in env variables will be exposed to the client.
 * This is a trade-off for not having a backend (Firebase Spark Plan).
 */

const WATI_CONFIG = {
    API_ENDPOINT: import.meta.env.VITE_WATI_API_ENDPOINT,
    ACCESS_TOKEN: import.meta.env.VITE_WATI_ACCESS_TOKEN,
    TEMPLATE_NAME: import.meta.env.VITE_WATI_TEMPLATE_NAME || 'rsvp_confirmation'
};

/**
 * Sends a WhatsApp confirmation message using Wati
 * Fire-and-forget - never blocks UI
 * 
 * @param {Object} params - WhatsApp parameters
 * @param {Object} params.event - Event details (name, date, time, location)
 * @param {Object} params.guest - Guest details (name, phone)
 */
export async function sendWhatsappConfirmation({ event, guest }) {
    // Skip if validation fails
    if (!guest.phone || !WATI_CONFIG.API_ENDPOINT || !WATI_CONFIG.ACCESS_TOKEN) {
        console.warn('WhatsApp not sent: Missing phone or Wati config');
        return;
    }

    try {
        // Format phone: Remove '+' and ensure it has country code if possible, 
        // Wati usually expects full number with country code. 
        // Assuming input might be various formats, basic cleaning:
        const cleanPhone = guest.phone.replace(/\D/g, '');

        const payload = {
            template_name: WATI_CONFIG.TEMPLATE_NAME,
            broadcast_name: 'RSVP Confirmation',
            parameters: [
                { name: 'name', value: guest.name },
                { name: 'event_name', value: event.name },
                { name: 'event_date', value: event.date },
                { name: 'event_time', value: event.time },
                { name: 'event_location', value: event.location }
            ],
            whatsappNumber: cleanPhone
        };

        const response = await fetch(`${WATI_CONFIG.API_ENDPOINT}/api/v1/sendTemplateMessage?whatsappNumber=${cleanPhone}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WATI_CONFIG.ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Wati API error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        console.log(`✓ WhatsApp sent to ${cleanPhone}`);

    } catch (error) {
        console.error('WhatsApp send failed (non-blocking):', error);
    }
}
