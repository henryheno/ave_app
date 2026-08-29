import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Send, ArrowLeft, Sparkles, FileText, Loader2,
  BookOpen, ExternalLink, User, Bot, ChevronDown, ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../monapp/ThemeContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DocChunk {
  id: string;
  name: string;
  content: string;
  file_url: string;
  page_count: number;
}

interface Source {
  name: string;
  file_url: string;
  excerpt: string;
}

interface Message {
  role: 'user' | 'bot';
  text: string;
  sources?: Source[];
  noResult?: boolean;
}

// ─── Moteur de synthèse local ─────────────────────────────────────────────────
/**
 * Découpe un texte en phrases simples
 */
function toSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
}

/**
 * Score une phrase selon les mots de la requête
 */
function scoreSentence(sentence: string, mots: string[]): number {
  const lower = sentence.toLowerCase();
  return mots.reduce((acc, m) => acc + (lower.includes(m) ? 1 : 0), 0);
}

/**
 * Génère une réponse synthétique à partir des chunks trouvés
 * sans dépendance externe — extraction + recomposition locale
 */
function genererReponse(question: string, chunks: DocChunk[]): { reponse: string; sources: Source[] } {
  console.group(`🧠 [SYNTHÈSE] Génération de réponse pour : "${question}"`);
  console.log(`📦 Chunks reçus : ${chunks.length}`, chunks.map(c => ({ nom: c.name, longueur: c.content.length })));

  if (chunks.length === 0) {
    console.warn('⚠️ Aucun chunk disponible — réponse vide.');
    console.groupEnd();
    return { reponse: '', sources: [] };
  }

  const mots = question
    .toLowerCase()
    .replace(/[^a-zA-Z0-9àâäéèêëîïôöùûüç\s]/g, ' ')
    .split(/\s+/)
    .filter(m => m.length > 2);

  console.log(`🔑 Mots-clés extraits :`, mots);

  // Collecte toutes les phrases de tous les chunks, avec leur source
  const sentencesWithSource: { sentence: string; chunk: DocChunk; score: number }[] = [];
  const sourcesMap = new Map<string, Source>();

  for (const chunk of chunks) {
    const sentences = toSentences(chunk.content);
    console.log(`  📄 ["${chunk.name}"] → ${sentences.length} phrases analysées`);
    for (const sentence of sentences) {
      const score = scoreSentence(sentence, mots);
      if (score > 0) {
        sentencesWithSource.push({ sentence, chunk, score });
        console.log(`    ✅ score=${score} | "${sentence.slice(0, 80)}…"`);
      }
    }

    // Extrait représentatif pour les sources
    if (!sourcesMap.has(chunk.name)) {
      const excerpt = getExcerpt(chunk.content, question, 180);
      sourcesMap.set(chunk.name, {
        name: chunk.name.replace(/ \(Segment \d+\/\d+\)$/, ''),
        file_url: chunk.file_url,
        excerpt
      });
    }
  }

  // Tri par pertinence décroissante, puis déduplique les phrases trop similaires
  sentencesWithSource.sort((a, b) => b.score - a.score);
  console.log(`📊 Phrases scorées (triées) :`, sentencesWithSource.map(s => ({ score: s.score, debut: s.sentence.slice(0, 60) })));

  const selectedSentences: string[] = [];
  for (const item of sentencesWithSource) {
    if (selectedSentences.length >= 5) break;
    const isDuplicate = selectedSentences.some(
      s => s.toLowerCase().includes(item.sentence.toLowerCase().slice(0, 40))
    );
    if (!isDuplicate) selectedSentences.push(item.sentence);
  }
  console.log(`✂️ Phrases sélectionnées (${selectedSentences.length}) :`, selectedSentences);

  // Si on n'a pas assez de phrases scorées, prendre les premières phrases du meilleur chunk
  if (selectedSentences.length === 0) {
    const best = chunks[0];
    const fallback = toSentences(best.content).slice(0, 3);
    selectedSentences.push(...fallback);
    console.log(`🔄 Fallback phrases depuis premier chunk :`, fallback);
  }

  // Construction de la réponse : intro contextuelle + phrases sélectionnées
  const intro = buildIntro(question);
  const body = selectedSentences.join(' ');
  const reponse = `${intro}\n\n${body}`;

  const sources = Array.from(sourcesMap.values()).slice(0, 4);
  console.log(`📝 Réponse générée (${reponse.length} chars) :`, reponse.slice(0, 200));
  console.log(`🔗 Sources (${sources.length}) :`, sources.map(s => s.name));
  console.groupEnd();
  return { reponse, sources };
}

