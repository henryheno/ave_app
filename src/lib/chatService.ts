import { supabase } from './supabase';
import { appelerGemini } from './gemini';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Cache pour les résultats de recherche (TTL de 2 minutes)
const searchCache = new Map<string, { docs: string[], timestamp: number }>();
const SEARCH_CACHE_TTL = 2 * 60 * 1000;

const searchDocuments = async (question: string, setStatus?: (status: string) => void): Promise<string[]> => {
  if (!question.trim()) return [];

  const queryOriginale = question.trim();

  // Vérification du cache
  const cached = searchCache.get(queryOriginale);
  if (cached && (Date.now() - cached.timestamp) < SEARCH_CACHE_TTL) {
    return cached.docs;
  }

  // Nettoyage des caractères spéciaux pour le Full-Text Search
  const queryNettoyee = queryOriginale.replace(/[^a-zA-Z0-9àâäéèêëîïôöùûüç\s]/g, ' ').trim();

  try {
    setStatus?.('🔍 Recherche dans la base de données...');
    await delay(300);

    let ftsData: any[] = [];
    if (queryNettoyee) {
      const { data } = await supabase
        .from('documents')
        .select('content')
        .textSearch('tsv_content', queryNettoyee, {
          type: 'websearch',
          config: 'french'
        })
        .limit(3); // Donne plus de contexte à l'IA pour analyser l'intention
      ftsData = data || [];
    }

    // Extraction des mots pour une recherche ILIKE plus ciblée
    const mots = queryNettoyee.split(/\s+/).filter(m => m.length > 2);
    let resultatsIlike: any[] = [];

    if (mots.length > 0) {
      // Priorité à un mot en MAJUSCULE (ex: acronyme comme APA) ou au dernier mot important
      const motClePrincipal = mots.find(m => m === m.toUpperCase()) || mots[mots.length - 1];

      const { data } = await supabase
        .from('documents')
        .select('content')
        .or(`content.ilike.%${motClePrincipal}%,name.ilike.%${motClePrincipal}%`)
        .limit(2);
      resultatsIlike = data || [];
    }

    const tousLesContents = [...ftsData.map(r => r.content), ...resultatsIlike.map(r => r.content)];
    const uniqueResults = Array.from(new Set(tousLesContents));

    // Mise en cache
    searchCache.set(queryOriginale, { docs: uniqueResults, timestamp: Date.now() });

    // Élimination des doublons
    return uniqueResults;
  } catch (err) {
    console.error('❌ [SUPABASE] Erreur :', err);
    return [];
  }
};

export const fetchChatResponse = async (
  question: string,
  messagesExistants: any[],
  setStatus?: (status: string) => void,
): Promise<string> => {

  console.log(`🧠 [PROCESSUS] 1. Analyse de la question : "${question}"`);
  setStatus?.('💭 Analyse de votre question...');
  await delay(300);

  console.log(`🔍 [PROCESSUS] 2. Démarrage de la recherche documentaire...`);
  const docs = await searchDocuments(question, setStatus);

  const docText = docs.length > 0 ? docs.join('\n---\n') : "AUCUN DOCUMENT CORRESPONDANT DANS LA BASE DE DONNÉES";

  console.log(`📊 [PROCESSUS] 3. Synthèse des éléments...`);
  setStatus?.('⚙️ Analyse de la réponse en cours...');
  await delay(300);

  // Formatage de l'historique pour l'API Gemini
  const historiqueFormate = messagesExistants
    .filter((_, index) => index > 0) // Évite le message de bienvenue initial du bot
    .map(m => ({
      role: m.sender === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.text }]
    }));

  // Prompt intelligent axé sur la compréhension de l'intention profonde
  const prompt = `
Tu es le conseiller virtuel exclusif de notre communauté chrétienne. Tu as accès à l'historique de la conversation.

CONTEXTE DOCUMENTAIRE REÇU DE NOTRE BASE DE DONNÉES :
${docText}

RÈGLES DE CONDUITE ABSOLUES :
1. Analyse intelligemment la question de l'utilisateur. Il peut poser une question reformulée (ex: demander "l'histoire de", "explique-moi" ou "c'est quoi" un sujet).
2. Vérifie si le "CONTEXTE DOCUMENTAIRE" ci-dessus contient les informations nécessaires pour répondre à l'intention profonde de sa question.
3. Interdiction totale d'inventer ou d'utiliser tes propres connaissances extérieures pour définir des termes. Tu dois répondre UNIQUEMENT en te basant sur le contexte fourni.
4. Si les documents fournis ne contiennent pas la réponse ou si le sujet n'est pas traité, dis textuellement ceci et RIEN d'autre : "Paix à toi, cher frère ou sœur. Les informations concernant cette demande ne sont pas mentionnées dans nos livrets officiels."
5. Si les informations sont trouvées dans le contexte, reste TRÈS CONCIS, FRATERNEL et DIRECT (3 à 5 lignes maximum) et adapte ton texte pour répondre précisément à sa demande.

RÉPONSE COURTE ET VERROUILLÉE :`;

  return await appelerGemini(prompt, historiqueFormate);
};