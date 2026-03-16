import React, { useEffect } from 'react';
import useAuthStore from '../store/authStore';

const useAuth = () => {
  const { user, isAuthenticated, isLoading, error, loadUser, login, register, logout } = useAuthStore();

  useEffect(() => {
    // Only attempt to load the user if we don't know the auth state yet
    // Custom logic can be adjusted depending on how the store initializes
    loadUser();
  }, [loadUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
  };
};

export default useAuth;
