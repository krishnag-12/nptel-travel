const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// Note: Replace with actual SMTP config or use Firebase Extensions in production.
const mailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().email ? functions.config().email.user : "test@example.com",
    pass: functions.config().email ? functions.config().email.pass : "test",
  },
});

exports.processNewRequest = functions.firestore
  .document("artifacts/{appId}/public/data/travelRequests/{requestId}")
  .onCreate(async (snap, context) => {
    const newRequest = snap.data();
    const requestId = context.params.requestId;
    const appId = context.params.appId;

    // Find overlapping requests
    let queryRef = db.collection(`artifacts/${appId}/public/data/travelRequests`)
      .where("examDate", "==", newRequest.examDate)
      .where("examSlot", "==", newRequest.examSlot);

    if (newRequest.placeId) {
      queryRef = queryRef.where("placeId", "==", newRequest.placeId);
    } else if (newRequest.searchCenter) {
      queryRef = queryRef.where("searchCenter", "==", newRequest.searchCenter);
    }

    const snapshot = await queryRef.get();
    
    const batch = db.batch();
    let matchCreated = false;

    snapshot.forEach((doc) => {
      if (doc.id !== requestId && doc.data().userId !== newRequest.userId) {
        const matchData = {
          userIds: [newRequest.userId, doc.data().userId],
          requestIds: [requestId, doc.id],
          examDate: newRequest.examDate,
          examSlot: newRequest.examSlot,
          examCenter: newRequest.examCenter,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Create a unique deterministic ID to prevent duplicates
        const ids = [newRequest.userId, doc.data().userId].sort();
        const matchId = `${ids[0]}_${ids[1]}_${newRequest.examDate}`;
        
        const matchRef = db.collection("matches").doc(matchId);
        batch.set(matchRef, matchData, { merge: true });
        matchCreated = true;
      }
    });

    if (matchCreated) {
      await batch.commit();
    }
    return null;
  });

exports.processNewMatch = functions.firestore
  .document("matches/{matchId}")
  .onCreate(async (snap, context) => {
    const match = snap.data();
    const matchId = context.params.matchId;

    const batch = db.batch();

    // Create in-app notifications and queue entries for each user
    for (const userId of match.userIds) {
      const otherUserId = match.userIds.find((id) => id !== userId);

      // In-app Notification
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        userId: userId,
        matchId: matchId,
        type: "NEW_MATCH",
        title: "New Travel Partner Found!",
        message: `We found a travel partner for your exam at ${match.examCenter} on ${match.examDate}.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });

      // Notification Queue for Email/SMS
      const queueRef = db.collection("notificationQueue").doc();
      batch.set(queueRef, {
        userId: userId,
        otherUserId: otherUserId,
        matchId: matchId,
        type: "NEW_MATCH",
        status: "PENDING",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        retryCount: 0,
      });
    }

    await batch.commit();
    return null;
  });

exports.dispatchNotificationWorker = functions.firestore
  .document("notificationQueue/{queueId}")
  .onWrite(async (change, context) => {
    // Only process on create or when status is set back to PENDING (for retry)
    if (!change.after.exists) return null;
    
    const task = change.after.data();
    const queueId = context.params.queueId;
    
    if (task.status !== "PENDING") return null;

    const queueRef = change.after.ref;
    
    try {
      // Mark as PROCESSING to prevent duplicate execution
      await queueRef.update({ status: "PROCESSING", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

      // Fetch user preferences
      const prefDoc = await db.collection("notificationPreferences").doc(task.userId).get();
      const prefs = prefDoc.exists ? prefDoc.data() : { email: true, sms: true, inApp: true }; // Default to true

      // Fetch user email/phone from travelRequests
      const requestsSnap = await db.collectionGroup("travelRequests").where("userId", "==", task.userId).limit(1).get();
      if (requestsSnap.empty) throw new Error("User data not found");
      const userData = requestsSnap.docs[0].data();

      const otherSnap = await db.collectionGroup("travelRequests").where("userId", "==", task.otherUserId).limit(1).get();
      const otherData = otherSnap.empty ? { name: "A student" } : otherSnap.docs[0].data();

      const matchDoc = await db.collection("matches").doc(task.matchId).get();
      const matchData = matchDoc.data();

      // Send Email
      if (prefs.email !== false && userData.email) {
        const mailOptions = {
          from: `"NPTEL Travel Buddy" <noreply@nptel-travel.com>`,
          to: userData.email,
          subject: "🎉 You have a new travel partner match!",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #4F46E5;">Hello ${userData.name},</h2>
              <p>Congratulations 🎉 We found a travel partner for your upcoming NPTEL exam!</p>
              <div style="background: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Partner:</strong> ${otherData.name}</p>
                <p style="margin: 5px 0;"><strong>Exam Date:</strong> ${matchData.examDate}</p>
                <p style="margin: 5px 0;"><strong>Slot:</strong> ${matchData.examSlot}</p>
                <p style="margin: 5px 0;"><strong>Center:</strong> ${matchData.examCenter}</p>
              </div>
              <p style="margin-top: 30px;">
                <a href="https://krishnag-12.github.io/nptel-travel/" style="padding:12px 24px; background:#4F46E5; color:white; text-decoration:none; border-radius:6px; font-weight: bold; display: inline-block;">Open NPTEL Travel Buddy</a>
              </p>
            </div>
          `,
        };
        
        try {
          // Uncomment and mock actual delivery delay in a real scenario
          // await mailTransport.sendMail(mailOptions);
          console.log(`Mock Email sent to ${userData.email}`);
          await db.collection("emailLogs").add({
            userId: task.userId,
            matchId: task.matchId,
            status: "SUCCESS",
            email: userData.email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (e) {
          await db.collection("emailLogs").add({
            userId: task.userId,
            matchId: task.matchId,
            status: "FAILED",
            error: e.message,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Send SMS
      if (prefs.sms !== false && userData.mobile) {
        try {
          // Mock SMS send
          console.log(`Mock SMS sent to ${userData.mobile}`);
          await db.collection("smsLogs").add({
            userId: task.userId,
            matchId: task.matchId,
            status: "SUCCESS",
            phone: userData.mobile,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (e) {
          await db.collection("smsLogs").add({
            userId: task.userId,
            matchId: task.matchId,
            status: "FAILED",
            error: e.message,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Mark task as complete
      await queueRef.update({
        status: "COMPLETED",
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error("Error processing notification queue:", error);
      
      const newRetryCount = (task.retryCount || 0) + 1;
      const newStatus = newRetryCount > 3 ? "FAILED" : "PENDING";
      
      await queueRef.update({
        status: newStatus,
        error: error.message,
        retryCount: newRetryCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return null;
  });
