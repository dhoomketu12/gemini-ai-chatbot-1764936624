/**
 * Helper function to call Gemini API directly with Google Search grounding
 * This bypasses the AI SDK to use features not yet supported in the SDK
 */

export async function callGeminiWithSearch(query: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: query }],
          },
        ],
        tools: [
          {
            google_search: {},
          },
        ],
        generationConfig: {
          temperature: 0.9,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  
  // Extract the text from the response
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Unescape newlines and other escape sequences that come as literal strings from the API
  text = text.replace(/\\n/g, '\n');
  text = text.replace(/\\t/g, '\t');
  
  return text;
}
