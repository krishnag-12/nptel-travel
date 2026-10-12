/**
 * Autocrat & Google Sheets Email Messaging Service
 * 
 * Bridges NPTEL Travel Buddy match events to Google Sheets / Autocrat
 * allowing automated email notifications to be dispatched from
 * expertszone4@gmail.com.
 */

export async function sendMatchNotificationsToAutocrat(matches) {
  if (!matches || matches.length === 0) return { success: true, count: 0 };

  const webhookUrl = import.meta.env.VITE_AUTOCRAT_WEBHOOK_URL;

  if (!webhookUrl) {
    console.info(
      '[Autocrat Messaging] Webhook URL not configured. ' +
      'Matches are saved in Firestore. To send automated emails from expertszone4@gmail.com, ' +
      'set VITE_AUTOCRAT_WEBHOOK_URL in environment settings.'
    );
    return { success: false, reason: 'not_configured' };
  }

  try {
    const payload = Array.isArray(matches) ? matches : [matches];

    // Using mode: 'no-cors' allows browser requests to Google Apps Script Web App
    // without triggering CORS blocks caused by Google's 302 redirects.
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        events: payload,
        timestamp: new Date().toISOString(),
        source: 'nptel-travel-buddy-webapp'
      }),
    });

    console.log(`[Autocrat Messaging] Dispatched ${payload.length} match notification(s) to Google Sheets/Autocrat.`);
    return { success: true, count: payload.length };
  } catch (error) {
    console.error('[Autocrat Messaging] Error dispatching to webhook:', error);
    return { success: false, error: error.message };
  }
}
