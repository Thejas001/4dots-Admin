import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/types/order';
import Header from './Header';
import { debounce } from 'lodash';

const OrderList = () => {
  const router = useRouter();
  const [pageNumber, setPageNumber] = useState(1);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewedOrders, setViewedOrders] = useState<Set<number>>(new Set());
  const { orders, loading, error, pagination, refetch } = useOrders(pageNumber, 10);
  const initFromQueryDoneRef = useRef(false);

  useEffect(() => {
    const storedViewedOrders = localStorage.getItem('viewedOrders');
    if (storedViewedOrders) {
      setViewedOrders(new Set(JSON.parse(storedViewedOrders)));
    }
  }, []);

  const debouncedRefetch = useRef(
    debounce((page: number, pageSize: number) => {
      refetch(page, pageSize);
    }, 300)
  ).current;

  useEffect(() => {
    if (!router.isReady) return;

    const queryPage = parseInt((router.query.page as string) || '1', 10);
    if (!initFromQueryDoneRef.current) {
      if (queryPage && queryPage !== pageNumber) {
        setPageNumber(queryPage);
      }
      initFromQueryDoneRef.current = true;
    }

    if (queryPage !== pageNumber) {
      router.replace({
        pathname: '/orders',
        query: { page: pageNumber },
      }, undefined, { shallow: true });
    }

    debouncedRefetch(pageNumber, 10);
  }, [router.isReady, pageNumber, router, debouncedRefetch]);

  useEffect(() => {
    console.log('OrderList - Current orders:', orders);
    console.log('OrderList - Loading:', loading);
    console.log('OrderList - Error:', error);
    console.log('OrderList - Pagination:', pagination);
  }, [orders, loading, error, pagination]);

  const handleOrderClick = (order: Order) => {
    const newViewedOrders = new Set(viewedOrders);
    newViewedOrders.add(order.OrderId);
    setViewedOrders(newViewedOrders);
    localStorage.setItem('viewedOrders', JSON.stringify(Array.from(newViewedOrders)));

    router.push({
      pathname: `/orders/${order.OrderId}`,
      query: { page: pageNumber, order: JSON.stringify(order) },
    });
  };

  const filteredOrders = orders
    .filter((order) => {
      const matchesPayment = paymentFilter === 'all' || order.Payment?.PaymentMethod === paymentFilter;
      const matchesStatus = statusFilter === 'all' || order.OrderStatus === statusFilter;
      return matchesPayment && matchesStatus;
    })
    .sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());

  const isNewOrder = (orderId: number, dateString: string) => {
    if (viewedOrders.has(orderId)) {
      return false;
    }
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
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Failed':
        return 'bg-red-100 text-red-700';
      case 'Shipped':
        return 'bg-blue-100 text-blue-700';
      case 'CancelledByUser':
        return 'bg-red-200 text-red-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-700';
      case 'PaymentSuccessful':
        return 'bg-green-200 text-green-800';
      case 'PaymentFailed':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
          <div className="text-center bg-white p-6 rounded-lg shadow-lg">
            <p className="text-2xl font-bold text-red-600">Error Loading Orders</p>
            <p className="text-gray-600 mt-2">{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-blue-50 to-gray-100 min-h-screen">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-6 sm:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
          My Orders
        </h1>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-6 sm:mb-8">
          <select
            className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-base sm:text-lg mb-4 sm:mb-0 shadow-sm transition-all duration-200"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">All Payment Methods</option>
            <option value="UPI">UPI</option>
            <option value="CashOnDelivery">Cash on Delivery</option>
          </select>

          <select
            className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-base sm:text-lg shadow-sm transition-all duration-200"
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

        {/* Table for medium and larger screens */}
        <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 sm:px-6 lg:px-10 py-4 text-left text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-4 sm:px-6 lg:px-10 py-4 text-left text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 sm:px-6 lg:px-10 py-4 text-left text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 sm:px-6 lg:px-10 py-4 text-left text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 sm:px-6 lg:px-10 py-4 text-left text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 lg:px-10 py-4 text-left text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider">
                  Shipping
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr
                  key={order.OrderId}
                  onClick={() => handleOrderClick(order)}
                  className="hover:bg-blue-50 cursor-pointer transition-all duration-200"
                >
                  <td className="px-4 sm:px-6 lg:px-10 py-4 whitespace-nowrap text-sm sm:text-base font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      #{order.OrderId}
                      {isNewOrder(order.OrderId, order.CreatedAt) && (
                        <span className="px-2.5 py-1 text-xs font-bold text-white bg-red-500 rounded-full shadow-sm">
                          NEW
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 lg:px-10 py-4 whitespace-nowrap text-sm sm:text-base text-gray-600">
                    {formatDate(order.CreatedAt)}
                  </td>
                  <td className="px-4 sm:px-6 lg:px-10 py-4 whitespace-nowrap text-sm sm:text-base text-gray-600">
                    ₹{order.TotalAmount}
                  </td>
                  <td className="px-4 sm:px-6 lg:px-10 py-4 whitespace-nowrap text-sm sm:text-base text-gray-600">
                    {order.Payment ? formatPaymentMethod(order.Payment.PaymentMethod) : '-'}
                  </td>
                  <td className="px-4 sm:px-6 lg:px-10 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1.5 inline-flex text-sm sm:text-base font-semibold rounded-full shadow-sm ${getStatusStyle(
                        order.OrderStatus
                      )}`}
                    >
                      {order.OrderStatus}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 lg:px-10 py-4 whitespace-nowrap text-sm sm:text-base text-gray-600">
                    {order.Shipment ? order.Shipment.ShippingStatus : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card layout for small screens */}
        <div className="md:hidden space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.OrderId}
              onClick={() => handleOrderClick(order)}
              className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl cursor-pointer transition-all duration-200"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="font-semibold text-gray-900 text-base">
                  #{order.OrderId}
                </div>
                {isNewOrder(order.OrderId, order.CreatedAt) && (
                  <span className="px-2.5 py-1 text-xs font-bold text-white bg-red-500 rounded-full shadow-sm">
                    NEW
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                <div>
                  <span className="font-semibold">Date:</span> {formatDate(order.CreatedAt)}
                </div>
                <div>
                  <span className="font-semibold">Total:</span> ₹{order.TotalAmount}
                </div>
                <div>
                  <span className="font-semibold">Payment:</span>{' '}
                  {order.Payment ? formatPaymentMethod(order.Payment.PaymentMethod) : '-'}
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  <span
                    className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full shadow-sm ${getStatusStyle(
                      order.OrderStatus
                    )}`}
                  >
                    {order.OrderStatus}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Shipping:</span>{' '}
                  {order.Shipment ? order.Shipment.ShippingStatus : '-'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg sm:text-xl font-medium">No orders found</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-center mt-6 gap-3 sm:gap-4">
          <button
            className="w-full sm:w-auto px-5 py-2.5 bg-black text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:bg-gray-800 transition-all duration-200 text-sm sm:text-base"
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber === 1 || loading}
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm sm:text-base text-gray-700 font-medium">
            Page {pagination.PageNumber} of {pagination.TotalPages}
          </span>
          <button
            className="w-full sm:w-auto px-5 py-2.5 bg-black text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:bg-gray-800 transition-all duration-200 text-sm sm:text-base"
            onClick={() => setPageNumber((prev) => Math.min(pagination.TotalPages, prev + 1))}
            disabled={pageNumber === pagination.TotalPages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
};

export default OrderList;