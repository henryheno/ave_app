import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../monapp/NotificationContext';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Users,
    FileText,
} from 'lucide-react';

const CATEGORIES = ['anges', 'archanges', 'perames', 'autre'];
const ANIMATEURS = ['Mon premier', 'PÃ©rames', 'Coordinateur', 'Chefs de troupe', 'AGA', 'ASA', 'ARO', 'AJO', 'Autres'];

interface TroupeSection {
    id: string;
    nom_troupe: string;
    sous_theme: string;
    contenu: string;
}

// Composant Ã©diteur riche rÃ©utilisable
const RichEditor = ({
    content,
    onChange,
    placeholder,
}: {
    content: string;
    onChange: (html: string) => void;
    placeholder: string;
}) => {
    const extensions = useMemo(() => [
        StarterKit,
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder }),
    ], [placeholder]);

    const editor = useEditor({
        extensions,
        content,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class: 'outline-none min-h-[140px] text-sm text-theme-text-primary leading-relaxed prose prose-invert max-w-none p-0',
            },
        },
    });

    if (!editor) return null;

    const ToolBtn = ({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) => (
        <button
            type="button"
            onClick={onClick}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${active ? 'bg-theme-accent-start text-white' : 'text-theme-text-secondary hover:bg-theme-surface-hover hover:text-theme-text-primary'}`}
        >
            {children}
        </button>
    );

    return (
        <div className="bg-theme-bg border border-theme-border rounded-xl overflow-hidden focus-within:border-theme-accent-start transition-colors">
            {/* Toolbar */}
            <div className="flex items-center flex-wrap gap-0.5 p-2 border-b border-theme-border bg-theme-surface">
                <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
                    <Bold className="w-3.5 h-3.5" />
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
                    <Italic className="w-3.5 h-3.5" />
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
                    <UnderlineIcon className="w-3.5 h-3.5" />
                </ToolBtn>
                <div className="w-px h-4 bg-theme-border mx-1" />
                <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
                    <List className="w-3.5 h-3.5" />
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
                    <ListOrdered className="w-3.5 h-3.5" />
                </ToolBtn>
                <div className="w-px h-4 bg-theme-border mx-1" />
                <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}>
                    <AlignLeft className="w-3.5 h-3.5" />
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}>
                    <AlignCenter className="w-3.5 h-3.5" />
                </ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}>
                    <AlignRight className="w-3.5 h-3.5" />
                </ToolBtn>
            </div>
            {/* Zone de saisie */}
            <div className="p-3">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export const FormationEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showNotification } = useNotification();

    const [form, setForm] = useState({
        numero: '',
        theme_general: '',
        objectif: '',
        animateur: 'Mon premier',
        type_lecon: 'unique' as 'unique' | 'troupe',
        categorie: 'anges',
        contenu_unique: '',
    });

    const [troupeSections, setTroupeSections] = useState<TroupeSection[]>([{
        id: crypto.randomUUID(),
        nom_troupe: 'SAGA',
        sous_theme: '',
        contenu: ''
    }]);

    const [isLoaded, setIsLoaded] = useState(false);
    
    useQuery({
        queryKey: ['formations_lecons', id],
        enabled: !isLoaded,
        queryFn: async () => {
            const { data: lecon, error } = await supabase.from('formations_lecons').select('*').eq('id', id).single();
            if (error) return null;
            
            setForm({
                numero: lecon.numero,
                theme_general: lecon.theme_general,
                objectif: lecon.objectif,
                animateur: lecon.animateur,
                type_lecon: lecon.type_lecon,
                categorie: lecon.categorie,
                contenu_unique: lecon.contenu_unique || ''
            });

            if (lecon.type_lecon === 'troupe') {
                const { data: troupes } = await supabase.from('formations_troupes_contenus').select('*').eq('lecon_id', id);
                if (troupes && troupes.length > 0) {
                    setTroupeSections(troupes.map((t: any) => ({
                        id: t.id || crypto.randomUUID(),
                        nom_troupe: t.nom_troupe,
                        sous_theme: t.sous_theme,
                        contenu: t.contenu
                    })));
                }
            }
            setIsLoaded(true);
            return lecon;
        }
    });

    const updateTroupeSection = useCallback((id: string, key: keyof TroupeSection, value: string) => {
        setTroupeSections(prev => prev.map(s => s.id === id ? { ...s, [key]: value } : s));
    }, []);

    const addTroupeSection = () => {
        setTroupeSections(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), nom_troupe: 'SAGA', sous_theme: '', contenu: '' }]);
    };

    const removeTroupeSection = (id: string) => {
        setTroupeSections(prev => prev.filter(s => s.id !== id));
    };

    const updateMutation = useMutation({
        mutationFn: async () => {
            // Update la leçon
            const { error: leconError } = await supabase
                .from('formations_lecons')
                .update({
                    numero: form.numero,
                    theme_general: form.theme_general,
                    objectif: form.objectif,
                    animateur: form.animateur,
                    type_lecon: form.type_lecon,
                    categorie: form.categorie,
                    contenu_unique: form.type_lecon === 'unique' ? form.contenu_unique : null,
                })
                .eq('id', id);

            if (leconError) throw leconError;

            // Gérer les troupes
            if (form.type_lecon === 'troupe') {
                // Supprimer les anciennes troupes
                await supabase.from('formations_troupes_contenus').delete().eq('lecon_id', id);
                
                // Insérer les nouvelles
                const { error: troupeError } = await supabase
                    .from('formations_troupes_contenus')
                    .insert(
                        troupeSections.map(s => ({
                            lecon_id: id,
                            nom_troupe: s.nom_troupe,
                            sous_theme: s.sous_theme,
                            contenu: s.contenu,
                        }))
                    );
                if (troupeError) throw troupeError;
            } else {
                // Si c'est passé de troupe à unique, supprimer les troupes existantes
                await supabase.from('formations_troupes_contenus').delete().eq('lecon_id', id);
            }

            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['formations_lecons'] });
            showNotification('Leçon modifiée avec succès !', 'success');
            navigate(`/formation/${id}`);
        },
        onError: (err) => {
            console.error(err);
            showNotification("Erreur lors de la modification.", 'error');
        },
    });

    const handleSubmit = () => {
        if (!form.numero || !form.theme_general || !form.objectif) {
            showNotification('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }
        if (form.type_lecon === 'unique' && !form.contenu_unique.replace(/<[^>]*>/g, '').trim()) {
            showNotification('Veuillez saisir le contenu de la leÃ§on', 'error');
            return;
        }
        if (form.type_lecon === 'troupe') {
            const incomplete = troupeSections.some(s => !s.nom_troupe || !s.sous_theme || !s.contenu.replace(/<[^>]*>/g, '').trim());
            if (incomplete) {
                showNotification('Veuillez remplir toutes les sections de troupe', 'error');
                return;
            }
        }
        updateMutation.mutate();
    };

    if (!isLoaded) {
        return <div className="p-8 text-center text-theme-text-secondary">Chargement de la leçon...</div>;
    }

    const inputClass = "w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text-primary placeholder:text-theme-text-secondary outline-none focus:border-theme-accent-start transition-colors";
    const labelClass = "block text-[10px] font-black uppercase tracking-widest text-theme-text-secondary mb-1.5";

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans">
            {/* HEADER */}
            <header className="bg-theme-bg/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-theme-border sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover transition-all border border-theme-border cursor-pointer">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <span className="block font-black text-theme-text-primary text-base leading-none uppercase tracking-tighter">Modifier la leçon</span>
                        <span className="text-[8px] font-bold text-theme-accent-end uppercase tracking-[0.25em] opacity-80">Édition</span>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={updateMutation.isPending}
                    className="px-4 py-2.5 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-xl font-black text-xs shadow hover:opacity-90 disabled:opacity-60 transition-all cursor-pointer"
                >
                    {updateMutation.isPending ? 'Enregistrement...' : 'Mettre à jour'}
                </button>
            </header>

            <main className="max-w-2xl mx-auto w-full p-4 pb-28 space-y-5">

                {/* Infos gÃ©nÃ©rales */}
                <section className="bg-theme-surface rounded-2xl border border-theme-border p-4 space-y-4">
                    <h2 className="font-black text-sm text-theme-text-primary uppercase tracking-wide">Informations gÃ©nÃ©rales</h2>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>NumÃ©ro *</label>
                            <input type="number" placeholder="Ex: 42" value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>CatÃ©gorie *</label>
                            <select value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))} className={inputClass}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>ThÃ¨me gÃ©nÃ©ral *</label>
                        <input type="text" placeholder="Ex : La priÃ¨re intercessive" value={form.theme_general} onChange={e => setForm(p => ({ ...p, theme_general: e.target.value }))} className={inputClass} />
                    </div>

                    <div>
                        <label className={labelClass}>Objectif de la leÃ§on *</label>
                        <textarea rows={2} placeholder="Ce que les participants doivent retenir..." value={form.objectif} onChange={e => setForm(p => ({ ...p, objectif: e.target.value }))} className={`${inputClass} resize-none`} />
                    </div>

                    <div>
                        <label className={labelClass}>Animateur</label>
                        <select value={form.animateur} onChange={e => setForm(p => ({ ...p, animateur: e.target.value }))} className={inputClass}>
                            {ANIMATEURS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </section>

                {/* Type de leÃ§on */}
                <section className="bg-theme-surface rounded-2xl border border-theme-border p-4 space-y-4">
                    <h2 className="font-black text-sm text-theme-text-primary uppercase tracking-wide">Type de leÃ§on</h2>
                    <div className="flex bg-theme-bg p-1.5 rounded-xl border border-theme-border gap-1">
                        {(['unique', 'troupe'] as const).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setForm(p => ({ ...p, type_lecon: type }))}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${form.type_lecon === type ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white shadow' : 'text-theme-text-secondary hover:bg-theme-surface-hover'}`}
                            >
                                {type === 'unique' ? <FileText className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                                {type === 'unique' ? 'LeÃ§on Unique' : 'Par Troupe'}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Contenu */}
                {form.type_lecon === 'unique' ? (
                    <section className="bg-theme-surface rounded-2xl border border-theme-border p-4 space-y-3">
                        <h2 className="font-black text-sm text-theme-text-primary uppercase tracking-wide">Contenu de la leÃ§on</h2>
                        <RichEditor
                            content={form.contenu_unique}
                            onChange={html => setForm(p => ({ ...p, contenu_unique: html }))}
                            placeholder="Commencez Ã  rÃ©diger le contenu de la leÃ§on..."
                        />
                    </section>
                ) : (
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-black text-sm text-theme-text-primary uppercase tracking-wide">Sections par troupe</h2>
                            <button
                                type="button"
                                onClick={addTroupeSection}
                                className="flex items-center gap-1.5 px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-xs font-black text-theme-text-secondary hover:bg-theme-surface-hover transition-all cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" /> Ajouter une troupe
                            </button>
                        </div>
                        {troupeSections.map((section, idx) => (
                            <div key={section.id} className="bg-theme-surface rounded-2xl border border-theme-border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-theme-text-secondary uppercase tracking-widest">Troupe {idx + 1}</span>
                                    {troupeSections.length > 1 && (
                                        <button type="button" onClick={() => removeTroupeSection(section.id)} className="text-theme-text-secondary hover:text-red-500 transition-colors p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>Nom de la troupe *</label>
                                        <select value={section.nom_troupe} onChange={e => updateTroupeSection(section.id, 'nom_troupe', e.target.value)} className={inputClass}>
                                            <option value="SAGA">SAGA</option>
                                            <option value="SAO">SAO</option>
                                            <option value="SARA">SARA</option>
                                            <option value="SAO et SARA">SAO et SARA</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Sous-thÃ¨me *</label>
                                        <input type="text" placeholder="Ex: La foi des jeunes" value={section.sous_theme} onChange={e => updateTroupeSection(section.id, 'sous_theme', e.target.value)} className={inputClass} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Contenu *</label>
                                    <RichEditor
                                        content={section.contenu}
                                        onChange={html => updateTroupeSection(section.id, 'contenu', html)}
                                        placeholder={`Contenu pour la troupe ${section.nom_troupe || idx + 1}...`}
                                    />
                                </div>
                            </div>
                        ))}
                    </section>
                )}
            </main>
        </div>
    );
};