function buildIntro(question: string): string {
  const q = question.trim().toLowerCase();
  if (q.startsWith("qu'est") || q.startsWith("c'est quoi") || q.startsWith("que veut dire") || q.startsWith("définir")) {
    return 'Selon les documents indexés, voici les informations pertinentes sur ce sujet :';
  }
  if (q.startsWith('comment') || q.startsWith('comment')) {
    return 'Voici ce que nos documents officiels indiquent à ce propos :';
  }
  if (q.startsWith('quel') || q.startsWith('quelle')) {
    return 'D\'après nos documents, voici les éléments de réponse :';
  }
  return 'D\'après les documents officiels indexés, voici les informations trouvées :';
}

function getExcerpt(content: string, query: string, length = 200): string {
  const mots = query.trim().toLowerCase().split(/\s+/).filter(m => m.length > 2);
  let pos = -1;
  for (const mot of mots) {
    pos = content.toLowerCase().indexOf(mot);
    if (pos !== -1) break;
  }
  if (pos === -1) return content.slice(0, length) + '…';
  const start = Math.max(0, pos - 50);
  const end = Math.min(content.length, start + length);
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
}

function renderHighlighted(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>;
  const mots = query.trim().split(/\s+/).filter(m => m.length > 2);
  let result = text;
  mots.forEach(mot => {
    const regex = new RegExp(`(${mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, '||$1||');
  });
  return (
    <>
      {result.split('||').map((part, i) => {
        const isMatch = mots.some(m => part.toLowerCase() === m.toLowerCase());
        return isMatch
          ? <mark key={i} className="bg-theme-accent-start/20 text-theme-accent-start rounded px-0.5 not-italic font-black">{part}</mark>
          : <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Composant Sources ────────────────────────────────────────────────────────
const SourceCard = ({ source, query }: { source: Source; query: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-theme-bg border border-theme-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer hover:bg-theme-surface/50 transition-colors"
      >
        <FileText className="w-3.5 h-3.5 text-theme-accent-start shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-wider text-theme-text-primary flex-1 truncate">{source.name}</span>
        {open ? <ChevronUp className="w-3 h-3 text-theme-text-secondary shrink-0" /> : <ChevronDown className="w-3 h-3 text-theme-text-secondary shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[11px] text-theme-text-secondary leading-relaxed italic">
            {renderHighlighted(source.excerpt, query)}
          </p>
          {source.file_url && (
            <a
              href={source.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-theme-accent-start hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Voir le document
            </a>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Composant Message ────────────────────────────────────────────────────────
const MessageBubble = ({ msg, query }: { msg: Message; query: string }) => {
  if (msg.role === 'user') {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] p-4 rounded-2xl rounded-tr-sm bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white text-[13px] leading-relaxed font-medium shadow-sm">
          <p>{msg.text}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-theme-bg border-2 border-theme-accent-start flex items-center justify-center text-theme-accent-start shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-accent-start shrink-0 mt-1">
        <Bot className="w-4 h-4" />
      </div>
      <div className="max-w-[85%] space-y-3">
        {/* Réponse synthétique */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl rounded-tl-sm p-4 text-[13px] leading-relaxed text-theme-text-primary shadow-sm">
          {msg.noResult ? (
            <p className="text-theme-text-secondary italic">
              Aucun document ne contient d'information sur ce sujet. Vérifiez que les documents pertinents ont bien été indexés.
            </p>
          ) : (
            msg.text.split('\n\n').map((para, i) => (
              <p key={i} className={i > 0 ? 'mt-2' : ''}>{para}</p>
            ))
          )}
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-theme-text-secondary px-1">
              📎 Sources ({msg.sources.length})
            </p>
            {msg.sources.map((src, i) => (
              <SourceCard key={i} source={src} query={query} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────
export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: 'Bonjour ! Posez-moi une question sur vos documents officiels (statuts, formations, circulaires…) et je vous répondrai en m\'appuyant exclusivement sur les documents indexés.',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setLastQuery(question);
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const queryNettoyee = question.replace(/[^a-zA-Z0-9àâäéèêëîïôöùûüç\s]/g, ' ').trim();
      console.group(`🔍 [RECHERCHE] Question : "${question}"`);
      console.log(`🧹 Requête nettoyée : "${queryNettoyee}"`);
      let chunks: DocChunk[] = [];

      // 1. FTS Supabase
      if (queryNettoyee) {
        console.log('📡 [FTS] Lancement textSearch (websearch, french)…');
        const { data, error } = await supabase
          .from('documents')
          .select('id, name, content, file_url, page_count')
          .textSearch('tsv_content', queryNettoyee, { type: 'websearch', config: 'french' })
          .limit(6);
        if (error) console.error('❌ [FTS] Erreur Supabase:', error);
        chunks = data || [];
        console.log(`✅ [FTS] ${chunks.length} chunk(s) trouvé(s) :`, chunks.map(c => c.name));
      }

      // 2. Fallback ILIKE
      if (chunks.length < 2) {
        const mots = queryNettoyee.split(/\s+/).filter(m => m.length > 2);
        const motCle = mots.find(m => m === m.toUpperCase()) || mots[mots.length - 1];
        console.log(`🔄 [ILIKE] FTS insuffisant (${chunks.length}), fallback ILIKE sur mot-clé : "${motCle}"`);
        if (motCle) {
          const { data, error } = await supabase
            .from('documents')
            .select('id, name, content, file_url, page_count')
            .or(`content.ilike.%${motCle}%,name.ilike.%${motCle}%`)
            .limit(4);
          if (error) console.error('❌ [ILIKE] Erreur Supabase:', error);
          const extra = data || [];
          console.log(`✅ [ILIKE] ${extra.length} chunk(s) supplémentaire(s) :`, extra.map(c => c.name));
          const existingIds = new Set(chunks.map(c => c.id));
          chunks = [...chunks, ...extra.filter(c => !existingIds.has(c.id))];
        }
      }
      console.log(`📦 [TOTAL] ${chunks.length} chunk(s) retenus pour la synthèse.`);
      console.groupEnd();

      if (chunks.length === 0) {
        setMessages(prev => [...prev, { role: 'bot', text: '', noResult: true }]);
      } else {
        const { reponse, sources } = genererReponse(question, chunks);
        setMessages(prev => [...prev, { role: 'bot', text: reponse, sources }]);
      }
    } catch (err) {
      console.error('Erreur recherche:', err);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'Une erreur technique est survenue lors de la recherche.',
        noResult: true
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div
      className="flex flex-col h-screen bg-theme-bg text-theme-text-primary transition-theme overflow-hidden font-sans"
      style={{ backgroundColor: theme === 'dark' ? 'var(--theme-bg-dark)' : 'var(--theme-bg-light)' }}
    >
      {/* ── Header ── */}
      <header className="bg-theme-bg/80 backdrop-blur-xl px-4 py-3 flex items-center gap-4 border-b border-theme-border z-50 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 bg-theme-surface hover:bg-theme-surface-hover rounded-xl border border-theme-border text-theme-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-theme-accent-start to-theme-accent-end rounded-xl flex items-center justify-center text-white shadow-md shadow-theme-accent-start/20 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-theme-text-primary text-base leading-none tracking-tight">Assistant documentaire</h1>
            <p className="text-[9px] font-black text-theme-accent-end uppercase tracking-[0.25em] mt-0.5">Réponses basées sur les documents indexés</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-theme-surface border border-theme-border rounded-full">
          <Sparkles className="w-3 h-3 text-theme-accent-start" />
          <span className="text-[8px] font-black uppercase tracking-widest text-theme-text-secondary">Sans IA externe</span>
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5 scrollbar-thin">
        <div className="max-w-3xl mx-auto space-y-5 pb-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} query={lastQuery} />
          ))}

          {/* Indicateur de chargement */}
          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin text-theme-accent-start" />
              </div>
              <div className="px-4 py-2.5 bg-theme-surface border border-theme-border rounded-2xl rounded-tl-sm flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-theme-accent-start animate-ping shrink-0"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary">
                  Recherche dans les documents…
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ── Input ── */}
      <footer className="px-4 py-4 bg-theme-bg/80 backdrop-blur-xl border-t border-theme-border z-50 shrink-0">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Posez votre question sur les documents…"
            className="flex-1 bg-theme-surface border border-theme-border rounded-2xl px-5 py-3.5 text-sm text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-start/30 transition-all disabled:opacity-50"
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all shadow-lg shadow-theme-accent-start/20 cursor-pointer shrink-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-center text-[8px] font-black uppercase tracking-[0.2em] text-theme-text-secondary/50 mt-2">
          Les réponses sont générées uniquement à partir des documents officiels indexés
        </p>
      </footer>
    </div>
  );
};