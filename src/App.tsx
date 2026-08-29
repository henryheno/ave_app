import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { NotificationProvider } from './monapp/NotificationContext';
import { PageLoader } from './monapp/Branding';
import { ThemeProvider } from './monapp/ThemeContext';
import { AuthProvider, useAuth } from './monapp/AuthContext';
import React from 'react';

// Error Boundary for Lazy Loaded Components
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-theme-bg p-6 text-center z-[99999]">
          <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 mb-6 max-w-md">
            <h1 className="text-red-500 font-black text-lg mb-2">Oups ! Une erreur est survenue</h1>
            <p className="text-sm text-theme-text-secondary">Un problème a empêché le chargement de cette page. Cela peut arriver lors d'une mise à jour ou d'une perte de connexion.</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-theme-surface border border-theme-border rounded-xl font-bold hover:bg-theme-surface-hover transition-colors">
            Rafraîchir la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy loaded pages
const Login = lazy(() => import('./modules/auth/Login').then(m => ({ default: m.Login })));
const Home = lazy(() => import('./modules/home/Home').then(m => ({ default: m.Home })));
const AdminPage = lazy(() => import('./modules/admin/AdminPage').then(m => ({ default: m.AdminPage })));
const CordonPage = lazy(() => import('./modules/cordon/CordonPage').then(m => ({ default: m.CordonPage })));
const CoordinatorForumPage = lazy(() => import('./modules/cordon/CoordinatorForumPage').then(m => ({ default: m.CoordinatorForumPage })));
const StructuresPage = lazy(() => import('./modules/admin/StructuresPage').then(m => ({ default: m.StructuresPage })));
const DashboardPage = lazy(() => import('./modules/admin/DashboardPage').then(m => ({ default: m.DashboardPage })));
const NominationPage = lazy(() => import('./modules/admin/NominationPage').then(m => ({ default: m.NominationPage })));
const CompleteProfilePage = lazy(() => import('./modules/auth/CompleteProfilePage').then(m => ({ default: m.CompleteProfilePage })));
const UpdatePasswordPage = lazy(() => import('./modules/auth/UpdatePasswordPage').then(m => ({ default: m.UpdatePasswordPage })));
const CreatePostPage = lazy(() => import('./modules/publications/CreatePostPage').then(m => ({ default: m.CreatePostPage })));
const PostDetailsPage = lazy(() => import('./modules/publications/PostDetailsPage').then(m => ({ default: m.PostDetailsPage })));
const CommunityPage = lazy(() => import('./modules/community/CommunityPage').then(m => ({ default: m.CommunityPage })));
const SouhaitsPage = lazy(() => import('./modules/community/SouhaitsPage').then(m => ({ default: m.SouhaitsPage })));
const ProfilPage = lazy(() => import('./modules/profil/ProfilPage').then(m => ({ default: m.ProfilPage })));
const NotificationsPage = lazy(() => import('./modules/home/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ErrorPage = lazy(() => import('./modules/error/ErrorPage').then(m => ({ default: m.ErrorPage })));
const ChatPage = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })));
const LandingPage = lazy(() => import('./modules/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const InstallGuidePage = lazy(() => import('./modules/landing/InstallGuidePage').then(m => ({ default: m.InstallGuidePage })));
const BiographiePage = lazy(() => import('./pages/BiographiePage').then(m => ({ default: m.BiographiePage })));
const ServicePage = lazy(() => import('./modules/service/ServicePage').then(m => ({ default: m.ServicePage })));
const FormationPage = lazy(() => import('./modules/formation/FormationPage').then(m => ({ default: m.FormationPage })));
const FormationCreate = lazy(() => import('./modules/formation/FormationCreate').then(m => ({ default: m.FormationCreate })));
const FormationEdit = lazy(() => import('./modules/formation/FormationEdit').then(m => ({ default: m.FormationEdit })));
const FormationDetail = lazy(() => import('./modules/formation/FormationDetail').then(m => ({ default: m.FormationDetail })));
const ParametresPage = lazy(() => import('./modules/home/ParametresPage').then(m => ({ default: m.ParametresPage })));
const TransferPage = lazy(() => import('./modules/profil/TransferPage').then(m => ({ default: m.TransferPage })));
const NewTransferPage = lazy(() => import('./modules/profil/NewTransferPage').then(m => ({ default: m.NewTransferPage })));
const TransferApprovalPage = lazy(() => import('./modules/admin/TransferApprovalPage').then(m => ({ default: m.TransferApprovalPage })));
const PublicationsApprovalPage = lazy(() => import('./modules/admin/PublicationsApprovalPage').then(m => ({ default: m.PublicationsApprovalPage })));
const VerifyTransferPage = lazy(() => import('./modules/public/VerifyTransferPage').then(m => ({ default: m.VerifyTransferPage })));
const ScanQRPage = lazy(() => import('./modules/scan/ScanQRPage').then(m => ({ default: m.ScanQRPage })));
const CalendarPage = lazy(() => import('./modules/calendrier/CalendarPage').then(m => ({ default: m.CalendarPage })));
const ReportListPage = lazy(() => import('./modules/rapports/ReportListPage').then(m => ({ default: m.ReportListPage })));
const ReportFormPage = lazy(() => import('./modules/rapports/ReportFormPage').then(m => ({ default: m.ReportFormPage })));
const ReportViewPage = lazy(() => import('./modules/rapports/ReportViewPage').then(m => ({ default: m.ReportViewPage })));
const ReportAggregatedPage = lazy(() => import('./modules/rapports/ReportAggregatedPage').then(m => ({ default: m.ReportAggregatedPage })));
const RoleGuard = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { user, role, isLoading } = useAuth();
  const navigate = useNavigate();

  // On transforme le tableau en string pour éviter que la référence de l'objet déclenche le useEffect en boucle
  const rolesString = allowedRoles.join(',');

  useEffect(() => {
    if (isLoading) return;
    const rolesArray = rolesString.split(',');
    
    if (!user) {
      navigate('/auth', { replace: true });
    } else if (role && !rolesArray.includes(role)) {
      navigate('/unauthorized', { replace: true });
    }
  }, [user, role, isLoading, rolesString, navigate]);

  if (isLoading || !user) return <PageLoader />;
  if (role && allowedRoles.includes(role)) return <>{children}</>;
  return null;
};

const ProfileGuard = ({ children }: { children: React.ReactNode }) => {
  const { profileAccess, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (profileAccess?.kind === 'unauthenticated' || !user) {
      navigate('/auth', { replace: true });
    } else if (profileAccess?.kind === 'incomplete') {
      navigate('/complete-profile', { replace: true });
    }
  }, [profileAccess, isLoading, user, navigate]);

  if (isLoading || !profileAccess || profileAccess.kind !== 'complete') return <PageLoader />;
  return <>{children}</>;
};

