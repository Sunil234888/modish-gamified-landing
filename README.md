# Use the Apps Script deployment as the Sheets backend for Vercel

This is the minimal alternative to a Google Cloud service account. Vercel keeps serving the existing site at its current domain; a small Vercel function forwards API requests to your Apps Script web-app deployment. The browser only calls the same-origin `/api/game` route, so browser CORS is avoided. No Google Sheets credentials are placed in Vercel's browser code.

## Files
Place these files at the Vercel project root:

```text
index.html
package.json
api/game.js
```

Use the lowercase `index.html`. Do not put the `.gs` file in the public Vercel site. The replacement Apps Script source is supplied separately as `AppsScript_Code_with_Vercel_Proxy.gs` and must be pasted into the Apps Script editor.

## One-time Apps Script setup
1. Back up the existing Apps Script project.
2. Replace the contents of its `Code.gs` with `AppsScript_Code_with_Vercel_Proxy.gs`.
3. Create a long random secret locally, for example: `openssl rand -hex 32`. Do not send the secret in chat or commit it to Git.
4. In Apps Script **Project Settings → Script Properties**, add:
   - Property: `VERCEL_PROXY_SECRET`
   - Value: the random secret from step 3
5. Update the **existing** web-app deployment: **Deploy → Manage deployments → Edit → New version → Deploy**. Updating the existing deployment normally preserves its `/exec` URL. Copy the `/exec` URL shown there.
6. The web app must execute as the script owner. Vercel's server does not carry a visitor's Google sign-in, so the deployment must allow an unauthenticated HTTP request (usually **Who has access: Anyone**). If your Workspace administrator forbids this setting, use the service-account/API approach instead. The API's POST actions still require the long secret.

## Vercel setup
1. Add the three Vercel files above to the existing project and redeploy. Keep the project/domain unchanged; the public site remains `https://modish-gamified-landing.vercel.app/`.
2. In Vercel → Project → Settings → Environment Variables, set:
   - `APPS_SCRIPT_WEB_APP_URL` = the exact Apps Script `/exec` URL from step 5
   - `GAS_PROXY_SECRET` = the exact same random secret stored in Apps Script Script Properties
3. Redeploy after saving the variables.

The Vercel function posts to Apps Script server-to-server and follows Google's ContentService redirect. The frontend calls `/api/game` on the current Vercel origin and handles save, player-check, and password-verification responses. It reports the sheet tab and row when the write succeeds.

The existing 12-column sheet layout and game flow are retained. A row is saved when a winner clicks **Claim Promo Code**; losses and unclaimed wins remain unlogged. Vercel does not require a Google service account or `googleapis` package for this option.

For a public promotion, consider Vercel-level rate limiting or CAPTCHA: the shared secret prevents direct unauthenticated calls to the Apps Script API, but visitors can still submit requests through the public Vercel route.
