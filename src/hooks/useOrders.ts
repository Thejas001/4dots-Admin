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
      const response = await api.get<OrderResponse>('/order/orders?pageNumber=1&pageSize=10');
      console.log('Raw API Response:', JSON.stringify(response, null, 2));
      console.log('API Response Data:', JSON.stringify(response.data, null, 2));

      if (response.data.Success) {
        const ordersWithDefaults = response.data.Data.map(order => ({
          ...order,
          Comments: order.Comments || [], // Default to empty array if Comments is missing
        }));
        console.log('Orders data:', JSON.stringify(ordersWithDefaults, null, 2));
        console.log('First order:', JSON.stringify(ordersWithDefaults[0], null, 2));
        console.log('First order UserAddress:', JSON.stringify(ordersWithDefaults[0]?.UserAddress, null, 2));
        
        // Log each order's ID and UserAddress
        ordersWithDefaults.forEach(order => {
          console.log(`Order ${order.OrderId} UserAddress:`, JSON.stringify(order.UserAddress, null, 2));
        });

        setOrders(ordersWithDefaults);
      } else {
        console.error('API returned error:', response.data);
        setError('Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
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