function App() {
  return (
    <NotificationProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<Login />} />
                  <Route path="/update-password" element={<UpdatePasswordPage />} />
                  <Route path="/complete-profile" element={<CompleteProfilePage />} />
                  <Route path="/install-guide" element={<InstallGuidePage />} />
                  <Route path="/notifications" element={<ProfileGuard><NotificationsPage /></ProfileGuard>} />
                  <Route path="/biographie" element={<BiographiePage />} />
                  <Route path="/verify-transfer/:token" element={<VerifyTransferPage />} />
                  <Route path="/scan" element={<ScanQRPage />} />
                  {/* Protected routes */}
                  <Route path="/home" element={<ProfileGuard><Home /></ProfileGuard>} />
                  <Route path="/souhaits" element={<ProfileGuard><SouhaitsPage /></ProfileGuard>} />
                  <Route path="/admin" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin']}><AdminPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/admin/dashboard" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin']}><DashboardPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/admin/structures" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin']}><StructuresPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/admin/nomination" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin']}><NominationPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/cordon" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin', 'coordonateur']}><CordonPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/cordon/forum" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin', 'coordonateur']}><CoordinatorForumPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/publier" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin', 'coordonateur']}><CreatePostPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/pub/:id" element={<ProfileGuard><PostDetailsPage /></ProfileGuard>} />
                  <Route path="/communaute" element={<ProfileGuard><CommunityPage /></ProfileGuard>} />
                  <Route path="/profil" element={<ProfileGuard><ProfilPage /></ProfileGuard>} />
                  <Route path="/profil/:id" element={<ProfileGuard><ProfilPage /></ProfileGuard>} />
                  <Route path="/profil/transfert" element={<ProfileGuard><TransferPage /></ProfileGuard>} />
                  <Route path="/profil/transfert/nouveau" element={<ProfileGuard><NewTransferPage /></ProfileGuard>} />
                  <Route path="/admin/transferts" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin', 'coordonateur']}><TransferApprovalPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/admin/publications" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin']}><PublicationsApprovalPage /></RoleGuard></ProfileGuard>} />
                  {/* New features */}
                  <Route path="/chat" element={<ProfileGuard><ChatPage /></ProfileGuard>} />
                  <Route path="/service" element={<ProfileGuard><ServicePage /></ProfileGuard>} />
                  <Route path="/formation" element={<ProfileGuard><FormationPage /></ProfileGuard>} />
                  <Route path="/formation/creer" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin']}><FormationCreate /></RoleGuard></ProfileGuard>} />
                  <Route path="/formation/modifier/:id" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin']}><FormationEdit /></RoleGuard></ProfileGuard>} />
                  <Route path="/formation/:id" element={<ProfileGuard><FormationDetail /></ProfileGuard>} />
                  <Route path="/parametres" element={<ProfileGuard><ParametresPage /></ProfileGuard>} />
                  <Route path="/calendrier" element={<ProfileGuard><CalendarPage /></ProfileGuard>} />
                  <Route path="/rapports" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin', 'coordonateur']}><ReportListPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/rapports/nouveau" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin', 'coordonateur']}><ReportFormPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/rapports/modifier/:id" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin', 'coordonateur']}><ReportFormPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/rapports/voir/:id" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin', 'coordonateur']}><ReportViewPage /></RoleGuard></ProfileGuard>} />
                  <Route path="/rapports/agrege" element={<ProfileGuard><RoleGuard allowedRoles={['admin', 'superadmin', 'coordonateur']}><ReportAggregatedPage /></RoleGuard></ProfileGuard>} />

                  {/* Redirects & error handling */}
                  <Route path="/login" element={<Navigate to="/auth" replace />} />
                  <Route path="/unauthorized" element={<ErrorPage type="unauthorized" />} />
                  <Route path="*" element={<ErrorPage type="404" />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </NotificationProvider>
  );
}

export default App;
