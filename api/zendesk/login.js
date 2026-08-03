// Kicks off the Zendesk OAuth flow: redirects the user to Zendesk's authorize page.
// Visit https://rpm-living-budget-hub.vercel.app/api/zendesk/login to start the test.
// Zendesk then sends the user back to /api/zendesk/callback with a ?code.
//
// Env vars (set in Vercel with the SANDBOX values first):
//   ZENDESK_SUBDOMAIN, ZENDESK_CLIENT_ID, ZENDESK_OAUTH_SCOPE (optional)

export default function handler(req, res) {
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  const clientId = process.env.ZENDESK_CLIENT_ID;
  const scope = process.env.ZENDESK_OAUTH_SCOPE || 'tickets:read tickets:write';

  if (!subdomain || !clientId) {
    res.status(500).send('Zendesk OAuth environment variables are not set yet.');
    return;
  }

  const redirectUri = `https://${req.headers.host}/api/zendesk/callback`;
  const state = Math.random().toString(36).slice(2);

  const url = `https://${subdomain}.zendesk.com/oauth/authorizations/new?` + new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope,
    redirect_uri: redirectUri,
    state,
  }).toString();

  res.writeHead(302, { Location: url });
  res.end();
}
