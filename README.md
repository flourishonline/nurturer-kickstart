# Nurturer Brand Kick Start Generator

A standalone AI-powered tool that generates a personalised Nurturer brand strategy based on the framework in the Flourish Online Nurturer ebook.

Built with vanilla HTML/CSS/JS frontend and Vercel serverless functions. Uses Claude (Anthropic API) for generation and Upstash Redis for session persistence.

## What it does

Users who purchased the Nurturer ebook enter an access code, fill in a 3-step form (9 questions), and receive a personalised output including:

1. **Brand Foundation** — why, vision, mission, values, weird, love factor
2. **Tagline options** — 5 options in their voice
3. **Social bio** — short and long versions
4. **Content pillars** — 4 pillars with 5 post ideas each
5. **Offer structure recommendations** — review of current offers + recommended suite
6. **90 day action plan** — week by week, tailored to their starting point

Users can download as PDF or Word doc, and save progress with a retrieval code to return later.

---

## Tech stack

- Frontend: Vanilla HTML, CSS, JavaScript (no framework, no build step)
- Backend: Vercel serverless functions (Node.js 18+, CommonJS)
- AI: Anthropic Claude Opus 4.7 via `@anthropic-ai/sdk`
- Persistence: Upstash Redis via `@upstash/redis`
- PDF generation: `pdfkit`
- Word doc generation: `docx`

---

## Project structure

```
nurturer-kickstart/
├── api/
│   ├── verify-code.js       # Validates access code
│   ├── save-progress.js     # Saves form data mid-flow
│   ├── load.js              # Loads saved session by retrieval code
│   ├── generate.js          # Calls Claude API to generate Kick Start
│   └── download.js          # Generates PDF or DOCX for download
├── lib/
│   └── utils.js             # Shared helpers (codes, Redis, CORS)
├── public/
│   ├── index.html           # Single-page app with all views
│   ├── styles.css           # Flourish brand design system
│   └── app.js               # Frontend logic
├── package.json
├── vercel.json              # Vercel config (60s function timeout)
└── README.md
```

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/flourishonline/nurturer-kickstart.git
cd nurturer-kickstart
npm install
```

### 2. Set up Upstash Redis

Vercel KV was deprecated in late 2024. The current recommendation is Upstash Redis, available free on the Vercel Marketplace.

1. Go to https://vercel.com/marketplace/upstash
2. Add the Upstash integration to your Vercel account
3. Create a new Redis database (free tier is plenty for this use case)
4. Upstash will automatically add these env vars to your Vercel project:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 3. Set up Anthropic API

1. Go to https://console.anthropic.com
2. Create an API key
3. Add to Vercel env vars as `ANTHROPIC_API_KEY`

### 4. Set up access codes

Access codes validate that a user has purchased the ebook. Two approaches are supported:

**Option A: Shared codes via env variable (simplest)**

Set `ACCESS_CODES` as a comma-separated list in Vercel:
```
ACCESS_CODES=FLOURISH-NURTURER-2026,FLOURISH-NURT-SPRING,FLOURISH-NURT-SUMMER
```

Rotate these periodically. Include the current code in the ebook delivery email.

**Option B: Per-buyer unique codes (recommended for scale)**

Store each code in Redis with the prefix `access:`. Example:
```javascript
await redis.set('access:FLOURISH-NURT-AB12CD', { createdAt: Date.now(), email: 'buyer@example.com' });
```

You can script this to run automatically when an ebook purchase completes (via your payment processor's webhook, or via an ActiveCampaign automation).

**Option C: Manual one-off codes**

For testing or comped access, add individual codes via Upstash's Redis console or via a simple admin script.

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel link
vercel --prod
```

Or push to GitHub and connect the repo in the Vercel dashboard.

---

## Environment variables

Required in production:

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API key from console.anthropic.com |
| `UPSTASH_REDIS_REST_URL` | Auto-set by Upstash integration |
| `UPSTASH_REDIS_REST_TOKEN` | Auto-set by Upstash integration |
| `ACCESS_CODES` | Comma-separated list of shared access codes (optional if using per-buyer codes only) |

---

## How access flow works

