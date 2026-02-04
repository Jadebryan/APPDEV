# Run Barbie 🎀 — Project

This repository contains the **Run Barbie** app and its backend server.

## Project structure

```
.
├── RunBarbie/     ← React Native (Expo) app — all client code
└── server/        ← Node.js backend (API)
```

## Quick start

### Run the app (RunBarbie)

```bash
cd RunBarbie
npm install
npx expo start
```

### Run the server (backend)

```bash
cd server
npm install
# Set up .env from .env.example (MONGODB_URI, JWT_SECRET, PORT)
node index.js
```

## Documentation

- **App setup & usage:** see `RunBarbie/README.md`
- **Server:** configure via `.env` at project root (copy from `.env.example`)
