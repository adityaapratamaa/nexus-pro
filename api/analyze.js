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
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    // Try models in order until one works
    const models = [
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro-vision'
    ];

    let lastError = '';

    for (const model of models) {
      // Try v1 first, then v1beta
      for (const version of ['v1', 'v1beta']) {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

        try {
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
                maxOutputTokens: 2048
              }
            })
          });

          const data = await response.json();

          if (response.ok) {
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            // Return which model/version worked
            return res.status(200).json({ text, _model: model, _version: version });
          }

          lastError = data.error?.message || `${model} ${version} failed`;

        } catch (e) {
          lastError = e.message;
        }
      }
    }

    return res.status(500).json({ error: 'All models failed. Last error: ' + lastError });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}