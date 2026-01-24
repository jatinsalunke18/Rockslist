# Rockslist - Event Guestlist Management Platform

A modern, mobile-first web application for managing event guestlists with real-time RSVP tracking, friend management, and identity-based user linking.

## Features

- **Event Management**: Create, edit, and manage event guestlists
- **RSVP System**: Join events, add guests, view/edit entries
- **Friends System**: Auto-save guests as friends for future events
- **Identity Linking**: Automatically link friends when they sign up
- **Search**: Real-time event search by name, venue, city
- **Authentication**: Google Sign-In and Phone Authentication
- **Real-time Updates**: Live capacity tracking and RSVP status

## Tech Stack

- **Frontend**: React 19 + Vite
- **Routing**: React Router v7
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Styling**: Custom CSS with mobile-first design
- **Icons**: Font Awesome

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Auth, Firestore, and Storage enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/rockslist-react.git
cd rockslist-react
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Add your Firebase configuration to `.env`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

5. Start the development server:
```bash
npm run dev
```

## Firebase Setup

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed Firebase configuration instructions.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React Context providers
├── lib/           # Firebase configuration
├── pages/         # Application screens
├── App.jsx        # Main app component with routing
└── index.css      # Global styles
```

## Key Features

### RSVP Management
- Create RSVPs with multiple guests
- View/Edit existing entries
- Exit guestlist functionality
- Real-time capacity tracking

### Friends System
- Auto-save guests as friends
- Reuse friends in future RSVPs
- Identity-based linking via email
- "On Rocklist" badge for registered users

### Event Discovery
- Browse upcoming events
- Real-time search
- Event details with capacity indicators
- Share events via Web Share API

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
