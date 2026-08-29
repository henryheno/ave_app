export async function appelerGemini(
  promptActuel: string, 
  historique?: Array<{ role: 'user' | 'model', parts: Array<{ text: string }> }>
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return "Erreur : La clé API VITE_GEMINI_API_KEY n'est pas configurée.";
  }

  const structureContenu = historique && historique.length > 0 
    ? [...historique, { role: 'user', parts: [{ text: promptActuel }] }]
    : [{ role: 'user', parts: [{ text: promptActuel }] }];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: structureContenu }),
    });

    // Intercepte les erreurs HTTP (400, 403, 500, etc.)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erreur HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    return "Désolé, l'IA n'a pas pu formuler de réponse. Vérifiez le format des données.";
  } catch (error) {
    console.error("❌ Erreur API Gemini:", error);
    return "Une erreur technique est survenue lors de la communication avec l'IA.";
  }
}