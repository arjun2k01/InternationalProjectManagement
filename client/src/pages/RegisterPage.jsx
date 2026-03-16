import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage = () => {
  const authStore = useAuthStore();
  const { isAuthenticated } = authStore;

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <RegisterForm authStore={authStore} />
      </div>
    </div>
  );
};

export default RegisterPage;
