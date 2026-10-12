# 📬 NPTEL Travel Buddy - Autocrat & Gmail Setup Guide

This guide explains how to connect your **Google Sheet & Autocrat** (running under your personal email **`expertszone4@gmail.com`**) to send automated emails to students when they match on NPTEL Travel Buddy.

---

## 🎯 Architecture Overview
1. **Student Match**: When two students register for the same exam center, date, and slot on NPTEL Travel Buddy, the web app detects an exact match.
2. **Instant Bridge**: The app automatically sends a POST payload to your Google Apps Script Web App.
3. **Google Sheet & Autocrat**:
   - The script creates/appends the match rows in your Google Sheet (`Travel_Matches`).
   - Autocrat merges the row details and sends personalized notification emails directly from **`expertszone4@gmail.com`**.
   - The script also has built-in immediate Gmail delivery via `MailApp.sendEmail()` so emails can dispatch instantly!

---

## 🚀 5-Minute Setup Steps

### Step 1: Create the Google Sheet
1. Log in to Google with **`expertszone4@gmail.com`**.
2. Open [Google Sheets](https://sheets.new) and create a new sheet.
3. Rename the sheet to: `NPTEL Travel Buddy - Matches`.

---

### Step 2: Add the Google Apps Script
1. In the Google Sheet menu bar, click **Extensions** > **Apps Script**.
2. Erase any default code in `Code.gs`.
3. Open [`scripts/autocrat-google-apps-script.js`](./scripts/autocrat-google-apps-script.js) from this repository, copy its entire contents, and paste it into the editor.
4. Click the **Save** (💾 disk) icon.

---

### Step 3: Deploy as Web App
1. In the upper-right corner of the Apps Script editor, click **Deploy** > **New deployment**.
2. Click the gear icon (⚙️) next to *Select type* and select **Web app**.
3. Set the fields:
   - **Description**: `NPTEL Travel Buddy Match Webhook`
   - **Execute as**: `Me (expertszone4@gmail.com)`
   - **Who has access**: `Anyone` *(Crucial: allows the browser app to submit match rows)*
4. Click **Deploy**.
5. Google will ask you to **Authorize access**:
   - Click *Review permissions*
   - Select your account (`expertszone4@gmail.com`)
   - Click *Advanced* > *Go to NPTEL Travel Buddy (unsafe)*
   - Click *Allow*
6. Copy the generated **Web app URL** (starts with `https://script.google.com/macros/s/.../exec`).

---

### Step 4: Configure in the Web App
You have two easy ways to set your Web App URL:

- **Option A (Instant in UI)**:
  Open the deployed web app or local app, click the notification bell / gear icon (**Notification Settings**), paste your Web App URL into the **Autocrat / Google Sheets Webhook URL** field, and click **Save Preferences**.
  
- **Option B (Vercel / .env)**:
  Add the environment variable in your Vercel project settings or `.env`:
  ```env
  VITE_AUTOCRAT_WEBHOOK_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
  ```

---

### Step 5 (Optional): Set Up Autocrat Add-on in Google Sheets
If you want to use the Autocrat add-on's document merge & email template system:
1. In your Google Sheet, go to **Extensions** > **Add-ons** > **Get add-ons**.
2. Search for **Autocrat** and click **Install**.
3. Open **Extensions** > **Autocrat** > **Open**.
4. Click **New Job** and name it `NPTEL Travel Match Alerts`.
5. Select a Google Doc template or choose send-as-email.
6. Map the merge tags from the `Travel_Matches` sheet:
   - `<<Recipient Name>>`
   - `<<Recipient Email>>`
   - `<<Partner Name>>`
   - `<<Partner Email>>`
   - `<<Partner Mobile>>`
   - `<<Exam Center>>`
   - `<<Exam Date>>`
   - `<<Exam Slot>>`
7. In Step 9 ("Add/remove job triggers"):
   - Turn ON **Run on form trigger** or **Run on time trigger** (e.g. Every 1 hour).
8. Save!

---

## 🧪 Testing the Webhook
You can test the deployment at any time:
1. Paste your Web App URL into your browser address bar. It will return:
   ```json
   {"status":"active","service":"NPTEL Travel Buddy - Autocrat & Gmail Integration","senderAccount":"expertszone4@gmail.com"}
   ```
2. Or in Apps Script, select the `testSendNotification` function and click **Run** to send a test email to `expertszone4@gmail.com` immediately!
