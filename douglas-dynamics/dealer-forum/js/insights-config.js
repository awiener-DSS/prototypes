/**
 * Demo / shared defaults for Admin Insights.
 *
 * Paste a Groq API key below so the chat works without using the UI settings.
 * Anyone who can view this file can use the key — fine for a private demo repo;
 * do not commit a production key to a public repository.
 *
 * Priority:
 *   1) Key saved in the Admin Insights UI (browser localStorage)
 *   2) apiKey in this file
 *   3) Local analytics demo mode (no Groq)
 */
window.DEALER_FORUM_INSIGHTS = {
  // Paste demo key here, e.g. 'gsk_...'
  // Do not commit a real key — GitHub push protection will block it.
  apiKey: '',
  model: 'llama-3.3-70b-versatile',
  baseUrl: 'https://api.groq.com/openai/v1'
};
