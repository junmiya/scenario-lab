import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, useUserRole } from './contexts/AuthContext';
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';
import { LoginPage } from './pages/LoginPage';
import { CatalogPage } from './pages/CatalogPage';
import { EditorPage } from './pages/EditorPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { GroupListPage } from './pages/GroupListPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { SubmissionViewPage } from './pages/SubmissionViewPage';
import { CorrectionPage } from './pages/CorrectionPage';
import { ContestListPage } from './pages/ContestListPage';
import { ContestCreatePage } from './pages/ContestCreatePage';
import { ContestDetailPage } from './pages/ContestDetailPage';
import { ContestEntryPage } from './pages/ContestEntryPage';
import { ReleaseNotesPage } from './pages/ReleaseNotesPage';

function ProtectedRoute({ children }: { children: ReactElement }): ReactElement {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }: { children: ReactElement }): ReactElement {
  const role = useUserRole();

  if (role !== 'system_admin') {
    return <Navigate to="/catalog" replace />;
  }

  return children;
}

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FeatureFlagsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/catalog"
              element={
                <ProtectedRoute>
                  <CatalogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor/:scriptId"
              element={
                <ProtectedRoute>
                  <EditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor"
              element={
                <ProtectedRoute>
                  <EditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminUsersPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <GroupListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <ProtectedRoute>
                  <GroupDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId/submissions/:submissionId"
              element={
                <ProtectedRoute>
                  <SubmissionViewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contests"
              element={
                <ProtectedRoute>
                  <ContestListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contests/new"
              element={
                <ProtectedRoute>
                  <ContestCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contests/:contestId"
              element={
                <ProtectedRoute>
                  <ContestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contests/:contestId/entries/:entryId"
              element={
                <ProtectedRoute>
                  <ContestEntryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId/submissions/:submissionId/corrections"
              element={
                <ProtectedRoute>
                  <CorrectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/release-notes"
              element={
                <ProtectedRoute>
                  <ReleaseNotesPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/catalog" replace />} />
          </Routes>
        </FeatureFlagsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
