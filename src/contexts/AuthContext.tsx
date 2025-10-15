import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { AuthState, RegisterLoginRequest, VerifyOTPRequest, AuthResponse } from '@/types/auth';
import { API_CONFIG } from '@/config/api';

interface ErrorResponse {
  message: string;
}

interface AuthContextType extends AuthState {
  sendOTP: (phoneNumber: string) => Promise<void>;
  verifyOTP: (phoneNumber: string, otp: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    phoneNumber: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in localStorage on mount
    const token = localStorage.getItem('auth_token');
    const phoneNumber = localStorage.getItem('phone_number');
    
    console.log('AuthContext - Initial token:', token);
    console.log('AuthContext - Initial phoneNumber:', phoneNumber);
    
    if (token) {
      setAuthState({
        isAuthenticated: true,
        token,
        phoneNumber,
      });
      // Configure axios defaults for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const sendOTP = async (phoneNumber: string) => {
    try {
      const requestData: RegisterLoginRequest = {
        PhoneNumber: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`
      };

      console.log('Sending OTP request:', requestData);
      const response = await axios.post(API_CONFIG.getFullUrl(API_CONFIG.ENDPOINTS.REGISTER_LOGIN), requestData);
      
      setAuthState(prev => ({ ...prev, phoneNumber }));
      localStorage.setItem('phone_number', phoneNumber);
    } catch (error: unknown) {
      console.error('Error sending OTP:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        throw new Error(axiosError.response?.data?.message || 'Failed to send OTP');
      }
      throw error;
    }
  };

  const verifyOTP = async (phoneNumber: string, otp: string) => {
    try {
      const requestData: VerifyOTPRequest = {
        PhoneNumber: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`,
        Otp: otp
      };

      console.log('Verifying OTP request:', requestData);
      const response = await axios.post<AuthResponse>(
        API_CONFIG.getFullUrl(API_CONFIG.ENDPOINTS.VERIFY_OTP),
        requestData
      );

      console.log('OTP verification response:', response.data);
      const token = response.data.token;
      setAuthState({
        isAuthenticated: true,
        token,
        phoneNumber,
      });
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('phone_number', phoneNumber);
      
      // Configure axios defaults for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      router.push('/orders');
    } catch (error: unknown) {
      console.error('Error verifying OTP:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        throw new Error(axiosError.response?.data?.message || 'Failed to verify OTP');
      }
      throw error;
    }
  };

  const logout = () => {
    console.log('Logging out...');
    setAuthState({
      isAuthenticated: false,
      token: null,
      phoneNumber: null,
    });
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('phone_number');
    delete axios.defaults.headers.common['Authorization'];
    
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        sendOTP,
        verifyOTP,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 