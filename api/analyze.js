export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, prompt } = req.body;
  if (!imageBase64 || !prompt) {
    return res.status(400).json({ error: 'imageBase64 and prompt are required' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment variables' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Return full Gemini error detail
      return res.status(response.status).json({
        error: data.error?.message || 'Gemini API error',
        detail: data
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Return raw text so frontend can debug
    return res.status(200).json({ text, _raw_length: text.length });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}