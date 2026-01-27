# Notification System Setup

Rockslist uses **EmailJS** for emails and **Wati** for WhatsApp notifications. Since the project runs on the Firebase Spark (free) plan, these notifications are sent directly from the client-side browser.

---

## 📧 Email Notifications (EmailJS)

1.  **Create Account**: Sign up at [emailjs.com](https://www.emailjs.com/).
2.  **Add Service**: Connect your email provider (Gmail, Outlook, etc.).
3.  **Create Template**: Create a template with the following variables:
    *   `{{user_name}}`: Name of the sender/guest
    *   `{{event_name}}`: Name of the event
    *   `{{event_date}}`: Date of the event
    *   `{{event_time}}`: Time of the event
    *   `{{event_location}}`: Venue
    *   `{{message}}`: The confirmation message
    *   `{{email}}`: Recipient email
4.  **Update .env**:
    ```env
    VITE_EMAILJS_SERVICE_ID=your_id
    VITE_EMAILJS_TEMPLATE_ID=your_id
    VITE_EMAILJS_PUBLIC_KEY=your_key
    ```

---

## 💬 WhatsApp Notifications (Wati)

1.  **API Endpoint**: Get your API Endpoint from the Wati Dashboard (API Docs section).
2.  **Access Token**: Generate or copy your API Access Token.
3.  **Message Template**: Create and **approve** a template in Wati.
    *   **Parameters**: The template should accept 5 parameters in this order: `name`, `event_name`, `event_date`, `event_time`, `event_location`.
4.  **Update .env**:
    ```env
    VITE_WATI_API_ENDPOINT=https://your-server.wati.io
    VITE_WATI_ACCESS_TOKEN=your_token
    VITE_WATI_TEMPLATE_NAME=rsvp_confirmation
    ```

### Important: Phone Number Format
Wati requires the phone number with country code. The app automatically prepends `+91` (India) and cleans the number to a digits-only format (e.g., `919876543210`) before sending.

---

## ⚠️ Client-side Security Note
Because these are sent from the frontend (no backend server), your API keys for EmailJS and Wati are exposed in the JavaScript bundle.
*   **EmailJS**: Uses a Public Key, which is safe for client-side.
*   **Wati**: Uses a Bearer Token. Ensure you set up Wati **API IP Whitelisting** if possible, or monitor usage regularly.