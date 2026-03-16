import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import LoginForm from '../components/auth/LoginForm';

const LoginPage = () => {
  const authStore = useAuthStore();
  const { isAuthenticated } = authStore;

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <LoginForm authStore={authStore} />
      </div>
    </div>
  );
};

export default LoginPage;
