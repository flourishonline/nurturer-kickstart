// Shared utilities for the Nurturer Kick Start Generator

const { Redis } = require('@upstash/redis');

// Initialise Upstash Redis client
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
let redis = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });
  }
} catch (e) {
  console.error('Redis init error:', e);
}

// =========================================================
// ACCESS CODE VALIDATION
// =========================================================
// Access codes are stored in env variable as comma-separated list
// or can be individually stored in KV with prefix "access:"
// For initial launch, we use env variable approach for simplicity

async function isValidAccessCode(code) {
  if (!code) return false;
  const normalised = code.trim().toUpperCase();

  // Check env variable list first
  const envCodes = (process.env.ACCESS_CODES || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
  if (envCodes.includes(normalised)) return true;

  // Check KV for per-buyer codes (future expansion)
  try {
    if (!redis) return false;
    const stored = await redis.get(`access:${normalised}`);
    if (stored) {
      // Check if code is still valid (not expired, not consumed)
      if (stored.expiresAt && stored.expiresAt < Date.now()) return false;
      return true;
    }
  } catch (e) {
    // Redis not configured or errored; continue with env check only
  }

  return false;
}

// =========================================================
// RETRIEVAL CODE GENERATION
// Human-friendly format: THREE-WORDS-HERE
// Using Nurturer-themed words for aesthetic match
// =========================================================
const CODE_WORDS_A = ['ROSE', 'MOON', 'WILD', 'SOFT', 'DEEP', 'DAWN', 'DUSK', 'SAGE', 'GOLD', 'TIDE', 'NEST', 'LOOM', 'RIVER', 'SEED', 'EMBER', 'STILL'];
const CODE_WORDS_B = ['HONEY', 'FOREST', 'VELVET', 'CEDAR', 'AMBER', 'IVORY', 'LINEN', 'SHORE', 'MEADOW', 'PETAL', 'HEARTH', 'WILLOW', 'OLIVE', 'DUNE', 'SILK', 'FERN'];
const CODE_WORDS_C = ['SONG', 'LIGHT', 'TIDE', 'PATH', 'FLAME', 'GRACE', 'BREATH', 'HOUR', 'STAR', 'SPELL', 'ECHO', 'VOICE', 'BLOOM', 'STILLNESS', 'MUSE', 'OAK'];

function generateRetrievalCode() {
  const a = CODE_WORDS_A[Math.floor(Math.random() * CODE_WORDS_A.length)];
  const b = CODE_WORDS_B[Math.floor(Math.random() * CODE_WORDS_B.length)];
  const c = CODE_WORDS_C[Math.floor(Math.random() * CODE_WORDS_C.length)];
  return `${a}-${b}-${c}`;
}

// =========================================================
// KV HELPERS
// =========================================================
async function saveSession(retrievalCode, data) {
  try {
    if (!redis) {
      console.error('Redis not configured');
      return false;
    }
    // Store for 90 days
    await redis.set(`session:${retrievalCode}`, JSON.stringify(data), { ex: 60 * 60 * 24 * 90 });
    return true;
  } catch (e) {
    console.error('Redis save error:', e);
    return false;
  }
}

async function loadSession(retrievalCode) {
  try {
    if (!redis) return null;
    const data = await redis.get(`session:${retrievalCode}`);
    if (!data) return null;
    // Upstash auto-parses JSON, but handle both cases
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    console.error('Redis load error:', e);
    return null;
  }
}

// =========================================================
// CORS HELPER (for custom domains if needed)
// =========================================================
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = {
  isValidAccessCode,
  generateRetrievalCode,
  saveSession,
  loadSession,
  setCorsHeaders
};
