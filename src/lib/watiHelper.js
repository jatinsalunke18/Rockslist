
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

        // --- ADVANCED TOKEN CLEANING ---
        // 1. Remove any surrounding quotes
        let token = (WATI_CONFIG.ACCESS_TOKEN || '').trim().replace(/^["'](.+)["']$/, '$1');

        // 2. Remove any accidental double "Bearer" and ensure single "Bearer " prefix
        token = token.replace(/^(bearer\s+)+/i, ''); // Strip all existing Bearer prefixes
        const authHeader = `Bearer ${token}`;

        if (!token || token === 'undefined' || token.length < 20) {
            console.error('❌ WhatsApp Error: WATI_ACCESS_TOKEN is invalid or too short.', { length: token?.length });
            return;
        }

        const ticketSuffix = `rsvp/${event.id}?rsvpId=${rsvpId}&view=true`;
        const payload = {
            template_name: WATI_CONFIG.TEMPLATE_NAME,
            broadcast_name: 'RSVP Confirmation',
            parameters: [
                { name: "1", value: guest.name || 'Guest' },
                { name: "2", value: event.name || 'Event' },
                { name: "3", value: event.date || 'TBA' },
                { name: "4", value: event.time || 'TBA' },
                { name: "5", value: event.location || 'Venue' },
                { name: "6", value: ticketSuffix } // Try as 6th parameter
            ],
            button_url_parameter: ticketSuffix, // ALSO try as specific button helper
            whatsappNumber: cleanPhone
        };

        const finalUrl = `${baseUrl}/api/v1/sendTemplateMessage?whatsappNumber=${cleanPhone}`;

        // --- DIAGNOSTIC LOG ---
        console.log(`📡 Wati Request:`, {
            url: finalUrl,
            phone: cleanPhone,
            template: WATI_CONFIG.TEMPLATE_NAME,
            buttonSuffix: ticketSuffix
        });

        const response = await fetch(finalUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('❌ Wati API Failed:', {
                status: response.status,
                message: responseData.message || responseData.error || 'Check Wati Token/Quota',
                fullResponse: responseData
            });
            throw new Error(`Wati API error: ${response.status}`);
        }

        // Wati returns 200 OK even if delivery fails in some cases (e.g. quota)
        if (responseData.result === false || responseData.result === 'error' || responseData.errors) {
            const errorMsg = responseData.message || responseData.errors?.[0]?.message || '';

            if (errorMsg.includes('131037')) {
                console.error('🛑 ACTION REQUIRED: Your WhatsApp Display Name needs approval from Meta. Go to Meta Business Manager > WhatsApp Manager to approve it.');
            }

            console.warn('⚠️ Wati accepted request but returned a failure result:', JSON.stringify(responseData, null, 2));
        } else {
            console.log(`✅ Wati Response:`, responseData);
        }

    } catch (error) {
        console.error('WhatsApp send failed (non-blocking):', error.message);
    }
}
