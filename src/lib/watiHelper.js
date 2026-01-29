
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
    TEMPLATE_NAME: import.meta.env.VITE_WATI_TEMPLATE_NAME || 'rsvp_confirmation',
    BASE_URL: import.meta.env.VITE_APP_URL || window.location.origin
};

/**
 * Sends a WhatsApp confirmation message using Wati
 * Fire-and-forget - never blocks UI
 * 
 * @param {Object} params - WhatsApp parameters
 * @param {Object} params.event - Event details (name, date, time, location)
 * @param {Object} params.guest - Guest details (name, phone)
 * @param {string} params.rsvpId - The created RSVP ID for the ticket link
 */
export async function sendWhatsappConfirmation({ event, guest, rsvpId }) {
    // Skip if validation fails
    if (!guest.phone || !WATI_CONFIG.API_ENDPOINT || !WATI_CONFIG.ACCESS_TOKEN) {
        console.error('❌ WhatsApp skip: Missing config', {
            hasPhone: !!guest.phone,
            hasEndpoint: !!WATI_CONFIG.API_ENDPOINT,
            hasToken: !!WATI_CONFIG.ACCESS_TOKEN
        });
        return;
    }

    try {
        const cleanPhone = guest.phone.replace(/\D/g, '');
        const baseUrl = (WATI_CONFIG.API_ENDPOINT || '').trim().replace(/\/$/, '');

        // Clean token: Remove quotes if any, trim whitespace
        let rawToken = (WATI_CONFIG.ACCESS_TOKEN || '').trim();
        if (rawToken.startsWith('"') && rawToken.endsWith('"')) {
            rawToken = rawToken.slice(1, -1);
        }

        const authHeader = rawToken.toLowerCase().startsWith('bearer ')
            ? rawToken
            : `Bearer ${rawToken}`;

        if (!rawToken || rawToken === 'undefined') {
            console.error('❌ WhatsApp Error: WATI_ACCESS_TOKEN is missing or undefined.');
            return;
        }

        // Wati Dynamic Buttons work by taking the 'Base URL' in the dashboard
        // and appending this 'Suffix' (parameter 6) to it.
        const ticketSuffix = `rsvp/${event.id}?rsvpId=${rsvpId}&view=true`;

        const payload = {
            template_name: WATI_CONFIG.TEMPLATE_NAME,
            broadcast_name: 'RSVP Confirmation',
            parameters: [
                { name: 'name', value: guest.name },
                { name: 'event_name', value: event.name },
                { name: 'event_date', value: event.date },
                { name: 'event_time', value: event.time },
                { name: 'event_location', value: event.location },
                { name: 'ticket_link', value: ticketSuffix }
            ],
            whatsappNumber: cleanPhone
        };

        console.log(`⏳ Sending WhatsApp to ${cleanPhone}...`, {
            endpoint: `${baseUrl}/api/v1/sendTemplateMessage`,
            tokenLength: rawToken.length,
            template: WATI_CONFIG.TEMPLATE_NAME
        });

        const response = await fetch(`${baseUrl}/api/v1/sendTemplateMessage?whatsappNumber=${cleanPhone}`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('❌ Wati API Error Detail:', {
                status: response.status,
                data: responseData,
                endpoint: baseUrl
            });
            throw new Error(`Wati API error: ${response.status}`);
        }

        console.log(`✅ WhatsApp sent successfully to ${cleanPhone}:`, responseData);

    } catch (error) {
        console.error('WhatsApp send failed (non-blocking):', error.message);
    }
}
