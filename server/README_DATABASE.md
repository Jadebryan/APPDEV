# Start the database for login

Use these steps so the app uses **MongoDB** for register and login instead of mock data.

---

## 1. Choose MongoDB: local or Atlas

### Option A: MongoDB Atlas (no local install)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. Create a **free cluster** (e.g. M0).
3. Click **Connect** → **Drivers** → copy the connection string.
4. Replace `<password>` with your database user password (create a user in Atlas if needed).
5. In `server/.env` set:
   ```env
   MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/runbarbie?retryWrites=true&w=majority
   JWT_SECRET=your-secret-key-change-in-production
   PORT=3000
   ```

### Option B: MongoDB on your computer

1. Install MongoDB: [Windows](https://www.mongodb.com/try/download/community) / [Mac](https://www.mongodb.com/docs/manual/administration/install-on-linux/) (or `brew install mongodb-community`).
2. Start MongoDB (e.g. run `mongod` or start the “MongoDB Server” service).
3. In `server/.env` keep or set:
   ```env
   MONGODB_URI=mongodb://localhost:27017/runbarbie
   JWT_SECRET=your-secret-key-change-in-production
   PORT=3000
   ```

---

## 2. Install server dependencies

From the folder that contains `server` (e.g. **APP DEV**):

```bash
cd server
npm install
```

This installs Express, Mongoose, JWT, etc. (see `server/package.json`).

---

## 3. Start the server

From the **server** folder:

```bash
cd server
npm start
```

Or from the **project root** (if you have `"start:server": "cd server && node index.js"`):

```bash
npm run start:server
```

You should see:

- `✅ Connected to MongoDB`
- `🚀 Server running on port 3000`

If you see `❌ MongoDB connection error`, check:

- **Atlas:** correct `MONGODB_URI`, password, and IP access (Network Access → allow your IP or `0.0.0.0/0` for testing).
- **Local:** MongoDB is running and `MONGODB_URI=mongodb://localhost:27017/runbarbie` in `server/.env`.

---

## 4. Use the real API in the app for login

1. Open **RunBarbie/src/services/api.ts**.
2. Set:
   ```ts
   const USE_MOCK_DATA = false;
   ```
3. Set the API URL so the app can reach the server:
   - **Emulator:** `http://localhost:3000/api` is usually fine.
   - **Physical device:** use your computer’s IP, e.g. `http://192.168.1.100:3000/api`.  
     Run `node get-ip.js` from RunBarbie (or check your network settings) to get the IP.
   ```ts
   const API_BASE_URL = __DEV__
     ? 'http://YOUR_IP:3000/api'   // e.g. http://192.168.1.100:3000/api
     : 'https://your-production-url.com/api';
   ```

4. Restart the app (Expo).

After this, **Register** and **Login** use the database; new users are stored in MongoDB and JWT is used for auth.

---

## 5. Email verification (Gmail)

Registration sends a **6-digit verification code** to the user’s email. They must enter it on the **Verify email** screen before they can use the app.

- **Without sending email:** Comment out or remove the `SMTP_*` lines in `server/.env`. The server will log the code to the console (e.g. `[Email] No SMTP configured. Verification code for user@example.com : 123456`). Use that code in the app to verify.
- **With Gmail:** In `server/.env` set `SMTP_USER` to your Gmail address and `SMTP_PASS` to a **Gmail App Password** (not your normal password). To create one: **Google Account → Security → 2-Step Verification → App passwords** → generate a password for “Mail”. The `.env` is already set up with `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587`.

---

## Summary

| Step | What to do |
|------|------------|
| 1 | Get MongoDB (Atlas or local) and set `MONGODB_URI` in `server/.env` |
| 2 | Run `node index.js` (or `npm run start:server`) from the `server` folder |
| 3 | Set `USE_MOCK_DATA = false` and correct `API_BASE_URL` in `api.ts` |
| 4 | Restart the app and use Register / Login |

If the server and app are on the same machine, `MONGODB_URI=mongodb://localhost:27017/runbarbie` in `server/.env` is already correct for local MongoDB.
