const { isValidAccessCode, setCorsHeaders } = require('../lib/utils.js');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { accessCode } = req.body || {};
    if (!accessCode) return res.status(400).json({ valid: false, error: 'Access code required' });

    const valid = await isValidAccessCode(accessCode);
    if (valid) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(200).json({ valid: false, error: "That code wasn't recognised. Check it for typos and try again." });
    }
  } catch (err) {
    console.error('verify-code error:', err);
    return res.status(500).json({ valid: false, error: 'Something went wrong. Please try again.' });
  }
};
