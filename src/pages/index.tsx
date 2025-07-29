import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/orders');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return null;
  }

  return null; // This page will redirect immediately
} 