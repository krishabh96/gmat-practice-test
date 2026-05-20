// Vercel Serverless Function — proxies Anthropic API to avoid CORS
// Deploy: this file goes in /api/extract-image.js in your repo root

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType, section, qtype } = req.body;

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'Missing imageBase64 or mimeType' });
  }

  const sectionName = section === 'Q' ? 'Quantitative Problem Solving'
                    : section === 'V' ? 'Verbal (CR/RC)'
                    : 'Data Insights';

  const prompt = `You are a GMAT question extractor. Extract the complete question from this image.

This is a ${sectionName} question, type: ${qtype}.

Return ONLY a valid JSON object (no markdown, no backticks, no explanation) with this exact structure:
{
  "question": "full question text. For math: use LaTeX notation wrapped in $ signs. Examples: $\\frac{a}{b}$ for fractions, $x^2$ for exponents, $\\sqrt{x}$ for roots, $\\leq$ for ≤. Roman numeral statements (I. II. III.) should be included in the question text on separate lines.",
  "A": "option A text (use LaTeX for math)",
  "B": "option B text",
  "C": "option C text",
  "D": "option D text",
  "E": "option E text or empty string if only 4 options",
  "answer": "single letter A B C D or E",
  "difficulty": "Easy or Medium or Hard",
  "explanation": "explanation if visible in image, else empty string"
}

Critical rules:
- Convert ALL fractions to LaTeX: a/b becomes $\\frac{a}{b}$
- Convert inequalities with context: m/p < s/v becomes $\\frac{m}{p} < \\frac{s}{v}$
- Keep Roman numeral statements (I. II. III.) in the question field, NOT as answer options
- Answer options are ONLY the A. B. C. D. E. choices
- Return ONLY the JSON object, nothing else`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Anthropic API error', details: err });
    }

    const data = await response.json();
    const rawText = data.content?.find(c => c.type === 'text')?.text || '';

    // Strip any accidental markdown fences
    const clean = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: rawText.slice(0, 500) });
    }

    return res.status(200).json({ success: true, data: parsed });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
