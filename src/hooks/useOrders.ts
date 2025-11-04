import { useState, useEffect, useCallback, useRef } from 'react';
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

export const useOrders = (
  pageNumber: number = 1,
  pageSize: number = 10,
  status?: string
): UseOrdersReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const normalizeOrder = useCallback((raw: any): Order => {
    const payment = raw.Payment || (raw.PaymentMethod ? {
      OrderPaymentId: raw.OrderPaymentId ?? 0,
      OrderId: raw.OrderId ?? 0,
      PaymentMethod: raw.PaymentMethod,
      PaymentStatus: raw.PaymentStatus ?? '',
      PaymentDate: raw.PaymentDate ?? '',
    } : null);

    return { ...raw, Payment: payment } as Order;
  }, []);

  const fetchOrders = useCallback(
    async (pageNum: number, pageSz: number, statusFilter?: string) => {
      if (!isAuthenticated) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          pageNumber: pageNum.toString(),
          pageSize: pageSz.toString(),
          ...(statusFilter && statusFilter !== 'all' && { orderStatus: statusFilter })
        });

        const response = await api.get<OrderResponse>(`/api/order/summary?${params.toString()}`, {
          signal: controller.signal as AbortSignal
        } as any);

        if (response.data.Success) {
          const normalized = response.data.Data.map(normalizeOrder);
          setOrders(normalized);
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
      } catch (err: any) {
        // Ignore cancellation errors (request was aborted intentionally)
        const isCancelled = 
          err.name === 'AbortError' || 
          err.name === 'CanceledError' || 
          err.code === 'ERR_CANCELED' ||
          (err.message && err.message.toLowerCase().includes('canceled'));
        
        if (!isCancelled) {
          console.error('Error fetching orders:', err);
          setError('Failed to fetch orders');
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [isAuthenticated, normalizeOrder]
  );

  // Handle initial fetch and parameter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders(pageNumber, pageSize, status);
    } else {
      setLoading(false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [isAuthenticated, pageNumber, pageSize, status, fetchOrders]);

  // Stable refetch function
  const refetch = useCallback(
    (p?: number, s?: number, st?: string) => {
      return fetchOrders(p ?? pageNumber, s ?? pageSize, st ?? status);
    },
    [fetchOrders, pageNumber, pageSize, status]
  );

  return { orders, loading, error, pagination, refetch };
};