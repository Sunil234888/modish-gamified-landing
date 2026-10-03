module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Use POST for this endpoint.' });
  }

  const scriptUrl = process.env.APPS_SCRIPT_WEB_APP_URL;
  const proxySecret = process.env.GAS_PROXY_SECRET;
  if (!scriptUrl || !proxySecret) {
    return res.status(500).json({
      success: false,
      message: 'Vercel is missing APPS_SCRIPT_WEB_APP_URL or GAS_PROXY_SECRET.'
    });
  }

  let body = req.body;
  try {
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid request body.' });
    }
    if (['checkPlayerPlayed', 'verifyPassword', 'saveGamePlay'].indexOf(body.action) === -1) {
      return res.status(400).json({ success: false, message: 'Unknown API action.' });
    }

    // The browser only talks to this same-origin Vercel function. This secret is
    // added server-side and is never sent to or included in the public HTML.
    const forwardPayload = Object.assign({}, body, { secret: proxySecret });
    const upstream = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardPayload)
    });

    const text = await upstream.text();
    let result;
    try {
      result = text ? JSON.parse(text) : null;
    } catch (parseError) {
      console.error('Apps Script returned non-JSON content (HTTP ' + upstream.status + ').');
      return res.status(502).json({
        success: false,
        message: 'Apps Script did not return JSON. Confirm the web-app deployment access and that doPost(e) is deployed.'
      });
    }

    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        message: 'Apps Script request failed with HTTP ' + upstream.status + '.'
      });
    }
    if (!result || typeof result !== 'object') {
      return res.status(502).json({ success: false, message: 'Apps Script returned an empty response.' });
    }

    // Apps Script ContentService returns the application's errors as JSON. Pass
    // those through so the page can show the real reason and offer a retry.
    return res.status(200).json(result);
  } catch (error) {
    console.error('Apps Script proxy error: ' + (error && error.message ? error.message : String(error)));
    return res.status(502).json({
      success: false,
      message: 'Could not reach the Apps Script web app. Check its deployment URL and access setting.'
    });
  }
};
