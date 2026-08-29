import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { getCurrentProfile } from '../../lib/profileCache';
import {
    Send,
    Image as ImageIcon,
    X,
    Video,
    Mic,
    FileText,
    Loader2,
    ChevronRight,
    User as UserIcon,
    Plus,
    Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';
import { Navbar } from '../../monapp/components/Navbar';
import {
    fetchStructureChildren,
    type StructureNode,
} from '../../lib/structureTree';

type MediaItem = {
    url: string;
    type: 'image' | 'video' | 'audio' | 'pdf' | 'document';
};

type Structure = {
    id: string;
    name: string;
    type: string;
    parent_id: string | null;
};

type UserProfile = {
    id: string;
    prenom?: string;
    nom?: string;
    comi_id?: string;
    comi?: { name: string };
    coordinated_structure_id?: string;
    email?: string;
};

export const CreatePostPage = () => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [userRole, setUserRole] = useState('membre');
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState('');
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showStructureModal, setShowStructureModal] = useState(false);
    const [structures, setStructures] = useState<StructureNode[]>([]);
    const [navPath, setNavPath] = useState<StructureNode[]>([]);
    const [structuresLoading, setStructuresLoading] = useState(false);
    const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: uData } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single();
                if (uData) setUserRole(uData.role);

                const finalProfile = await getCurrentProfile();
                if (finalProfile) {
                    setUserProfile(finalProfile);

                    if (finalProfile.coordinated_structure_id) {
                        const allStructures = await getStructures();
                        const coordinated = allStructures.find(s => s.id === finalProfile.coordinated_structure_id);
                        if (coordinated) setSelectedStructure(coordinated as Structure);
                    }
                }
            }
            setLoading(false);
        };
        fetchUserData();
    }, []);

    const loadStructures = async (parentId: string | null) => {
        setStructuresLoading(true);
        const { data, error } = await fetchStructureChildren(parentId);
        if (error) {
            showNotification('Impossible de charger les structures', 'error');
            setStructures([]);
        } else {
            setStructures(data || []);
        }
        setStructuresLoading(false);
    };

    const openStructureModal = () => {
        setNavPath([]);
        setShowStructureModal(true);
        loadStructures(null);
    };

    const drillIntoStructure = (node: StructureNode) => {
        setNavPath((prev) => [...prev, node]);
        loadStructures(node.id);
    };

    const goToStructureRoot = () => {
        setNavPath([]);
        loadStructures(null);
    };

    const goToStructureParent = () => {
        setNavPath((prev) => {
            const next = prev.slice(0, -1);
            const parentId = next.length > 0 ? next[next.length - 1].id : null;
            loadStructures(parentId);
            return next;
        });
    };

    const goToBreadcrumb = (index: number) => {
        setNavPath((prev) => {
            const next = prev.slice(0, index + 1);
            loadStructures(next[next.length - 1].id);
            return next;
        });
    };

    const selectStructure = (node: StructureNode) => {
        setSelectedStructure({
            id: node.id,
            name: node.name,
            type: node.type,
            parent_id: node.parent_id
        });
        setShowStructureModal(false);
    };

    const processMediaSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const MAX_CONTENT_LENGTH = 15 * 1024 * 1024; // 15 Mo
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_CONTENT_LENGTH) {
            showNotification("Le fichier dépasse la taille maximale autorisée (15 Mo).", 'error');
            return;
        }

        const ALLOWED_TYPES = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const isAllowedType = file.type.startsWith('image/') || 
                              file.type.startsWith('video/') || 
                              file.type.startsWith('audio/') || 
                              ALLOWED_TYPES.includes(file.type) ||
                              file.name.endsWith('.doc') || 
                              file.name.endsWith('.docx');

        if (!isAllowedType) {
            showNotification("Type de fichier non autorisé.", 'error');
            return;
        }

        if (mediaItems.length >= 5) {
            showNotification("Limite de 5 médias atteinte.", 'error');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const isPDF = file.type === 'application/pdf';
        const isWord = file.type.includes('word') || file.type.includes('document') || file.name.endsWith('.doc') || file.name.endsWith('.docx');
        const resourceType = (isPDF || isWord) ? 'raw' : 'auto';

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.secure_url) {
                let type: MediaItem['type'] = 'image';
                if (file.type.startsWith('video/')) type = 'video';
                else if (file.type.startsWith('audio/')) type = 'audio';
                else if (isPDF) type = 'pdf';
                else if (isWord) type = 'document';

                setMediaItems([...mediaItems, { url: data.secure_url, type }]);
                showNotification("Média ajouté !", 'success');
            }
        } catch (uploadError) {
            console.error('Upload error:', uploadError);
            showNotification("Erreur lors de l'upload.", 'error');
        } finally {
            setUploading(false);
        }
    };

    const removeMedia = (index: number) => {
        setMediaItems(mediaItems.filter((_, i) => i !== index));
    };

    const handlePublish = async () => {
        if (!content.trim() || !selectedStructure || !userProfile) {
            showNotification("Veuillez remplir tous les champs obligatoires.", 'info');
            return;
        }

        setIsSubmitting(true);
        const isApproved = userRole === 'admin' || userRole === 'superadmin';
        const { data: newPost, error } = await supabase.from('publications').insert({
            content,
            media_items: mediaItems,
            structure_id: selectedStructure.id,
            author_id: userProfile.id,
            is_approved: isApproved
        }).select().single();

        if (error) {
            showNotification("Erreur lors de la publication : " + error.message, 'error');
            setIsSubmitting(false);
        } else {
            if (isApproved) {
                showNotification("Annonce publiée avec succès !", 'success');
                if (newPost) {
                    sendNotifications(selectedStructure, content, newPost.id);
                }
            } else {
                showNotification("Annonce soumise pour validation par un administrateur !", 'success');
            }

            navigate('/home');
        }
    };

    const sendNotifications = async (structure: Structure, postContent: string, postId: string) => {
        try {
            const allStructures = await getStructures();
            if (!allStructures || !userProfile) return;

            const getAllDescendants = (parentId: string): string[] => {
                let ids = [parentId];
                const children = allStructures.filter(s => s.parent_id === parentId);
                children.forEach(c => { ids = [...ids, ...getAllDescendants(c.id)]; });
                return ids;
            };

            const targetStructureIds = getAllDescendants(structure.id);
            const [membersRes, structuralFollowersRes, authorFollowersRes] = await Promise.all([
                supabase.from('profiles').select('id').in('comi_id', targetStructureIds),
                supabase.from('suivis').select('follower_id').eq('structure_id', structure.id),
                supabase.from('suivis').select('follower_id').eq('followed_profile_id', userProfile.id)
            ]);

            const recipientIds = new Set([
                ...(membersRes.data?.map(m => m.id) || []),
                ...(structuralFollowersRes.data?.map(f => f.follower_id) || []),
                ...(authorFollowersRes.data?.map(f => f.follower_id) || [])
            ]);

            recipientIds.delete(userProfile.id);
            if (recipientIds.size === 0) return;

            const notifs = Array.from(recipientIds).map(userId => ({
                user_id: userId,
                actor_id: userProfile.id,
                title: `Nouvelle publication : ${structure.name}`,
                content: postContent.substring(0, 100) + (postContent.length > 100 ? '...' : ''),
                type: 'publication_new',
                entity_type: 'publication',
                entity_id: postId,
                is_read: false
            }));

            await supabase.from('notifications').insert(notifs);
        } catch (err) {
            console.error("Erreur lors de l'envoi des notifications:", err);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme pb-24">
            <Navbar
                mode="subpage"
                title="Nouvelle Annonce"
                subtitle="Publication officiel"
                onBack={() => navigate(-1)}
                rightActions={
                    <button
                        onClick={handlePublish}
                        disabled={isSubmitting || !content.trim() || !selectedStructure}
                        className="px-5 py-2.5 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-theme-accent-start/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 flex items-center gap-1.5 cursor-pointer"
                    >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Publier
                    </button>
                }
            />

            <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* ═══ Carte Auteur ═══ */}
                <div className="flex items-center gap-4 p-4 bg-theme-surface/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-lg">
                    <div className="w-11 h-11 bg-gradient-to-br from-theme-accent-start to-theme-accent-end rounded-full flex items-center justify-center shadow-lg shadow-theme-accent-start/20 shrink-0">
                        <UserIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-theme-text-primary truncate">{userProfile?.prenom} {userProfile?.nom}</p>
                        <p className="text-[9px] font-bold text-theme-accent-start uppercase tracking-widest truncate">{userProfile?.comi?.name || 'Armée de petits anges'}</p>
                    </div>
                </div>

                {/* ═══ Sélection Structure ═══ */}
                <div className="space-y-2.5">
                    <p className="text-[9px] font-black text-theme-text-secondary uppercase tracking-widest px-3">Structure émettrice</p>
                    <button
                        type="button"
                        onClick={() => { if (userRole !== 'coordonateur') openStructureModal(); }}
                        disabled={userRole === 'coordonateur'}
                        className={`w-full p-4 bg-theme-surface/60 backdrop-blur-xl rounded-[2rem] border border-dashed border-white/10 flex items-center justify-between transition-all group text-left ${userRole === 'coordonateur' ? 'cursor-not-allowed opacity-80' : 'hover:bg-white/5 hover:border-theme-accent-start/30 cursor-pointer'}`}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 bg-theme-bg border border-white/10 text-theme-accent-start rounded-xl flex items-center justify-center shadow-inner group-hover:bg-gradient-to-br group-hover:from-theme-accent-start group-hover:to-theme-accent-end group-hover:text-white transition-all">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-theme-text-primary leading-none">
                                    {selectedStructure?.name || 'Choisir la structure émettrice'}
                                </p>
                                <p className="text-[8px] font-bold text-theme-accent-start uppercase mt-1 tracking-wider">
                                    {userRole === 'coordonateur' ? 'Structure assignée (Fixe)' : 'Requis'}
                                </p>
                            </div>
                        </div>
                        {userRole !== 'coordonateur' && (
                            <ChevronRight className="w-4 h-4 text-theme-text-secondary group-hover:text-theme-text-primary group-hover:translate-x-1 transition-all" />
                        )}
                    </button>
                </div>

                {/* ═══ Champ de message ═══ */}
                <div className="space-y-2.5">
                    <p className="text-[9px] font-black text-theme-text-secondary uppercase tracking-widest px-3">Description</p>
                    <textarea
                        placeholder="Quoi de neuf ?"
                        className="w-full min-h-[150px] p-5 bg-theme-surface/60 backdrop-blur-xl border border-white/10 rounded-[2rem] text-sm focus:ring-2 focus:ring-theme-accent-start/20 focus:border-theme-accent-start/30 transition-all text-theme-text-primary outline-none resize-none shadow-lg placeholder:text-theme-text-secondary/40"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>

                {/* ═══ Zone Médias ═══ */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-3">
                        <p className="text-[9px] font-black text-theme-text-secondary uppercase tracking-widest">Médias ({mediaItems.length}/5)</p>
                        {mediaItems.length < 5 && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="font-black text-[9px] uppercase flex items-center gap-1 text-theme-accent-start cursor-pointer hover:underline"
                            >
                                <Plus className="w-3.5 h-3.5" /> Ajouter
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {mediaItems.map((item, idx) => (
                            <div key={idx} className="relative rounded-2xl overflow-hidden aspect-video border border-white/10 bg-theme-surface/60 backdrop-blur-md group shadow-lg">
                                <button
                                    type="button"
                                    onClick={() => removeMedia(idx)}
                                    className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-red-500 transition-all cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                {item.type === 'image' && <img loading="lazy" src={item.url} className="w-full h-full object-cover" alt="Media upload" />}
                                {item.type === 'video' && <video src={item.url} className="w-full h-full object-cover bg-black" controls />}
                                {item.type === 'audio' && (
                                    <div className="w-full h-full bg-orange-500/10 flex flex-col items-center justify-center gap-1 text-orange-500">
                                        <Mic className="w-5 h-5" />
                                        <span className="text-[8px] font-black uppercase">AUDIO</span>
                                    </div>
                                )}
                                {item.type === 'pdf' && (
                                    <div className="w-full h-full bg-red-500/10 flex flex-col items-center justify-center gap-1 text-red-500">
                                        <FileText className="w-5 h-5" />
                                        <span className="text-[8px] font-black uppercase">PDF</span>
                                    </div>
                                )}
                                {item.type === 'document' && (
                                    <div className="w-full h-full bg-blue-500/10 flex flex-col items-center justify-center gap-1 text-blue-500">
                                        <FileText className="w-5 h-5" />
                                        <span className="text-[8px] font-black uppercase">Word Doc</span>
                                    </div>
                                )}
                            </div>
                        ))}
                        {uploading && (
                            <div className="aspect-video bg-theme-surface/60 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 shadow-inner">
                                <Loader2 className="w-6 h-6 text-theme-accent-start animate-spin" />
                                <p className="text-[8px] font-bold text-theme-text-secondary uppercase">Téléchargement...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ Barre d'outils Média ═══ */}
                <div className="flex gap-2 p-2.5 bg-theme-surface/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto no-scrollbar shadow-sm">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                        <ImageIcon className="w-5 h-5 text-blue-400" />
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                        <Video className="w-5 h-5 text-purple-400" />
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                        <Mic className="w-5 h-5 text-orange-400" />
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                        <FileText className="w-5 h-5 text-red-400" />
                    </button>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={processMediaSelection}
                    accept="image/*,video/*,audio/*,application/pdf,.doc,.docx"
                    maxLength={15728640}
                    max={15728640}
                />
            </main>

            {/* ═══════════════════════════════════════════════════════
                MODALE STRUCTURE — Glassmorphism Premium
               ═══════════════════════════════════════════════════════ */}
            {showStructureModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-theme-surface/80 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[2rem] p-6 space-y-5 max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-300 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-theme-text-primary uppercase tracking-tighter">
                                Structure Émettrice
                            </h3>
                            <button
                                onClick={() => setShowStructureModal(false)}
                                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-theme-text-secondary hover:text-theme-text-primary cursor-pointer transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            <button
                                type="button"
                                onClick={goToStructureRoot}
                                className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase text-theme-text-secondary hover:text-theme-accent-start shrink-0 cursor-pointer transition-colors"
                            >
                                RACINE
                            </button>
                            {navPath.map((p, i) => (
                                <div key={p.id} className="flex items-center gap-1 shrink-0">
                                    <ChevronRight className="w-3 h-3 text-theme-text-secondary/35" />
                                    <button
                                        type="button"
                                        onClick={() => goToBreadcrumb(i)}
                                        className="px-3.5 py-1.5 bg-theme-accent-start/10 border border-theme-accent-start/20 text-theme-accent-start rounded-full text-[8px] font-black uppercase cursor-pointer"
                                    >
                                        {p.name}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Bouton retour parent */}
                        {navPath.length > 0 && (
                            <button
                                type="button"
                                onClick={goToStructureParent}
                                className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 text-theme-text-primary border border-white/10 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4 rotate-180" />
                                Retour au niveau parent
                            </button>
                        )}

                        <p className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest px-1">
                            {navPath.length === 0
                                ? 'Choisissez une structure ou descendez dans la hiérarchie pour publier à un niveau inférieur'
                                : `Sous-structures de « ${navPath[navPath.length - 1].name} »`}
                        </p>

                        {/* Liste */}
                        {structuresLoading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-theme-accent-start" />
                            </div>
                        ) : structures.length === 0 ? (
                            <p className="text-center text-sm text-theme-text-secondary py-8">
                                Aucune sous-structure à ce niveau.
                            </p>
                        ) : (
                            <div className="grid gap-2.5">
                                {structures.map((s) => {
                                    const hasSub = s.hasChildren;
                                    return (
                                        <div
                                            key={s.id}
                                            className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between group transition-all hover:bg-white/8"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => selectStructure(s)}
                                                className="flex-1 flex items-center gap-3 text-left cursor-pointer mr-2"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white flex items-center justify-center font-black text-[9px] shadow-lg shadow-theme-accent-start/20 transition-all group-hover:scale-105">
                                                    {s.type}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-theme-text-primary uppercase truncate">{s.name}</p>
                                                    <p className="text-[8px] font-bold text-theme-accent-start uppercase tracking-widest">
                                                        ✓ Sélectionner
                                                    </p>
                                                </div>
                                            </button>

                                            {hasSub && (
                                                <button
                                                    type="button"
                                                    onClick={() => drillIntoStructure(s)}
                                                    className="p-3 bg-white/5 hover:bg-theme-accent-start hover:text-white border border-white/10 rounded-xl text-theme-text-secondary transition-all flex items-center gap-1 cursor-pointer"
                                                    title="Explorer les sous-structures"
                                                >

                                                    <span className="text-[8px] font-black uppercase">+</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
