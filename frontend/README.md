# Zanira BuildLink - Frontend

Modern React frontend for the Zanira BuildLink platform.

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- React Router DOM
- Axios
- Zustand (State Management)
- Framer Motion (Animations)
- Lucide React (Icons)
- React Hot Toast (Notifications)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/       # Reusable components
│   └── layout/      # Layout components (Header, Footer)
├── pages/           # Page components
│   ├── auth/        # Authentication pages
│   ├── dashboard/   # Dashboard pages
│   ├── bookings/    # Booking pages
│   └── ...
├── lib/             # Utilities and API
│   ├── axios.js     # Axios instance
│   └── api.js       # API functions
├── store/           # Zustand stores
│   └── authStore.js # Authentication store
├── App.jsx          # Main app component
├── main.jsx         # Entry point
└── index.css        # Global styles
```

## Features

- Beautiful modern UI with Tailwind CSS
- Responsive design for mobile and desktop
- User authentication (Login, Register, Password Reset)
- Role-based dashboards (Client, Fundi, Admin)
- Booking management
- Real-time notifications
- Wallet management
- Messaging system
- Profile management

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
