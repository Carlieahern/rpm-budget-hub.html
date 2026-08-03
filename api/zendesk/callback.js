// Zendesk OAuth callback (redirect URI). Zendesk sends the user here with a ?code
// after they authorize; we exchange it for an access token.
//
// Register this exact URL as the OAuth client's redirect URL in Zendesk:
//   https://rpm-living-budget-hub.vercel.app/api/zendesk/callback
//
// Env vars (set in Vercel once Katie provides them — start with the SANDBOX values):
//   ZENDESK_SUBDOMAIN       e.g. "roscoeproperties1234" (sandbox subdomain)
//   ZENDESK_CLIENT_ID       OAuth client unique identifier
//   ZENDESK_CLIENT_SECRET   OAuth client secret
//   ZENDESK_OAUTH_SCOPE     optional; defaults to "tickets:read tickets:write"

function page(title, msg) {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
    `<body style="font-family:system-ui,sans-serif;max-width:540px;margin:80px auto;text-align:center;color:#1a1d2e">` +
    `<h1 style="color:#3D4F4A;font-weight:600">${title}</h1>` +
    `<p style="color:#4a5068;line-height:1.6">${msg}</p></body>`;
}

export default async function handler(req, res) {
  const { code, error, error_description } = req.query;

  if (error) {
    res.status(400).send(page('Authorization failed', `${error}: ${error_description || ''}`));
    return;
  }
  if (!code) {
    res.status(400).send(page('Missing code', 'No authorization code was returned by Zendesk.'));
    return;
  }

  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  const clientId = process.env.ZENDESK_CLIENT_ID;
  const clientSecret = process.env.ZENDESK_CLIENT_SECRET;
  const scope = process.env.ZENDESK_OAUTH_SCOPE || 'tickets:read tickets:write';

  if (!subdomain || !clientId || !clientSecret) {
    res.status(500).send(page('Not configured yet', 'Zendesk OAuth environment variables are not set. Add them in Vercel, then retry.'));
    return;
  }

  const redirectUri = `https://${req.headers.host}/api/zendesk/callback`;

  try {
    const r = await fetch(`https://${subdomain}.zendesk.com/oauth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        scope,
      }),
    });
    const data = await r.json();

    if (!r.ok) {
      console.error('Zendesk token exchange failed', data);
      res.status(r.status).send(page('Token exchange failed', 'See Vercel logs for details.'));
      return;
    }

    // Sandbox milestone: confirm the handshake works. The access token is logged
    // server-side only (never shown in the browser). Persisting it for the service
    // to reuse is the next phase.
    console.log('Zendesk OAuth success — access token acquired. scope:', data.scope);
    res.status(200).send(page('✅ Zendesk connected', 'The sandbox OAuth handshake completed successfully. You can close this window.'));
  } catch (e) {
    console.error('Zendesk callback error', e);
    res.status(500).send(page('Error', e.message));
  }
}
