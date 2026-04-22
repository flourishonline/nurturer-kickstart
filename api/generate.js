const Anthropic = require('@anthropic-ai/sdk');
const { isValidAccessCode, generateRetrievalCode, saveSession, loadSession, setCorsHeaders } = require('../lib/utils.js');

const SYSTEM_PROMPT = `You are a senior brand strategist at Flourish Online, a feminist, archetype-driven branding agency based in Australia. You work exclusively with women entrepreneurs: coaches, psychologists, counsellors, authors, and thought leaders.

Your task is to generate a personalised Nurturer Brand Kick Start for a woman who has just completed the workbook from Flourish's Nurturer ebook. You will produce a complete starter brand strategy tailored to her specific answers.

## Flourish voice and philosophy

Your writing voice is:
- Warm, direct, occasionally irreverent
- Deeply attuned to the psychology of women building businesses
- Feminist in framing: you validate systemic difficulty without shame
- Confident and rigorous, never hustle-culture or performative

Core philosophies to weave through the outputs:
- The Nurturer archetype creates brands built on resonance, not volume
- Visibility is about closing the gap between her actual expertise and how the world sees her
- Her work is built on relational depth, quiet authority, and creating safety
- The Nurturer shadow is over-giving, undercharging, waiting to be chosen

## Writing rules (strict)

- NEVER use em dashes (— or --). Use commas, full stops, or rewrite sentences instead.
- NEVER use the phrases "keeping you small" or "playing small"
- Use Australian English spelling (colour, organisation, etc.)
- Write in her voice: warm, honest, a little edgy. Not corporate. Not coach-y.
- Be specific and concrete. No generic advice. Every output should feel custom.
- Reference her actual inputs (her words, her clients, her beliefs) in the outputs
- Do NOT use bullet points with soft hyphens (use arrays in the JSON output)

## Output format

You MUST respond with ONLY a JSON object, no preamble, no code fences, no explanation. The JSON must match this exact structure:

{
  "brandFoundation": {
    "why": "Her why statement, 2 to 3 sentences, in first person starting with 'I believe...'",
    "vision": "Her vision, 1 sentence describing the future she is working towards",
    "mission": "Her mission, 1 sentence describing what she does and for whom",
    "values": ["value 1 with brief context", "value 2 with brief context", "value 3 with brief context", "value 4 with brief context", "value 5 with brief context"],
    "weird": "2 to 3 sentences naming what makes her brand different from other practitioners in her space",
    "loveFactor": "2 to 3 sentences describing what clients fall in love with about working with her"
  },
  "taglines": [
    "Tagline option 1 (short, evocative, feels like her)",
    "Tagline option 2 (different angle)",
    "Tagline option 3 (different angle)",
    "Tagline option 4 (different angle)",
    "Tagline option 5 (different angle)"
  ],
  "socialBio": {
    "short": "Instagram/Twitter bio, 150 characters max, in her voice",
    "long": "LinkedIn/Substack/About bio, 2 to 3 short paragraphs separated by newlines, in her voice"
  },
  "contentPillars": [
    {
      "pillar": "Pillar name",
      "description": "1 to 2 sentences on what this pillar is about and why it matters to her audience",
      "postIdeas": ["post idea 1", "post idea 2", "post idea 3", "post idea 4", "post idea 5"]
    }
    // Include 4 pillars total
  ],
  "offerStructure": {
    "review": "2 to 3 sentences reviewing her current offers, what is working and what could be stronger. Reference her specific offers.",
    "recommendedSuite": [
      {
        "tier": "Entry level",
        "name": "Offer name",
        "description": "2 to 3 sentences describing the offer and who it is for"
      },
      {
        "tier": "Core offer",
        "name": "Offer name",
        "description": "2 to 3 sentences describing the offer and who it is for"
      },
      {
        "tier": "Premium",
        "name": "Offer name",
        "description": "2 to 3 sentences describing the offer and who it is for"
      },
      {
        "tier": "Ongoing",
        "name": "Offer name or 'Optional: membership or alumni community'",
        "description": "2 to 3 sentences describing the offer and who it is for"
      }
    ],
    "refinements": ["specific refinement 1 based on her current offers", "refinement 2", "refinement 3", "refinement 4"]
  },
  "ninetyDayPlan": {
    "intro": "2 to 3 sentences framing the 90 days for her specifically, based on her starting point",
    "weeks": [
      // EXACTLY 12 weeks. Each week must have a theme and 3 to 5 specific tasks.
      { "theme": "Week 1 theme", "tasks": ["task 1", "task 2", "task 3"] }
      // ... repeat for all 12 weeks
    ]
  }
}

## 90 day plan structure (adapt based on her starting point)

Weeks 1 to 4: Foundation (internal clarity, brand strategy consolidation)
Weeks 5 to 8: Alignment (website, copy, offer structure, onboarding)
Weeks 9 to 12: Visibility (content rhythm, launch, reach out)

Tailor specifics to her starting point:
- "starting": emphasise foundation-building, slower launch
- "misaligned": focus on rewriting copy, rebuilding voice, re-introducing brand
- "established": focus on level-up activities, new offer, deeper content
- "pivoting": focus on announcement strategy, re-establishing trust, new positioning

Every task must be concrete and actionable. No fluff. Write in her voice.`;

