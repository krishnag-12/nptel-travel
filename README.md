# NPTEL Travel Buddy

NPTEL Travel Buddy is a web application designed to help NPTEL exam candidates find travel partners heading to the same exam center at the same time. Save money, reduce carbon footprint, and travel safely by coordinating rides with peers!

## Features

- **Automated Matching:** Simply upload your exam hall ticket (PDF) or manually enter your details (Exam Center, Date, Slot). The system will automatically find exact matches.
- **Smart PDF Parsing:** Robust client-side PDF parsing to extract your name, exam date, center, and slot automatically from your NPTEL Hall Ticket.
- **Notification System:**
  - **In-App Notifications:** Real-time badge and notification dropdown when a travel partner is found.
  - **Email & SMS Delivery:** Automated background workers (via Firebase Cloud Functions) securely dispatch email and SMS notifications.
  - **Preferences Control:** Users can customize their notification preferences (In-app, Email, SMS).
- **Idempotent Queue:** Background workers execute with idempotency to guarantee that users are not spammed with duplicate notifications.
- **Phone Validation:** Strict E.164 phone number validation to ensure smooth SMS delivery.
- **Secure Data Access:** Strict Firestore Security Rules ensure data is only readable/writable by the authenticated owners.

## Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React
- **Backend:** Firebase Cloud Functions (Node.js)
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth (Anonymous & Custom Tokens)
- **PDF Processing:** pdf.js (client-side)

## Deployment

### 1. Deploy Firestore Security Rules
The application uses strict security rules to protect user preferences, matching queues, and logs.
```bash
firebase deploy --only firestore:rules
```

### 2. Deploy Firestore Indexes
Composite indexes are required to sort notifications rapidly by timestamp and read status.
```bash
firebase deploy --only firestore:indexes
```

### 3. Deploy Cloud Functions
The core matching engine and the dispatch workers live in the `functions/` directory. They must be deployed to Google's servers:
```bash
firebase deploy --only functions
```

### 4. Firebase Console Actions
- **Blaze Plan required:** Cloud Functions (Node.js) require the Blaze (pay-as-you-go) plan to deploy and execute.
- **Environment Secrets:** To send real emails or SMS, provide credentials (like Nodemailer SMTP or Twilio API keys) in the Firebase Secret Manager or via `firebase functions:config:set`.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Contributing
Feel free to open issues or submit pull requests if you want to improve the NPTEL Travel Buddy project!
