import { useState, useRef } from 'react';
import { X, Search, Check, Paperclip, UserPlus, FileText, Image, Music } from 'lucide-react';
import type { ForumUser } from '../CoordinatorForumPage';

interface Props {
    mode: 'mention' | 'file';
    usersDirectory: ForumUser[];
    onClose: () => void;
    onConfirmMentions: (users: ForumUser[]) => void;
    onConfirmFile: (file: File) => void;
}

export const ForumAttachMentionModal = ({ mode, usersDirectory, onClose, onConfirmMentions, onConfirmFile }: Props) => {
    const [activeTab, setActiveTab] = useState<'mention' | 'file'>(mode);
    const [search, setSearch] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<ForumUser[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const filtered = usersDirectory.filter(u =>
        u.label.toLowerCase().includes(search.toLowerCase()) ||
        u.structLabel.toLowerCase().includes(search.toLowerCase())
    );

    const toggleUser = (user: ForumUser) => {
        setSelectedUsers(prev =>
            prev.some(u => u.id === user.id)
                ? prev.filter(u => u.id !== user.id)
                : [...prev, user]
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setSelectedFile(file);
    };

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-400" />;
        if (file.type.startsWith('audio/')) return <Music className="w-5 h-5 text-green-400" />;
        return <FileText className="w-5 h-5 text-orange-400" />;
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} o`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    };

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
                    <div className="flex gap-1 bg-theme-bg p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('mention')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'mention' ? 'bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white shadow-sm' : 'text-theme-text-secondary hover:text-theme-text-primary'}`}
                        >
                            <UserPlus className="w-3 h-3" />
                            Mentions
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('file')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'file' ? 'bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white shadow-sm' : 'text-theme-text-secondary hover:text-theme-text-primary'}`}
                        >
                            <Paperclip className="w-3 h-3" />
                            Fichier
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 bg-theme-bg border border-theme-border rounded-lg text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Onglet Mentions */}
                {activeTab === 'mention' && (
                    <div className="flex flex-col">
                        {/* Barre de recherche */}
                        <div className="px-4 py-3 border-b border-theme-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-text-secondary" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Rechercher un coordonnateur..."
                                    className="w-full bg-theme-bg border border-theme-border rounded-xl pl-9 pr-3 py-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/50 outline-none focus:border-theme-accent-start transition-colors"
                                />
                            </div>
                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {selectedUsers.map(u => (
                                        <span
                                            key={u.id}
                                            className="flex items-center gap-1 bg-theme-accent-start/20 text-theme-accent-start text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        >
                                            @{u.label}
                                            <button type="button" onClick={() => toggleUser(u)} className="cursor-pointer">
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Liste */}
                        <div className="max-h-56 overflow-y-auto p-1">
                            {filtered.length > 0 ? filtered.map(u => {
                                const isSelected = selectedUsers.some(s => s.id === u.id);
                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => toggleUser(u)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${isSelected ? 'bg-theme-accent-start/10 border border-theme-accent-start/30' : 'hover:bg-theme-bg'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-gradient-to-br from-theme-accent-start to-theme-accent-end border-transparent' : 'border-theme-border'}`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-theme-text-primary truncate">{u.label}</p>
                                            <p className="text-[9px] font-black text-theme-accent-start uppercase tracking-wider truncate">{u.structLabel}</p>
                                        </div>
                                    </button>
                                );
                            }) : (
                                <div className="text-center py-6 text-xs text-theme-text-secondary">Aucun coordonnateur trouvé</div>
                            )}
                        </div>

                        {/* Bouton confirmer */}
                        <div className="px-4 py-3 border-t border-theme-border">
                            <button
                                type="button"
                                disabled={selectedUsers.length === 0}
                                onClick={() => { onConfirmMentions(selectedUsers); onClose(); }}
                                className="w-full py-2.5 bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white text-sm font-black rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity cursor-pointer"
                            >
                                {selectedUsers.length > 0 ? `Mentionner ${selectedUsers.length} personne${selectedUsers.length > 1 ? 's' : ''}` : 'Sélectionner des personnes'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Onglet Fichier */}
                {activeTab === 'file' && (
                    <div className="flex flex-col p-4 gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {/* Zone de drop / sélection */}
                        {!selectedFile ? (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-theme-border rounded-2xl hover:border-theme-accent-start/50 hover:bg-theme-bg transition-all cursor-pointer group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-theme-bg group-hover:bg-theme-accent-start/10 flex items-center justify-center transition-colors">
                                    <Paperclip className="w-6 h-6 text-theme-text-secondary group-hover:text-theme-accent-start transition-colors" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-theme-text-primary">Choisir un fichier</p>
                                    <p className="text-[10px] text-theme-text-secondary mt-0.5">Image, Audio, PDF, Document...</p>
                                </div>
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 p-3 bg-theme-bg border border-theme-border rounded-xl">
                                {getFileIcon(selectedFile)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-theme-text-primary truncate">{selectedFile.name}</p>
                                    <p className="text-[10px] text-theme-text-secondary">{formatSize(selectedFile.size)}</p>
                                </div>
                                <button type="button" onClick={() => setSelectedFile(null)} className="p-1 text-theme-text-secondary hover:text-red-400 cursor-pointer">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex gap-2">
                            {[
                                { label: 'Image', icon: <Image className="w-4 h-4" />, accept: 'image/*' },
                                { label: 'Audio', icon: <Music className="w-4 h-4" />, accept: 'audio/*' },
                                { label: 'Document', icon: <FileText className="w-4 h-4" />, accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt' },
                            ].map(({ label, icon, accept }) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => {
                                        if (fileInputRef.current) {
                                            fileInputRef.current.accept = accept;
                                            fileInputRef.current.click();
                                        }
                                    }}
                                    className="flex-1 flex flex-col items-center gap-1 py-2.5 bg-theme-bg hover:bg-theme-surface border border-theme-border rounded-xl text-[9px] font-black uppercase tracking-wider text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer"
                                >
                                    {icon}
                                    {label}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            disabled={!selectedFile}
                            onClick={() => { if (selectedFile) { onConfirmFile(selectedFile); onClose(); } }}
                            className="w-full py-2.5 bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white text-sm font-black rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity cursor-pointer"
                        >
                            {selectedFile ? 'Joindre ce fichier' : 'Sélectionner un fichier'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