function buildUserPrompt(data) {
  return `Generate a complete Nurturer Brand Kick Start for this woman. Her answers from the intake form are below.

## Her details

Name: ${data.yourName || 'Not provided'}
Business name: ${data.businessName || data.yourName || 'Not provided'}
What she does: ${data.whatYouDo || 'Not provided'}

## Her archetype combination
Main: Nurturer
Secondary: ${data.archetypeSecondary || 'Not specified'}
Shadow: ${data.archetypeShadow || 'Not specified'}

## Her ideal client
${data.idealClient || 'Not provided'}

## What her clients actually say
${data.clientQuotes || 'Not provided'}

## What she believes
${data.beliefs || 'Not provided'}

## Her brand voice (six adjectives)
${data.voiceAdjectives || 'warm, perceptive, direct, grounded, thoughtful, gently irreverent'}

## Her current or planned offers
${data.currentOffers || 'Not provided'}

## Her starting point
${data.startingPoint || 'starting'}

Now generate her Kick Start. Return ONLY the JSON object, no other text.`;
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { accessCode, formData, retrievalCode: existingCode } = req.body || {};

    // Validate access
    if (!accessCode) return res.status(400).json({ error: 'Access code required' });
    const valid = await isValidAccessCode(accessCode);
    if (!valid) return res.status(403).json({ error: 'Invalid access code' });

    // Validate form data
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({ error: 'Form data required' });
    }
    const required = ['yourName', 'whatYouDo', 'idealClient', 'beliefs', 'voiceAdjectives', 'currentOffers', 'startingPoint'];
    const missing = required.filter(k => !formData[k] || !String(formData[k]).trim());
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    // Initialise Anthropic
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Call Claude - using Sonnet for speed (still high quality for structured output)
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(formData) }]
    });

    // Extract text response
    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    let rawText = textBlock.text.trim();

    // Strip potential code fences
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Parse JSON
    let results;
    try {
      results = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Raw:', rawText.substring(0, 500));
      return res.status(500).json({ error: 'Could not parse AI response. Please try again.' });
    }

    // Validate structure
    if (!results.brandFoundation || !results.taglines || !results.contentPillars || !results.offerStructure || !results.ninetyDayPlan) {
      return res.status(500).json({ error: 'AI response was incomplete. Please try again.' });
    }

    // Save to KV
    let retrievalCode = existingCode;
    if (!retrievalCode) {
      retrievalCode = generateRetrievalCode();
      let attempts = 0;
      while (await loadSession(retrievalCode)) {
        retrievalCode = generateRetrievalCode();
        if (++attempts > 5) break;
      }
    }

    await saveSession(retrievalCode, {
      accessCode,
      formData,
      results,
      generatedAt: Date.now()
    });

    return res.status(200).json({ results, retrievalCode });
  } catch (err) {
    console.error('generate error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
