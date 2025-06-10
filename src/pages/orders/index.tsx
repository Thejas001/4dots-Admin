import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import OrderList from '@/components/OrderList';

const OrdersPage = () => {
  return (
    <ProtectedRoute>
      <OrderList />
    </ProtectedRoute>
  );
};

export default OrdersPage; 