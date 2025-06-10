import { useState, useEffect } from 'react';
import { Order, OrderResponse } from '@/types/order';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useOrders = (): UseOrdersReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchOrders = async () => {
    if (!isAuthenticated) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching orders...');
      const response = await api.get<OrderResponse>('/order/user');
      console.log('API Response:', response.data);
      
      if (response.data.Success) {
        console.log('Orders data:', response.data.Data);
        setOrders(response.data.Data);
      } else {
        console.error('API returned error:', response.data);
        setError('Failed to fetch orders');
      }
    } catch (err: unknown) {
      console.error('Error fetching orders:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Failed to fetch orders');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useOrders effect - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  return { orders, loading, error, refetch: fetchOrders };
}; 