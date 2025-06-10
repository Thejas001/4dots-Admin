import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/types/order';
import Header from '@/components/Header';

const OrderDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const { orders, loading, error } = useOrders();
  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const order = orders.find((o) => o.OrderId === Number(id));

  const statusOptions = [
    { value: 0, label: 'Pending' },
    { value: 1, label: 'In Progress' },
    { value: 2, label: 'Shipped' },
    { value: 3, label: 'Cancelled' },
    { value: 4, label: 'Cancelled By Admin' },
    { value: 5, label: 'Shipped' },
    { value: 6, label: 'Delivered' },
    { value: 7, label: 'Cancelled' }
  ];

  const updateOrderStatus = async (newStatus: number) => {
    if (!id) return;
    
    setIsUpdating(true);
    setNotification(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`https://localhost:7049/api/order/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          OrderStatus: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      setNotification({ type: 'success', message: 'Order status updated successfully' });
      setTimeout(() => {
        router.reload();
      }, 1500);
    } catch (err) {
      setNotification({ 
        type: 'error', 
        message: err instanceof Error ? err.message : 'Failed to update order status' 
      });
    } finally {
      setIsUpdating(false);
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
        return 'bg-blue-100 text-blue-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
      case 'CancelledByAdmin':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (contentType: string) => {
    switch (contentType) {
      case 'application/pdf':
        return '📄';
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '📝';
      case 'image/jpeg':
      case 'image/png':
        return '🖼️';
      default:
        return '📎';
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
            <p className="text-xl font-semibold">Error loading order</p>
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-800">Order not found</p>
            <button
              onClick={() => router.push('/orders')}
              className="mt-4 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Back Button and Title */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/orders')}
              className="flex items-center text-black hover:text-gray-700 transition-colors text-lg"
            >
              <svg
                className="w-6 h-6 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Orders
            </button>
            <h1 className="text-4xl font-bold text-black">Order #{order.OrderId}</h1>
          </div>

          {notification && (
            <div className={`mb-8 p-4 rounded-lg text-lg ${
              notification.type === 'success' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {notification.message}
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Order Status and Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Order Status Card */}
              <div className="bg-white rounded-xl shadow-md p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-black">Order Status</h2>
                  <select
                    className={`px-6 py-3 rounded-lg text-lg font-semibold ${getStatusStyle(order.OrderStatus)} border-0 focus:ring-2 focus:ring-black min-w-[200px]`}
                    value={order.OrderStatus}
                    onChange={(e) => updateOrderStatus(Number(e.target.value))}
                    disabled={isUpdating}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-600 text-lg mb-2">Order Date</p>
                    <p className="text-black text-xl font-semibold">{formatDate(order.CreatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-lg mb-2">Total Amount</p>
                    <p className="text-black text-xl font-semibold">₹{order.TotalAmount}</p>
                  </div>
                </div>
              </div>

              {/* Order Items Card */}
              <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-black mb-6">Order Items</h2>
                <div className="space-y-6">
                  {order.Items.map((item, index) => (
                    <div key={index} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-black mb-2">{item.ProductName}</h3>
                          <p className="text-gray-600 text-lg">Quantity: {item.Quantity}</p>
                          <p className="text-gray-600 text-lg">Price: ₹{item.Price}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-black text-xl font-semibold">
                            Total: ₹{item.Quantity * item.Price}
                          </p>
                        </div>
                      </div>

                      {/* Documents Section */}
                      {item.Documents && item.Documents.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-bold text-lg mb-3 text-black">Documents</h4>
                          <div className="space-y-3">
                            {item.Documents.map((doc, docIndex) => (
                              <div key={docIndex} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <span className="text-gray-800 text-lg">{doc.FileName}</span>
                                </div>
                                <a
                                  href={doc.DocumentUrl}
                                  download={doc.FileName}
                                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
                                >
                                  Download
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Payment and Shipping Info */}
            <div className="space-y-8">
              {/* Payment Information Card */}
              {order.Payment && (
                <div className="bg-white rounded-xl shadow-md p-8">
                  <h2 className="text-2xl font-bold text-black mb-6">Payment Information</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-600 text-lg mb-2">Payment Method</p>
                      <p className="text-black text-xl font-semibold">{order.Payment.PaymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-lg mb-2">Payment Status</p>
                      <p className="text-black text-xl font-semibold">{order.Payment.PaymentStatus}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Information Card */}
              {order.Shipment && (
                <div className="bg-white rounded-xl shadow-md p-8">
                  <h2 className="text-2xl font-bold text-black mb-6">Shipping Information</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-600 text-lg mb-2">Shipping Status</p>
                      <p className="text-black text-xl font-semibold">{order.Shipment.ShippingStatus}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetail; 