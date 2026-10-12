/**
 * =========================================================================
 * NPTEL TRAVEL BUDDY - AUTOCRAT & GOOGLE SHEETS MESSAGING WEBHOOK
 * =========================================================================
 * 
 * Account to deploy this on: expertszone4@gmail.com
 * 
 * INSTRUCTIONS TO DEPLOY:
 * 1. Open Google Sheets (https://sheets.new) logged in as expertszone4@gmail.com.
 * 2. Name the sheet: "NPTEL Travel Buddy - Matches".
 * 3. In the top menu, go to Extensions > Apps Script.
 * 4. Delete any code in the editor and paste THIS ENTIRE FILE.
 * 5. Click "Save" (disk icon).
 * 6. Click "Deploy" > "New deployment".
 *    - Click the gear icon next to "Select type" and select "Web app".
 *    - Description: "NPTEL Match Webhook"
 *    - Execute as: "Me (expertszone4@gmail.com)"
 *    - Who has access: "Anyone" (crucial for web app to send notifications)
 * 7. Click "Deploy", review permissions, and authorize with your Google account.
 * 8. Copy the "Web app URL" (starts with https://script.google.com/macros/s/...).
 * 9. Save this URL in your web app:
 *    - In .env file: VITE_AUTOCRAT_WEBHOOK_URL="https://script.google.com/macros/s/..."
 *    - Or paste it into the Web App Notification Settings dialog.
 * 
 * AUTOCRAT USAGE:
 * - Install Autocrat from Google Workspace Marketplace in your Google Sheet.
 * - Set up a job that uses the "Travel_Matches" sheet.
 * - Use the merge tags: <<Recipient Name>>, <<Partner Name>>, <<Exam Center>>, <<Exam Date>>, <<Exam Slot>>.
 * =========================================================================
// OPTIONAL: If you create this script directly at script.google.com (standalone project),
// paste your Google Sheet URL or ID below. If opened via Extensions > Apps Script, leave it blank.
const SPREADSHEET_ID_OR_URL = "";

function setupSheet() {
  let ss;
  if (SPREADSHEET_ID_OR_URL && SPREADSHEET_ID_OR_URL.trim() !== "") {
    const target = SPREADSHEET_ID_OR_URL.trim();
    ss = target.startsWith("http") ? SpreadsheetApp.openByUrl(target) : SpreadsheetApp.openById(target);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  let sheet = ss.getSheetByName("Travel_Matches");
  if (!sheet) {
    sheet = ss.insertSheet("Travel_Matches");
    const headers = [
      "Timestamp",
      "Recipient Name",
      "Recipient Email",
      "Recipient Mobile",
      "Partner Name",
      "Partner Email",
      "Partner Mobile",
      "Exam Center",
      "Exam Date",
      "Exam Slot",
      "Email Status"
    ];
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4F46E5");
    headerRange.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    const sheet = setupSheet();
    let data = {};

    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "error", message: "No post data received" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const events = Array.isArray(data.events) ? data.events : [data];
    let processedCount = 0;

    events.forEach(function (evt) {
      const timestamp = new Date();
      let emailStatus = "Recorded";

      // Try sending direct email from expertszone4@gmail.com
      if (evt.recipientEmail) {
        try {
          sendDirectEmail(evt);
          emailStatus = "Sent directly via expertszone4@gmail.com";
        } catch (mailErr) {
          emailStatus = "Mail Error: " + mailErr.toString();
        }
      }

      sheet.appendRow([
        timestamp,
        evt.recipientName || "",
        evt.recipientEmail || "",
        evt.recipientMobile || "",
        evt.partnerName || "",
        evt.partnerEmail || "",
        evt.partnerMobile || "",
        evt.examCenter || "",
        evt.examDate || "",
        evt.examSlot || "",
        emailStatus
      ]);

      processedCount++;
    });

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", processed: processedCount })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "active",
      service: "NPTEL Travel Buddy - Autocrat & Gmail Integration",
      senderAccount: "expertszone4@gmail.com",
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function sendDirectEmail(evt) {
  const subject = "🎉 Travel Partner Found for NPTEL Exam - " + evt.examDate;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #818cf8; margin-bottom: 4px; font-size: 24px;">NPTEL Travel Buddy</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 0;">Exam Day Coordination Notification</p>
      </div>

      <p style="font-size: 16px; line-height: 1.5;">Hi <strong>${evt.recipientName}</strong>,</p>
      
      <p style="font-size: 15px; line-height: 1.5; color: #cbd5e1;">
        Great news! We found a fellow student travelling to the exact same exam center for the same slot.
      </p>

      <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #475569;">
        <h3 style="color: #38bdf8; margin-top: 0; margin-bottom: 12px; font-size: 16px;">Exam Details:</h3>
        <ul style="list-style: none; padding-left: 0; margin: 0; font-size: 14px; line-height: 1.8;">
          <li>📍 <strong>Center:</strong> ${evt.examCenter}</li>
          <li>📅 <strong>Date:</strong> ${evt.examDate}</li>
          <li>⏰ <strong>Slot:</strong> ${evt.examSlot}</li>
        </ul>
      </div>

      <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #475569;">
        <h3 style="color: #4ade80; margin-top: 0; margin-bottom: 12px; font-size: 16px;">Your Travel Partner:</h3>
        <ul style="list-style: none; padding-left: 0; margin: 0; font-size: 14px; line-height: 1.8;">
          <li>👤 <strong>Name:</strong> ${evt.partnerName}</li>
          <li>✉️ <strong>Email:</strong> <a href="mailto:${evt.partnerEmail}" style="color: #818cf8;">${evt.partnerEmail}</a></li>
          ${evt.partnerMobile ? `<li>📱 <strong>Mobile/WhatsApp:</strong> <a href="https://wa.me/${evt.partnerMobile.replace(/\D/g, '')}" style="color: #4ade80;">${evt.partnerMobile}</a></li>` : ''}
        </ul>
      </div>

      <p style="font-size: 14px; color: #94a3b8; text-align: center; margin-top: 30px;">
        Reach out to your partner to plan cab sharing, rides, or meeting up at the exam center!
      </p>

      <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;" />
      
      <p style="font-size: 12px; color: #64748b; text-align: center;">
        Sent automatically via NPTEL Travel Buddy from expertszone4@gmail.com.<br/>
        Safe travels and good luck on your exams!
      </p>
    </div>
  `;

  MailApp.sendEmail({
    to: evt.recipientEmail,
    subject: subject,
    htmlBody: htmlBody
  });
}

function testSendNotification() {
  const dummyPayload = {
    events: [
      {
        recipientName: "Test Recipient",
        recipientEmail: "expertszone4@gmail.com",
        recipientMobile: "+919876543210",
        partnerName: "Test Partner",
        partnerEmail: "partner@example.com",
        partnerMobile: "+919876543211",
        examCenter: "TCS iON Digital Zone, Bengaluru",
        examDate: "2026-10-25",
        examSlot: "Forenoon"
      }
    ]
  };

  const fakeEvent = {
    postData: {
      contents: JSON.stringify(dummyPayload)
    }
  };

  const response = doPost(fakeEvent);
  Logger.log(response.getContent());
}
