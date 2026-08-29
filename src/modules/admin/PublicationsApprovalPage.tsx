import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStructures } from '../../lib/structureCache';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';
import { Navbar } from '../../monapp/components/Navbar';
import { Check, X, Clock, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PublicationsApprovalPage = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: publications = [], isLoading: loading } = useQuery({
    queryKey: ['adminPublications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publications')
        .select(`
          *,
          author:profiles!publications_author_id_fkey(id, nom, prenom),
          structure:structures(id, name, type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const handleApprove = async (post: any) => {
    try {
      const { error } = await supabase
        .from('publications')
        .update({ is_approved: true })
        .eq('id', post.id);

      if (error) throw error;

      showNotification('Publication approuvée avec succès', 'success');

      // 1. Notifier l'auteur du post
      if (post.author_id) {
        await supabase.from('notifications').insert({
          user_id: post.author_id,
          title: 'Publication approuvée 🎉',
          content: 'Votre publication a été approuvée par l\'administration.',
          type: 'system',
          entity_type: 'publication',
          entity_id: post.id,
          is_read: false
        });
      }

      // 2. Envoyer les notifications aux abonnés (Fan-out)
      await sendApprovalNotifications(post);

      // Recharger
      queryClient.invalidateQueries({ queryKey: ['adminPublications'] });
    } catch (err) {
      console.error(err);
      showNotification('Erreur lors de la validation', 'error');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('publications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showNotification('Publication supprimée', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminPublications'] });
    } catch (err) {
      console.error(err);
      showNotification('Erreur lors de la suppression', 'error');
    }
  };

  const sendApprovalNotifications = async (post: any) => {
    try {
      const allStructures = await getStructures();
      if (!allStructures || !post.structure_id) return;

      const getAllDescendants = (parentId: string): string[] => {
        let ids = [parentId];
        const children = allStructures.filter(s => s.parent_id === parentId);
        children.forEach(c => { ids = [...ids, ...getAllDescendants(c.id)]; });
        return ids;
      };

      const targetStructureIds = getAllDescendants(post.structure_id);

      const [membersRes, structuralFollowersRes, authorFollowersRes] = await Promise.all([
        supabase.from('profiles').select('id').in('comi_id', targetStructureIds),
        supabase.from('suivis').select('follower_id').eq('structure_id', post.structure_id),
        supabase.from('suivis').select('follower_id').eq('followed_profile_id', post.author_id)
      ]);

      const recipientIds = new Set([
        ...(membersRes.data?.map(m => m.id) || []),
        ...(structuralFollowersRes.data?.map(f => f.follower_id) || []),
        ...(authorFollowersRes.data?.map(f => f.follower_id) || [])
      ]);

      // Ne pas notifier l'auteur
      if (post.author_id) recipientIds.delete(post.author_id);

      if (recipientIds.size === 0) return;

      const notifs = Array.from(recipientIds).map(userId => ({
        user_id: userId,
        actor_id: post.author_id,
        title: `Nouvelle publication : ${post.structure?.name || 'Structure'}`,
        content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        type: 'publication_new',
        entity_type: 'publication',
        entity_id: post.id,
        is_read: false
      }));

      await supabase.from('notifications').insert(notifs);
    } catch (err) {
      console.error('Erreur sendApprovalNotifications:', err);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredPosts = publications.filter(p => 
    activeTab === 'approved' ? p.is_approved === true : p.is_approved === false
  );

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary pb-20">
      <Navbar
        mode="subpage"
        title="Modération Annonces"
        subtitle={`${filteredPosts.length} publication(s) ${activeTab === 'approved' ? 'approuvée(s)' : 'en attente'}`}
        onBack={() => navigate('/admin')}
      />

      {/* TABS */}
      <div className="flex max-w-2xl mx-auto border-b border-theme-border mt-4 px-4">
        <button
          onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeTab === 'pending' ? 'border-theme-accent-start text-theme-accent-start bg-theme-accent-start/5 rounded-t-xl' : 'border-transparent text-theme-text-secondary'
          }`}
        >
          En attente
        </button>
        <button
          onClick={() => { setActiveTab('approved'); setCurrentPage(1); }}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeTab === 'approved' ? 'border-theme-accent-start text-theme-accent-start bg-theme-accent-start/5 rounded-t-xl' : 'border-transparent text-theme-text-secondary'
          }`}
        >
          Approuvées
        </button>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 space-y-4">
        {paginatedPosts.length === 0 ? (
          <div className="text-center py-12 bg-theme-surface rounded-2xl border border-theme-border">
            <Clock className="w-10 h-10 text-theme-text-secondary/50 mx-auto mb-3" />
            <p className="text-theme-text-secondary text-sm">Aucune publication dans cette catégorie.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedPosts.map(post => (
                <div key={post.id} className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-theme-border pb-3">
                    <div>
                      <h3 className="font-black text-sm text-theme-text-primary">
                        {post.author ? `${post.author.prenom} ${post.author.nom}` : 'Utilisateur inconnu'}
                      </h3>
                      <p className="text-[9px] text-theme-accent-start uppercase font-bold tracking-widest mt-0.5">
                        {post.structure?.name} ({post.structure?.type})
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-theme-text-secondary">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-theme-text-secondary leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {post.media_items && post.media_items.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {post.media_items.map((m: any, idx: number) => (
                        <div key={idx} className="px-2.5 py-1 bg-theme-bg border border-theme-border text-[9px] font-bold rounded-lg uppercase text-theme-text-secondary">
                          📎 {m.type}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 border-t border-theme-border pt-4">
                    <button
                      onClick={() => navigate(`/pub/${post.id}`)}
                      className="flex-1 py-2 bg-theme-bg border border-theme-border text-theme-text-primary font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-theme-surface-hover transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Voir
                    </button>
                    <button
                      onClick={() => handleReject(post.id)}
                      className="flex-1 py-2 bg-red-500/10 text-red-500 font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Supprimer
                    </button>
                    {activeTab === 'pending' && (
                      <button
                        onClick={() => handleApprove(post)}
                        className="flex-1 py-2 bg-green-500/10 text-green-500 font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-green-500/20 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Approuver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-theme-surface p-3 rounded-xl border border-theme-border">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-theme-bg rounded-lg border border-theme-border disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-theme-bg rounded-lg border border-theme-border disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
