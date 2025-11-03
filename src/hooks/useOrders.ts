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

  // This ref helps us skip the fake first mount in React Strict Mode
  const isFirstMount = useRef(true);

  const fetchOrders = useCallback(
    async (pageNum = pageNumber, pageSz = pageSize, statusFilter = status) => {
      if (!isAuthenticated) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let url = `/api/order/summary?pageNumber=${pageNum}&pageSize=${pageSz}`;
        if (statusFilter && statusFilter !== 'all') {
          url += `&status=${statusFilter}`;
        }

        // No signal, no cancel — just one clean call
        const response = await api.get<OrderResponse>(url);

        if (response.data.Success) {
          const normalized = (response.data.Data as any[]).map((raw) => {
            const payment = raw.Payment
              ? raw.Payment
              : raw.PaymentMethod
              ? {
                  OrderPaymentId: raw.OrderPaymentId ?? 0,
                  OrderId: raw.OrderId ?? 0,
                  PaymentMethod: raw.PaymentMethod,
                  PaymentStatus: raw.PaymentStatus ?? '',
                  PaymentDate: raw.PaymentDate ?? '',
                }
              : null;

            return { ...raw, Payment: payment } as Order;
          });

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
      } catch (err) {
        setError('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, pageNumber, pageSize, status]
  );

  // Run only on the REAL mount (not Strict Mode fake)
  useEffect(() => {
    // Skip the first fake mount in Strict Mode
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (!isAuthenticated) {
        setLoading(false);
      }
      return;
    }

    // This runs only on the second (real) mount
    if (isAuthenticated) {
      fetchOrders(pageNumber, pageSize, status);
    } else {
      setLoading(false);
    }
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