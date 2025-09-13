import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/router';
import { useOrders } from '@/hooks/useOrders';
import { Order, Comment } from '@/types/order';
import Header from '@/components/Header';

const OrderDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const { orders, loading, error, refetch } = useOrders();
  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [trackingIdInput, setTrackingIdInput] = useState('');
const [isUpdatingTrackingId, setIsUpdatingTrackingId] = useState(false);


  // Update currentOrder when orders or id changes
  useEffect(() => {
    if (orders && id) {
      const foundOrder = orders.find((o) => o.OrderId === Number(id));
      setCurrentOrder(foundOrder || null);
    }
  }, [orders, id]);

  useEffect(() => {
    console.log('Updated orders after refetch:', orders);
    console.log('Rebound currentOrder:', currentOrder);
  }, [orders, currentOrder]);

  useEffect(() => {
    console.log('Current ID from router:', id);
    console.log('All Orders:', JSON.stringify(orders, null, 2));
    console.log('Current Order:', JSON.stringify(currentOrder, null, 2));
  }, [id, orders, currentOrder]);

  // Debug log for UserAddress
  useEffect(() => {
    console.log('UserAddress:', JSON.stringify(currentOrder?.UserAddress, null, 2));
  }, [currentOrder]);
  
  
  // Debug logs
  useEffect(() => {
    console.log('Current ID from router:', id);
    console.log('All Orders:', orders);
    console.log('Current Order:', currentOrder);
  }, [id, orders, currentOrder]);

  // Debug logs for dropdown rendering
  useEffect(() => {
    console.log('Dropdown Status Value:', currentOrder?.UserAddress);

  }, [currentOrder]);


  const updateOrderStatus = async (newStatus: number) => {
    if (!id) return;
    
    setIsUpdating(true);
    setNotification(null);
  
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No authentication token found');
  
      const requestBody = { OrderStatus: newStatus };
  
      const response = await fetch(`https://fourdotsapp-prod.azurewebsites.net/api/order/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
  
      const responseData = await response.json();
      console.log('Response Data:', responseData);
  
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to update order status');
      }
  
      setNotification({ type: 'success', message: 'Order status updated successfully' });
  
      // Refetch full orders list
      await refetch();
      // The useEffect watching orders + id will update currentOrder
  
    } catch (err) {
      console.error('Error updating order status:', err);
      setNotification({ 
        type: 'error', 
        message: err instanceof Error ? err.message : 'Failed to update order status' 
      });
    } finally {
      setIsUpdating(false);
    }
  };


  const getStatusValueFromLabel = (label: string): number => {
    const found = statusOptions.find(option => option.label === label);
    return found ? found.value : 1;  // default to 1 (Pending) if not found
  };
  
  
  

  const renderContent = () => {
    if (!id) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-800">Invalid Order ID</p>
            <button
              onClick={() => router.push('/orders')}
              className="mt-4 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
            >
              Back to Orders
            </button>
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading order details...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <p className="text-xl font-semibold text-red-600">Error loading order</p>
            <p className="mt-2 text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/orders')}
              className="mt-4 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
            >
              Back to Orders
            </button>
          </div>
        </div>
      );
    }

    if (!currentOrder) {
      return (
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
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <h1 className="text-4xl font-bold text-black">Order #{currentOrder?.OrderId}</h1>
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
                    className={`px-6 py-3 rounded-lg text-lg font-semibold ${getStatusStyle(currentOrder?.OrderStatus || '')} border-0 focus:ring-2 focus:ring-black min-w-[200px]`}
                    value={getStatusValueFromLabel(currentOrder?.OrderStatus || '')}
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
                  <p className="text-black text-xl font-semibold">{formatDate(currentOrder?.CreatedAt || '')}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-lg mb-2">Total Amount</p>
                  <p className="text-black text-xl font-semibold">₹{currentOrder?.TotalAmount}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-lg mb-2">Delivery Type</p>
                  <p className="text-black text-xl font-semibold">{currentOrder?.DeliveryType || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Shipping Address Card 
            {(() => {
              console.log('Rendering shipping address:', currentOrder.UserAddress);
              return currentOrder.UserAddress && (
                <div className="bg-white rounded-xl shadow-md p-8">
                  <h2 className="text-2xl font-bold text-black mb-6">Shipping Address</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-600 text-lg mb-1">Address</p>
                      <p className="text-black text-xl">{currentOrder.UserAddress.Address}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-lg mb-1">City</p>
                      <p className="text-black text-xl">{currentOrder.UserAddress.City}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-600 text-lg mb-1">Pincode</p>
                        <p className="text-black text-xl">{currentOrder.UserAddress.PinCode}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-lg mb-1">Country</p>
                        <p className="text-black text-xl">{currentOrder.UserAddress.Country}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}*/}

            {/* Billing Address Card */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Billing Address</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 text-lg mb-1">Customer Name</p>
                  <p className="text-black text-xl font-semibold">{currentOrder?.UserName || 'No name available'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-lg mb-1">Address</p>
                        <p className="text-black text-xl break-words whitespace-normal">
                          {currentOrder?.UserAddress?.Address || 'No address available'}
                        </p>
                </div>
                <div>
                  <p className="text-gray-600 text-lg mb-1">City</p>
                  <p className="text-black text-xl">{currentOrder?.UserAddress?.City || 'No city available'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-lg mb-1">Pincode</p>
                    <p className="text-black text-xl">{currentOrder?.UserAddress?.PinCode || 'No pincode available'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-lg mb-1">Country</p>
                    <p className="text-black text-xl">{currentOrder?.UserAddress?.Country || 'No country available'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-lg mb-1">Phone Number</p>
                  <p className="text-black text-xl">{currentOrder?.UserAddress?.PhoneNumber || 'No phone number available'}</p>
                </div>
              </div>
            </div>

            {/* Order Items Card */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Order Items</h2>
              <div className="space-y-6">
                {currentOrder.Items.map((item, index) => (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-black mb-2">{item.ProductName}</h3>
                        <p className="text-gray-600 text-lg">Quantity: {item.Quantity}</p>
                        <p className="text-gray-600 text-lg">Price: ₹{item.Price}</p>
                        {/* Attributes */}
                        {item.Attributes && item.Attributes.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold text-black">Details:</p>
                            <ul className="ml-4 list-disc text-gray-700">
                              {item.Attributes.map((attr: any) => (
                                <li key={attr.OrderItemAttributeId || attr.AttributeName}>
                                  {attr.AttributeName}: {attr.AttributeValue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* Addons */}
                        {item.Addons && item.Addons.length > 0 && (
                          <div className="mt-2">
                            <ul className="ml-4 list-disc text-gray-700">
                              {item.Addons.map((addon: any) => (
                                <li key={addon.OrderItemAddonId || addon.AddonName}>
                                  {addon.AddonName}{addon.NumberOfBooks ? `: ${addon.NumberOfBooks} books` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* DynamicAttributes */}
                        {item.DynamicAttributes && item.DynamicAttributes.length > 0 && (
                          <div className="mt-2">
                            <ul className="ml-4 list-disc text-gray-700">
                              {item.DynamicAttributes.map((dyn: any, i: number) => (
                                <li key={dyn.AttributeName + i}>
                                  {dyn.AttributeName}: {dyn.AttributeValue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
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

            {/* Payment Information Card */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Payment Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 text-lg mb-1">Payment Method</p>
                  <p className="text-black text-xl">{currentOrder.Payment?.PaymentMethod || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-lg mb-1">Payment Status</p>
                  <p className="text-black text-xl">{currentOrder.Payment?.PaymentStatus || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-black">Comments</h2>
              <div className="space-y-6">
                {currentOrder.Comments?.map((comment, index) => (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                    <p className="text-black text-lg">{comment.Text ?? (comment as any)['CommentText']}</p>
                  </div>
                ))}
                <div className="mt-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-lg"
                    rows={3}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={isUpdating || !newComment.trim()}
                    className="mt-4 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Order Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-gray-600 text-lg">Subtotal</p>
                  <p className="text-black text-xl font-semibold">₹{currentOrder?.TotalAmount}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-600 text-lg">Shipping</p>
                  <p className="text-black text-xl font-semibold">₹0.00</p>
                </div>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-black text-xl font-bold">Total</p>
                    <p className="text-black text-2xl font-bold">₹{currentOrder?.TotalAmount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Information Card */}
            {currentOrder?.Shipment && (
              <div className="bg-white rounded-xl shadow-md p-8 mt-8">
                <h2 className="text-2xl font-bold text-black mb-6">Order Information</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-600 text-lg mb-1">Order Status</p>
                    <p className="text-black text-xl font-semibold">{currentOrder.OrderStatus}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Input field and button for entering tracking ID 
            <div className="bg-white rounded-xl shadow-md p-8 mt-8">
              <h2 className="text-2xl font-bold text-black mb-6">Shipment Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 text-lg mb-1">Tracking Id</p>
                </div>
                
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Enter tracking ID"
                    className="w-full p-1 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <button
                    className="mt-3 px-3 py-1 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
                  >
                    Update Tracking ID
                  </button>
                </div>

                
              </div>
            </div>*/}

          </div>
        </div>
      </div>
    );
  };

  const statusOptions = [
    { value: 1, label: 'Pending' },
    { value: 3, label: 'PaymentSuccessful' },
    { value: 5, label: 'In Progress' },
    { value: 7, label: 'Cancelled By Admin' }, 
    { value: 8, label: 'Shipped' },
    { value: 9, label: 'Delivered' },
    { value: 11, label: 'Failed' },
    { value: 13, label: 'Completed' },
  ];

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

  // Add debug log for currentOrder changes
  useEffect(() => {
    console.log('currentOrder changed:', currentOrder);
  }, [currentOrder]);

  const handleAddComment = async () => {
  if (!id || !newComment.trim()) return;
  
  setIsUpdating(true);
  setNotification(null);
  
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`https://fourdotsapp-prod.azurewebsites.net/api/order/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        OrderId: id,                      // 👈 send the correct OrderId
        CommentText: newComment.trim()    // 👈 send CommentText as expected
      })
    });

    if (!response.ok) {
      // Get error from server response body if available
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.message || 'Failed to add comment';
      throw new Error(errorMessage);
    }

    setNotification({ type: 'success', message: 'Comment added successfully' });
    setNewComment('');
  } catch (err) {
    setNotification({
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to add comment'
    });
  } finally {
    setIsUpdating(false);
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
        return '';
    }
  };

  return (
    <>
      <Header />
      {renderContent()}
    </>
  );
};

export default OrderDetail; 