1. User buys ebook → receives delivery email with access code
2. User visits the tool URL
3. User enters access code → `POST /api/verify-code` checks against env var list and Redis
4. If valid, user sees the 3-step form
5. User can save progress at any time → gets a retrieval code like `ROSE-WILLOW-SONG`
6. User submits form → `POST /api/generate` calls Claude and saves results to Redis (90 day TTL)
7. User can download PDF or DOCX, or save retrieval code to return later

---

## How to add a new access code

**Via env var (simplest):**

```bash
vercel env add ACCESS_CODES
# Enter: existing codes, new code
```

Or edit in the Vercel dashboard under Project Settings → Environment Variables.

**Via Redis (for per-buyer codes):**

Create a small admin script or use the Upstash console. Example Node script:

```javascript
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function addCode(code, email) {
  await redis.set(`access:${code.toUpperCase()}`, {
    createdAt: Date.now(),
    email
  });
  console.log(`Added ${code} for ${email}`);
}

addCode('FLOURISH-NURT-AB12CD', 'buyer@example.com');
```

---

## Integrating with ActiveCampaign or your payment processor

The cleanest approach is to trigger a webhook when an ebook purchase completes, which calls a simple admin endpoint on this app to mint a new access code and send it to the buyer.

Suggested flow:

1. Customer buys ebook via Stripe/ThriveCart/etc.
2. Purchase webhook fires → creates a unique code
3. Code is saved to Redis with `access:` prefix
4. ActiveCampaign automation sends the buyer an email with the code and the tool URL

You can also simply use shared codes in `ACCESS_CODES` and rotate them quarterly. Lower friction but less secure.

---

## Local development

```bash
npm install
vercel dev
```

This starts a local server at `http://localhost:3000` with the same routing as production.

You will need a `.env.local` file with:
```
ANTHROPIC_API_KEY=sk-ant-...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
ACCESS_CODES=TEST-CODE-1,TEST-CODE-2
```

---

## Customising the output

The Claude system prompt is in `api/generate.js`. It defines:

- Flourish voice (warm, direct, feminist, never uses em dashes or "playing small")
- Core Flourish philosophies to weave in (visibility gap, Nurturer shadow, etc.)
- Exact JSON schema for the output

To change the tone, update specific sections, or adjust the 90-day structure, edit the `SYSTEM_PROMPT` constant.

---

## Flourish brand design

The CSS in `public/styles.css` follows the Flourish design system:

- **Colours:** Crimson (#BE1650), Magenta (#CC1A8C), Dark Emerald (#193133), Cream (#EDE8DF)
- **Border radius:** 0 on all elements
- **Borders:** 2px on form fields and cards
- **Buttons:** Uppercase, 0.18em letter-spacing, rectangular
- **Typography:** Georgia serif for headings (system-available placeholder; update to Flourish fonts when confirmed), system UI for body

When Flourish fonts are confirmed, update the `--font-display` and `--font-body` CSS variables.

---

## Maintenance notes

- **Claude model:** Currently `claude-sonnet-4-6`. This gives fast generation (45 to 90 seconds) at lower cost (about 3 cents per generation) with excellent quality for structured outputs. To upgrade to Opus 4.7 for higher quality, change the model string in `api/generate.js` to `claude-opus-4-7`, but note that Opus generations can take 90 to 180 seconds so you may need to keep the `maxDuration: 300` setting in `vercel.json`.
- **Function timeout:** `api/generate.js` is set to 300 seconds (5 minutes) to allow headroom. Other functions are set to 10 seconds.
- **Redis TTL:** Sessions auto-expire after 90 days. Adjust in `lib/utils.js` if needed.
- **Rate limiting:** Not currently implemented. If you see abuse, add middleware to track requests per access code.
- **Error monitoring:** Add Sentry or similar if you want to track generation failures.

---

## Known limitations

- No email-based return links (retrieval codes only). Users must save the code themselves.
- PDF font rendering uses pdfkit's built-in fonts (Helvetica, Times). For brand-perfect PDFs, consider a different library or embedding the Flourish fonts.
- Single-language (English). Australian English spelling enforced in the prompt.

---

## Questions or issues

This tool was built for Flourish Online as part of the Nurturer ebook ecosystem. For issues or enhancements, work with whoever maintains the Flourish tech stack.
