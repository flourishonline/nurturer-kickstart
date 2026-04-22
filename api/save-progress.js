const { isValidAccessCode, generateRetrievalCode, saveSession, loadSession, setCorsHeaders } = require('../lib/utils.js');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { accessCode, formData, retrievalCode: existingCode } = req.body || {};

    if (!accessCode) return res.status(400).json({ error: 'Access code required' });
    const valid = await isValidAccessCode(accessCode);
    if (!valid) return res.status(403).json({ error: 'Invalid access code' });

    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({ error: 'Form data required' });
    }

    // If they already have a retrieval code, keep it
    let retrievalCode = existingCode;
    if (retrievalCode) {
      const existing = await loadSession(retrievalCode);
      if (!existing) {
        // Code is no longer valid, generate new
        retrievalCode = generateRetrievalCode();
      }
    } else {
      retrievalCode = generateRetrievalCode();
      // Ensure uniqueness
      let attempts = 0;
      while (await loadSession(retrievalCode)) {
        retrievalCode = generateRetrievalCode();
        if (++attempts > 5) break;
      }
    }

    const saved = await saveSession(retrievalCode, {
      accessCode,
      formData,
      results: null,
      savedAt: Date.now()
    });

    if (!saved) {
      return res.status(500).json({ error: 'Could not save. Please try again.' });
    }

    return res.status(200).json({ retrievalCode });
  } catch (err) {
    console.error('save-progress error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
