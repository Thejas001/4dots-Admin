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
      let url = `/api/order/summary?pageNumber=${pageNum}&pageSize=${pageSz}`;
      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      const response = await api.get<OrderResponse>(url);
      if (response.data.Success) {
        // Normalize API summary items to the internal Order shape.
        // Some endpoints (summary) return PaymentMethod at the root level
        // instead of a nested Payment object. Map those into `Payment` so
        // UI that uses `order.Payment?.PaymentMethod` continues to work.
        const normalized = (response.data.Data as any[]).map((raw) => {
          // If Payment already exists, keep it. Otherwise, build from top-level fields.
          const payment = raw.Payment
            ? raw.Payment
            : raw.PaymentMethod
            ? {
                OrderPaymentId: raw.OrderPaymentId ?? 0,
                OrderId: raw.OrderId ?? raw.OrderId ?? 0,
                PaymentMethod: raw.PaymentMethod,
                PaymentStatus: raw.PaymentStatus ?? '',
                PaymentDate: raw.PaymentDate ?? '',
              }
            : null;

          return {
            ...raw,
            Payment: payment,
          } as unknown as Order;
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
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders(pageNumber, pageSize, status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, pageNumber, pageSize, status]);

  return { orders, loading, error, pagination, refetch: fetchOrders };
};