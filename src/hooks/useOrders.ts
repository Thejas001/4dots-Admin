import { useState, useEffect } from 'react';
import { Order, OrderResponse } from '@/types/order';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  pagination: {
    TotalCount: number;
    PageNumber: number;
    PageSize: number;
    TotalPages: number;
    HasPreviousPage: boolean;
    HasNextPage: boolean;
  };
  refetch: (pageNumber?: number, pageSize?: number, status?: string) => Promise<void>;
}

export const useOrders = (pageNumber: number = 1, pageSize: number = 10, status?: string): UseOrdersReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    TotalCount: 0,
    PageNumber: 1,
    PageSize: 10,
    TotalPages: 1,
    HasPreviousPage: false,
    HasNextPage: false,
  });
  const { isAuthenticated } = useAuth();

  const fetchOrders = async (pageNum = pageNumber, pageSz = pageSize, statusFilter = status) => {
    if (!isAuthenticated) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let url = `/order/orders?pageNumber=${pageNum}&pageSize=${pageSz}`;
      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      const response = await api.get<OrderResponse>(url);
      if (response.data.Success) {
        setOrders(response.data.Data);
        setPagination({
          TotalCount: response.data.TotalCount,
          PageNumber: response.data.PageNumber,
          PageSize: response.data.PageSize,
          TotalPages: response.data.TotalPages,
          HasPreviousPage: response.data.HasPreviousPage,
          HasNextPage: response.data.HasNextPage,
        });
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err) {
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders(pageNumber, pageSize, status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, pageNumber, pageSize, status]);

  return { orders, loading, error, pagination, refetch: fetchOrders };
};