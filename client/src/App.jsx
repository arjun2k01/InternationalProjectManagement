import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout & Protected Route
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import useAuthStore from './store/authStore';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const authStore = useAuthStore();
  const { isAuthenticated, isLoading, loadUser } = authStore;

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Toaster position="top-right" />
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Content...</div>}>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to="/projects" replace /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/projects" replace /> : <LoginPage />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/projects" replace /> : <RegisterPage />} 
          />

          {/* Protected Routes inside Layout */}
          <Route
            element={
              <ProtectedRoute authStore={authStore}>
                <Layout authStore={authStore} />
              </ProtectedRoute>
            }
          >
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
