import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/types/order';
import Header from './Header';

const OrderList = () => {
  const router = useRouter();
  const [pageNumber, setPageNumber] = useState(1);
  const { orders, loading, error, pagination, refetch } = useOrders(pageNumber, 10);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewedOrders, setViewedOrders] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Load viewed orders from localStorage
    const storedViewedOrders = localStorage.getItem('viewedOrders');
    if (storedViewedOrders) {
      setViewedOrders(new Set(JSON.parse(storedViewedOrders)));
    }
  }, []);

  useEffect(() => {
    refetch(pageNumber, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber]);

  useEffect(() => {
    console.log('OrderList - Current orders:', orders);
    console.log('OrderList - Loading:', loading);
    console.log('OrderList - Error:', error);
  }, [orders, loading, error]);

  const handleOrderClick = (orderId: number) => {
    // Add order to viewed orders
    const newViewedOrders = new Set(viewedOrders);
    newViewedOrders.add(orderId);
    setViewedOrders(newViewedOrders);
    
    // Save to localStorage
    localStorage.setItem('viewedOrders', JSON.stringify(Array.from(newViewedOrders)));
    
    // Navigate to order details
    router.push(`/orders/${orderId}`);
  };

  const filteredOrders = orders
    .filter((order) => {
      const matchesPayment = paymentFilter === 'all' || order.Payment?.PaymentMethod === paymentFilter;
      const matchesStatus = statusFilter === 'all' || order.OrderStatus === statusFilter;
      return matchesPayment && matchesStatus;
    })
    .sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());

  const isNewOrder = (orderId: number, dateString: string) => {
    // Check if order has been viewed
    if (viewedOrders.has(orderId)) {
      return false;
    }
    
    // Check if order is less than 24 hours old
    const orderDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 1;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'CashOnDelivery':
        return 'Cash on Delivery';
      case 'UPI':
        return 'UPI';
      default:
        return method;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'InProgress':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-orange-100 text-orange-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      case 'Shipped':
        return 'bg-blue-100 text-gray-800';
      case 'CancelledByUser':
        return 'bg-red-200 text-gray-800';
      case 'Completed':
        return 'bg-blue-100 text-gray-800';
      case 'PaymentSuccessful':
        return 'bg-green-200 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-red-500 text-center">
            <p className="text-xl font-semibold">Error loading orders</p>
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
          <h1 className="text-4xl font-bold mb-8 text-black">My Orders</h1>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No orders found</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
        <h1 className="text-4xl font-bold mb-8 text-black">My Orders</h1>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white text-black text-lg"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">All Payment Methods</option>
            <option value="UPI">UPI</option>
            <option value="CashOnDelivery">Cash on Delivery</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white text-black text-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="InProgress">In Progress</option>
            <option value="Shipped">Shipped</option>
            <option value="Failed">Failed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-10 py-6 text-left text-lg font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-10 py-6 text-left text-lg font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-10 py-6 text-left text-lg font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-10 py-6 text-left text-lg font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-10 py-6 text-left text-lg font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-10 py-6 text-left text-lg font-medium text-gray-500 uppercase tracking-wider">Shipping</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr 
                  key={order.OrderId}
                  onClick={() => handleOrderClick(order.OrderId)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-10 py-6 whitespace-nowrap text-base font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      #{order.OrderId}
                      {isNewOrder(order.OrderId, order.CreatedAt) && (
                        <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
                          NEW
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6 whitespace-nowrap text-base text-gray-500">
                    {formatDate(order.CreatedAt)}
                  </td>
                  <td className="px-10 py-6 whitespace-nowrap text-base text-gray-500">
                    ₹{order.TotalAmount}
                  </td>
                  <td className="px-10 py-6 whitespace-nowrap text-base text-gray-500">
                    {order.Payment ? formatPaymentMethod(order.Payment.PaymentMethod) : '-'}
                  </td>
                  <td className="px-10 py-6 whitespace-nowrap">
                    <span className={`px-4 py-2 inline-flex text-base leading-5 font-semibold rounded-full ${getStatusStyle(order.OrderStatus)}`}>
                      {order.OrderStatus}
                    </span>
                  </td>
                  <td className="px-10 py-6 whitespace-nowrap text-base text-gray-500">
                    {order.Shipment ? order.Shipment.ShippingStatus : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-xl">No orders found</p>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex justify-center mt-4 gap-2">
          <button
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber === 1}
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {pagination.PageNumber} of {pagination.TotalPages}</span>
          <button
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            onClick={() => setPageNumber((prev) => Math.min(pagination.TotalPages, prev + 1))}
            disabled={pageNumber === pagination.TotalPages}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
};

export default OrderList; 