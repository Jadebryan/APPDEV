# Google Sign-In Setup

This guide walks you through getting **Google** login working in Run Barbie. You need to create an OAuth app in Google Cloud Console and add the Client ID to your RunBarbie `.env` file.

---

## Part 1: Get your Expo redirect URI

Before configuring Google, you need the redirect URI that Expo uses when the user returns from the browser.

1. Open a terminal in the **RunBarbie** folder.
2. Run:
   ```bash
   npx expo whoami
   ```
   Note the username shown (e.g. `yourname`). If it says "Not logged in", run `npx expo login` and sign in.
3. Your app slug is in **RunBarbie/app.json** under `expo.slug` (e.g. `run-barbie`).
4. Your **redirect URI** will be:
   ```
   https://auth.expo.io/@YOUR_EXPO_USERNAME/run-barbie
   ```
   Replace `YOUR_EXPO_USERNAME` with the username from step 2, and `run-barbie` with your slug if it’s different.

**Example:** If `expo whoami` shows `johndoe` and slug is `run-barbie`, the redirect URI is:
```
https://auth.expo.io/@johndoe/run-barbie
```

Keep this URI handy; you’ll add it in Google Cloud Console.

---

## Part 2: Google Cloud Console (Google Sign-In)

### 2.1 Create or select a project

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Sign in with your Google account.
3. In the top bar, click the **project dropdown** (e.g. "My First Project").
4. Click **"New Project"**.
   - Name it (e.g. "Run Barbie").
   - Click **Create**.
5. Make sure the new project is selected in the dropdown.

### 2.2 Enable required APIs (optional)

1. In the left menu go to **APIs & Services** → **Library**.
2. For OAuth login you mainly need the **OAuth consent screen** and **Credentials**; no extra API is required for basic sign-in. You can skip this step.

### 2.3 Configure the OAuth consent screen

1. Go to **APIs & Services** → **OAuth consent screen** (left menu).
2. **User Type:** choose **External** (so any Google user with a Gmail/personal account can sign in).
   - **Internal** = only your Google Workspace organization; use **External** for a public app like Run Barbie.
   Click **Create**.
3. Fill in:
   - **App name:** Run Barbie (or your app name).
   - **User support email:** Your email.
   - **Developer contact email:** Your email.
4. Click **Save and Continue**.
5. **Scopes:** Click **Add or Remove Scopes**. Add:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   Click **Update** → **Save and Continue**.
6. **Test users:** If the app is in "Testing" mode, you can add test Gmail addresses. Otherwise click **Save and Continue**.
7. Review the summary and click **Back to Dashboard**.

### 2.4 Create OAuth 2.0 credentials (Web client)

1. Go to **APIs & Services** → **Credentials** (left menu).
2. Click **+ Create Credentials** → **OAuth client ID**.
3. **Application type:** choose **Web application**.
4. **Name:** e.g. "Run Barbie Web".
5. Under **Authorized redirect URIs** click **Add URI** and paste:
   ```
   https://auth.expo.io/@YOUR_EXPO_USERNAME/run-barbie
   ```
   Use the exact redirect URI you wrote down in Part 1.
6. Click **Create**.
7. A popup shows your **Client ID** and **Client secret**. You only need the **Client ID** (long string ending in `.apps.googleusercontent.com`).

### 2.5 Add to RunBarbie .env

1. Open **RunBarbie/.env**.
2. Add or edit:
   ```
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
   ```
   Paste the full Client ID; do **not** put the Client secret in the app.

---

## Part 3: Final .env example

Your **RunBarbie/.env** should look something like this (values replaced with yours):

```env
# API (required for real backend)
EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api

# Optional: trail events (separate from sign-in)
EXPO_PUBLIC_FACEBOOK_ACCESS_TOKEN=

# Google sign-in (from steps above)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
```

Restart the Expo dev server after changing `.env` (`npm start` or `npx expo start`).

---

## Troubleshooting

- **"Access blocked: Authorization Error" / Error 400: invalid_request**  
  Your OAuth consent screen is in **Testing** mode. Only **Test users** can sign in.

  1. Go to **[Google Cloud Console](https://console.cloud.google.com/)** → your project.
  2. **APIs & Services** → **OAuth consent screen** (left menu).
  3. Scroll to **Test users**.
  4. Click **+ ADD USERS**.
  5. Add the Gmail address you use to sign in (e.g. `bryanjade375@gmail.com`) and any other test accounts. Click **Save**.
  6. Try Google sign-in again. It can take a minute for changes to apply.

  Also ensure your **Authorized redirect URIs** (under Credentials → your Web client) exactly match:  
  `https://auth.expo.io/@YOUR_EXPO_USERNAME/run-barbie` (get your username with `npx expo whoami` in RunBarbie).

- **Google: "Redirect URI mismatch"**  
  The redirect URI in Google Console must match **exactly** (including `https://`, no trailing slash):  
  `https://auth.expo.io/@YOUR_USERNAME/run-barbie`

- **"Sign-in is not configured"**  
  Ensure the variable name is exactly `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and that you restarted Expo after editing `.env`.

- **Expo Go:** Google sign-in uses the browser and works in Expo Go. No native build is required for this flow.
