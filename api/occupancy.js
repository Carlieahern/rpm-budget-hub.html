// Vercel proxy: browser -> Power Automate flow that writes occupancy to SharePoint.
// Keeps the flow URL (which is a secret — anyone with it can write to the list) out
// of the public HTML and avoids the browser CORS block on the Power Automate endpoint.
//
// Set the flow URL as a Vercel env var: POWER_AUTOMATE_OCCUPANCY_URL
// (Project Settings > Environment Variables). Currently points at the TEST list flow;
// swap the env var value to the real-list flow when ready — no code change needed.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const flowUrl = process.env.POWER_AUTOMATE_OCCUPANCY_URL;
  if (!flowUrl) {
    res.status(500).json({ error: 'POWER_AUTOMATE_OCCUPANCY_URL not configured' });
    return;
  }

  try {
    const flowRes = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    // Power Automate often returns 202 Accepted with an empty body.
    const text = await flowRes.text();
    res.status(flowRes.ok ? 200 : flowRes.status).json({ ok: flowRes.ok, status: flowRes.status, body: text });
  } catch (error) {
    console.error('Occupancy proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}
