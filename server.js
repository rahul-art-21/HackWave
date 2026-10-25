const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and increase body limit for uploaded photo payloads
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.post('/api/analyze', async (req, res) => {
  const { text, imageBase64 } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: GEMINI_API_KEY not set in .env' });
  }

  // Enforce rigid verification prompt + output rules
  const promptText = `
You are an expert fact-checker and conflict analyst. Verify this claim or screenshot.
Respond strictly in JSON format matching this schema:
{
  "verdict": "REAL" or "FAKE",
  "explanation": "State the factual status and civil/conflict risk in strictly under 30 words."
}

Claim: "${text || 'Analyze the provided image.'}"
`;

  const parts = [{ text: promptText }];
  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: imageBase64
      }
    });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: {
          response_mime_type: 'application/json'
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(data.error.code || 400).json({ error: data.error.message });
    }

    if (data.candidates && data.candidates[0].content.parts.length > 0) {
      const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
      return res.json(parsed);
    }

    return res.status(500).json({ error: 'Failed to generate output from Gemini.' });
  } catch (error) {
    return res.status(500).json({ error: `Server internal error: ${error.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`Backend security proxy running at http://localhost:${PORT}`);
});

