const { loadSession, setCorsHeaders } = require('../lib/utils.js');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { retrievalCode } = req.body || {};
    if (!retrievalCode) return res.status(400).json({ found: false, error: 'Retrieval code required' });

    const normalised = retrievalCode.trim().toUpperCase();
    const session = await loadSession(normalised);

    if (!session) {
      return res.status(200).json({ found: false, error: "We couldn't find a session with that code." });
    }

    return res.status(200).json({
      found: true,
      accessCode: session.accessCode,
      formData: session.formData,
      results: session.results
    });
  } catch (err) {
    console.error('load error:', err);
    return res.status(500).json({ found: false, error: 'Something went wrong. Please try again.' });
  }
};
