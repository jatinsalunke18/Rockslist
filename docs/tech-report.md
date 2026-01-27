# Rockslist Tech Stack & Tools Report

This report provides a comprehensive overview of the technologies, tools, and architectural decisions used in the Rockslist project.

---

## 🏗️ Core Architecture & Frameworks

### Frontend: React 19
The application is built using the latest version of React (v19.2.0), utilizing modern patterns like:
- Functional Components with Hooks (useState, useEffect, useContext, etc.).
- Context API for global state management (specifically AuthContext for user session handling).
- Vite (v7.2.4) as the fast build tool and development server.

### Backend & Infrastructure: Firebase
Rockslist leverages the full Firebase Ecosystem (v12.8.0) to handle all backend requirements:
- Firebase Authentication: Secure user sign-in and session management.
- Cloud Firestore: NoSQL real-time database for events, rsvps, and profiles.
- Firebase Storage: Hosting for event flyers and user media.
- Firebase Cloud Functions: Serverless Node.js functions for backend logic.

---

## 🎨 Design & Styling

Rockslist uses a custom-built design system implemented in pure CSS to achieve a premium mobile-app feel.

### Key Design Features:
- Mobile-First Approach: Optimized for mobile, constrained to 480px on desktop.
- CSS Variables: Centralized design tokens for colors, spacing, and typography.
- Glassmorphism: Modern blur effects and semi-transparent layers.
- Typography: Uses 'DM Sans' as the primary font with fallbacks.

### Icons
- Lucide React (v0.562.0): Lightweight SVG icons for consistent UI navigation.

---

## 🛣️ Routing & Navigation

- React Router Dom (v7.12.0): Client-side routing management.
- Route Guards: Conditional rendering based on Auth state.
- Custom Navigation: Persistent BottomNav for mobile-native user experience.

---

## 📩 Communication & Notifications (Cloud Functions)

- Nodemailer: Sends transactional emails via SMTP through Firebase Functions.
- WhatsApp Service: Pre-architected service for Twilio integration (currently in Mock Mode for MVP).

---

## 🛠️ Utility & Developer Tools

- ESLint (v9.39.1): Code quality and linting.
- Custom Validation: Dedicated logic for phone/email normalization and duplicate guest detection.
- Environment Management: Secure .env configuration for API keys.

---

## 📂 Project Structure

/src
  /components     # Reusable UI elements
  /contexts       # Global logic (AuthContext)
  /lib            # Utility/API libraries
  /pages          # 15+ Unique screens
  index.css       # Core design system
/functions        # Backend logic (Email, WhatsApp)
/scripts          # Database maintenance scripts
/public           # Static assets
