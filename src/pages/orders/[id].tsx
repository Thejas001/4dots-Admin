import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Order } from '@/types/order';
import { API_CONFIG, DOWNLOAD_ORDERITEM_ZIP } from '@/config/api';

const OrderDetail = () => {
  const router = useRouter();
  const { id } = router.query;

  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  interface OrderItemSummary {
    ProductName: string;
    Amount: number;
  }

  interface OrderSummary {
    OrderId: number;
    Items: OrderItemSummary[];
    TotalAmount: number;
    OrderStatus: string;
    CreatedAt: string;
    TotalOrders?: number;
  }

  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingData, setShippingData] = useState({
    trackingNumber: '',
    trackingUrl: '',
    courierName: ''
  });
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('current');
  const [previousOrders, setPreviousOrders] = useState<OrderSummary[]>([]);
  const [loadingPreviousOrders, setLoadingPreviousOrders] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: number]: number }>({});
  const [isDownloading, setIsDownloading] = useState<number | null>(null);

  const parseJsonIfPossible = async (response: Response): Promise<any | null> => {
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  };

  interface OrderItemSummary {
    ProductName: string;
    Amount: number;
  }

  interface OrderSummary {
    OrderId: number;
    Items: OrderItemSummary[];
    TotalAmount: number;
    OrderStatus: string;
    CreatedAt: string;
    TotalOrders?: number;
  }

  const fetchPreviousOrders = async (userId: string) => {
    try {
      setLoadingPreviousOrders(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(API_CONFIG.getFullUrl(`/api/order/admin/user/${userId}/summary`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseJsonIfPossible(res);
      if (res.ok && data?.Orders) {
        // Group orders by OrderId and filter out the current order
        const ordersMap = new Map<number, OrderSummary>();
        const currentOrderId = currentOrder?.OrderId;
        
        data.Orders.forEach((order: any) => {
          if (order.OrderId === currentOrderId) return;
          
          if (!ordersMap.has(order.OrderId)) {
            ordersMap.set(order.OrderId, {
              OrderId: order.OrderId,
              Items: [],
              TotalAmount: 0,
              OrderStatus: order.OrderStatus,
              CreatedAt: order.CreatedAt || new Date().toISOString(),
              TotalOrders: data.TotalOrders // Add TotalOrders from the API response
            });
          }
          
          const orderSummary = ordersMap.get(order.OrderId);
          if (orderSummary) {
            orderSummary.Items.push({
              ProductName: order.ProductName,
              Amount: order.Amount
            });
            orderSummary.TotalAmount += order.Amount;
          }
        });
        
        // Convert map values to array and sort by OrderId (newest first)
        const orders = Array.from(ordersMap.values()).sort((a, b) => b.OrderId - a.OrderId);
        console.log('Previous Orders Summary:', orders);
        setPreviousOrders(orders);

      }
    } catch (err) {
      console.error('Error fetching previous orders:', err);
    } finally {
      setLoadingPreviousOrders(false);
    }
  };

  const fetchOrderById = async (orderId: number, silent = false) => {
    try {
      setDetailLoading(!silent);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        if (!silent) setNotification({ type: 'error', message: 'Login required' });
        return;
      }

      const res = await fetch(API_CONFIG.getFullUrl(API_CONFIG.ENDPOINTS.ORDER_DETAILS(orderId)), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseJsonIfPossible(res);
      if (!res.ok) throw new Error(data?.message || 'Failed to fetch order details');
      if (!data?.Success) throw new Error(data?.Message || 'Failed to fetch order details');
      setCurrentOrder(data.Data);
      console.log('Order Details:', data.Data);

    } catch (err: any) {
      if (!silent) setNotification({ type: 'error', message: err.message });
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady || !id) return;

    const oid = Number(id);
    if (isNaN(oid)) {
      setNotification({ type: 'error', message: 'Invalid order ID' });
      setDetailLoading(false);
      return;
    }

    fetchOrderById(oid);
  }, [router.isReady, id]);

  useEffect(() => {
    if (currentOrder?.UserId) {
      fetchPreviousOrders(currentOrder.UserId.toString());
    }
  }, [currentOrder?.UserId]);

  const updateOrderStatus = async (status: number) => {
    if (status === 8) { setShowShippingModal(true); return; }
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(API_CONFIG.getFullUrl(API_CONFIG.ENDPOINTS.ORDER_STATUS(String(id))), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ OrderStatus: status })
      });
      if (!res.ok) throw new Error('Update failed');
      const label = statusOptions.find(o => o.value === status)?.label || 'Unknown';
      setCurrentOrder(prev => prev ? { ...prev, OrderStatus: label } : null);
      setNotification({ type: 'success', message: 'Status updated' });
      fetchOrderById(Number(id), true);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShippingSubmit = async () => {
    if (!shippingData.trackingNumber.trim() || !shippingData.courierName.trim()) {
      setNotification({ type: 'error', message: 'Fill required fields' });
      return;
    }
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(API_CONFIG.getFullUrl(API_CONFIG.ENDPOINTS.ORDER_STATUS(String(id))), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ OrderStatus: 8, ...shippingData })
      });
      if (!res.ok) throw new Error('Shipping failed');
      setCurrentOrder(prev => prev ? { ...prev, OrderStatus: 'Shipped' } : null);
      setNotification({ type: 'success', message: 'Shipped' });
      setShowShippingModal(false);
      fetchOrderById(Number(id), true);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(API_CONFIG.getFullUrl(API_CONFIG.ENDPOINTS.ORDER_COMMENT), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ OrderId: id, CommentText: newComment.trim() })
      });
      if (!res.ok) throw new Error('Comment failed');
      setNotification({ type: 'success', message: 'Comment added' });
      setNewComment('');
      fetchOrderById(Number(id), true);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadItemZip = async (itemId: number, name: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      setIsDownloading(itemId);
      setDownloadProgress(prev => ({ ...prev, [itemId]: 0 }));
      
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', API_CONFIG.getFullUrl(DOWNLOAD_ORDERITEM_ZIP(itemId)));
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Accept', 'application/zip, application/octet-stream');
        xhr.responseType = 'blob';
        
        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setDownloadProgress(prev => ({ ...prev, [itemId]: percentComplete }));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.response, { status: xhr.status }));
          } else {
            reject(new Error('Download failed'));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send();
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-z0-9]/gi, '_')}_${itemId}.zip`;
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      // Reset state after a small delay to ensure the download starts
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newState = { ...prev };
          delete newState[itemId];
          return newState;
        });
        setIsDownloading(null);
      }, 1000);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
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
    const map: Record<string, string> = {
      InProgress: 'bg-green-100 text-green-800',
      Pending: 'bg-orange-100 text-orange-800',
      Failed: 'bg-red-100 text-red-800',
      Shipped: 'bg-blue-100 text-blue-800',
      Delivered: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
      CancelledByAdmin: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const getDynamicAttr = (attrs: any[] = [], name: string) =>
    attrs.find((a: any) => a.AttributeName === name)?.AttributeValue;

  const renderContent = () => {
    if (!router.isReady) {
      return <div className="text-center py-20">Loading order...</div>;
    }

    if (!id) {
      return <div className="text-center py-20">Invalid Order ID</div>;
    }

    if (detailLoading) {
      return <div className="text-center py-20">Loading order details...</div>;
    }

    if (notification?.type === 'error' && !currentOrder) {
      return <div className="text-center py-20 text-red-600">{notification.message}</div>;
    }

    if (!currentOrder) {
      return <div className="text-center py-20">Order not found</div>;
    }

    const renderTabs = () => (
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('current')}
            className={`${activeTab === 'current' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Current Order
          </button>
          <button
            onClick={() => setActiveTab('previous')}
            className={`${activeTab === 'previous' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Previous Orders
          </button>
        </nav>
      </div>
    );

    const renderPreviousOrders = () => {
      if (loadingPreviousOrders) {
        return <div className="text-center py-12">Loading previous orders...</div>;
      }

      if (previousOrders.length === 0) {
        return <div className="text-center py-12 text-gray-500">No previous orders found</div>;
      }

      const totalOrderCount = previousOrders.length > 0 ? previousOrders[0].TotalOrders : 0;

      return (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-black mb-4">Previous Orders ({totalOrderCount})</h2>
          {previousOrders.map((order) => (
            <div key={order.OrderId} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Order #{order.OrderId}</h3>
                  <p className="text-gray-600 text-sm">
                    {formatDate(order.CreatedAt)} • {order.OrderStatus}
                  </p>
                </div>
                <div className="mt-3 sm:mt-0 text-right">
                  <p className="text-lg font-bold">₹{order.TotalAmount}</p>
                  <button
                    onClick={() => {
                      setActiveTab('current');
                      router.push(`/orders/${order.OrderId}`);
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Items</h4>
                <ul className="space-y-2">
                  {order.Items?.slice(0, 3).map((item, idx) => {
                    const amount = 'Amount' in item ? (item as any).Amount : 0;
                    return (
                      <li key={idx} className="text-sm text-gray-600 flex justify-between">
                        <span>{item.ProductName}</span>
                        <span className="font-medium">₹{amount}</span>
                      </li>
                    );
                  })}
                  {order.Items?.length > 3 && (
                    <li className="text-sm text-gray-500">+{order.Items.length - 3} more items</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-black hover:text-gray-700 text-base sm:text-lg">
            Back to Orders
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black text-center sm:text-right">
            {activeTab === 'current' ? `Order #${currentOrder.OrderId}` : 'Previous Orders'}
          </h1>
        </div>

        {renderTabs()}

        {notification && (
          <div className={`mb-8 p-4 sm:p-5 rounded-lg text-base sm:text-lg ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {notification.message}
          </div>
        )}

        {activeTab === 'previous' ? (
          <div className="mt-6">
            {renderPreviousOrders()}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
              {/* Status */}
              <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-black">Order Status</h2>
                  <select
                    className={`w-full md:w-auto px-4 py-3 rounded-lg text-base sm:text-lg font-semibold ${getStatusStyle(currentOrder.OrderStatus)} border-0 focus:ring-2 focus:ring-black min-w-[200px]`}
                    value={statusOptions.find(o => o.label === currentOrder.OrderStatus)?.value || 1}
                    onChange={e => updateOrderStatus(Number(e.target.value))}
                    disabled={isUpdating}
                  >
                    {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div><p className="text-gray-600 text-base sm:text-lg mb-2">Order Date</p><p className="text-black text-lg sm:text-xl font-semibold">{formatDate(currentOrder.CreatedAt)}</p></div>
                  <div><p className="text-gray-600 text-base sm:text-lg mb-2">Total Amount</p><p className="text-black text-lg sm:text-xl font-semibold">₹{currentOrder.TotalAmount}</p></div>
                  <div className="bg-gray-50 border-l-8 border-black rounded-r-xl p-5">
                    <p className="text-gray-600 text-sm font-bold uppercase tracking-wider">Delivery Type</p>
                    <p className="text-4xl font-black text-black mt-2">
                      {currentOrder.DeliveryType || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Billing */}
              <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-black mb-6">Billing Address</h2>
                <div className="space-y-4">
                  <div><p className="text-gray-600 text-base sm:text-lg mb-1">Customer Name</p><p className="text-black text-lg sm:text-xl font-semibold">{currentOrder.UserAddress?.Name || '—'}</p></div>
                  <div><p className="text-gray-600 text-base sm:text-lg mb-1">Address</p><p className="text-black text-lg sm:text-xl break-words">{currentOrder.UserAddress?.Address || '—'}</p></div>
                  <div><p className="text-gray-600 text-base sm:text-lg mb-1">City</p><p className="text-black text-lg sm:text-xl">{currentOrder.UserAddress?.City || '—'}</p></div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div><p className="text-gray-600 text-base sm:text-lg mb-1">Pincode</p><p className="text-black text-lg sm:text-xl">{currentOrder.UserAddress?.PinCode || '—'}</p></div>
                    <div><p className="text-gray-600 text-base sm:text-lg mb-1">Country</p><p className="text-black text-lg sm:text-xl">{currentOrder.UserAddress?.Country || '—'}</p></div>
                  </div>
                  <div><p className="text-gray-600 text-base sm:text-lg mb-1">Phone Number</p><p className="text-black text-lg sm:text-xl">{currentOrder.UserAddress?.PhoneNumber || currentOrder.PhoneNumber || '—'}</p></div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-black mb-6">Order Items</h2>
                <div className="space-y-6">
                  {(currentOrder?.Items ?? []).map((item, index) => {
                    const calculatedPriceStr = item.DynamicAttributes?.find(
                      (d: any) => d.AttributeName === 'CalculatedTotalPrice'
                    )?.AttributeValue;
                    const calculatedPrice = calculatedPriceStr ? parseFloat(calculatedPriceStr) : 0;

                    const comment = getDynamicAttr(item.DynamicAttributes, 'ProductComment') || getDynamicAttr(item.DynamicAttributes, 'Comment');
                    const width = getDynamicAttr(item.DynamicAttributes, 'Width') || getDynamicAttr(item.DynamicAttributes, 'CanvasWidth');
                    const height = getDynamicAttr(item.DynamicAttributes, 'Height') || getDynamicAttr(item.DynamicAttributes, 'CanvasHeight');
                    const colorRange = getDynamicAttr(item.DynamicAttributes, 'ColorPrintRange');
                    const pageCount = getDynamicAttr(item.DynamicAttributes, 'PageCount');
                    const colorPages = getDynamicAttr(item.DynamicAttributes, 'TotalColorPageCount');
                    const bwPages = getDynamicAttr(item.DynamicAttributes, 'TotalBwPageCount');
                    const copies = getDynamicAttr(item.DynamicAttributes, 'NumberOfCopies');
                    const numberOfCards = getDynamicAttr(item.DynamicAttributes, 'NumberOfCards');
                    const posterBundleQuantity = getDynamicAttr(item.DynamicAttributes, 'PosterBundleQuantity');
                    const dynamicQuantity = getDynamicAttr(item.DynamicAttributes, 'Quantity');
                    const acrylicClockCount = getDynamicAttr(item.DynamicAttributes, 'TotalAcrylicWallClockCount');
                    const templateName = getDynamicAttr(item.DynamicAttributes, 'TemplateName');
                    const squareFeet = getDynamicAttr(item.DynamicAttributes, 'SquareFeet');


                    const basePrice = item.IsCustomProduct ? (item.CustomBasePrice ?? item.Price ?? 0) : (item.Price ?? 0);
                    const actualQuantity = acrylicClockCount || dynamicQuantity || posterBundleQuantity || (item.Quantity ?? 1);
                    // For acrylic wall clocks, the backend Price is already the total price, so don't multiply by quantity
                    const baseTotal = acrylicClockCount ? basePrice : (basePrice * actualQuantity);
                    const addonsTotal = (item.Addons ?? []).reduce((s: number, a: any) => s + ((a.AddonPrice ?? 0) * (a.NumberOfBooks ?? 1)), 0);
                    const fallbackTotal = baseTotal + addonsTotal;
                    const finalPrice = calculatedPrice > 0 ? calculatedPrice : fallbackTotal;

                    // For acrylic wall clocks, the backend Price is actually the total price, so calculate actual unit price
                    const displayUnitPrice = acrylicClockCount ? (basePrice / actualQuantity) : basePrice;

                    return (
                      <div key={index} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start mb-4">
                          <div className="space-y-3 flex-1">
                            <h3 className="text-lg sm:text-xl font-bold text-black">
                              {item.IsCustomProduct ? (item.CustomProductName || item.ProductName) : item.ProductName}
                            </h3>

                            <div className="flex flex-wrap gap-4 text-base">
                              <span className="text-gray-600">Qty: <strong>{acrylicClockCount || dynamicQuantity || posterBundleQuantity || item.Quantity}</strong></span>
                              <span className="text-gray-600">Unit Price: <strong>₹{displayUnitPrice.toFixed(2)}</strong></span>
                              {templateName && <span className="text-gray-600">Template: <strong>{templateName}</strong></span>}
                            </div>

                            {comment && (
                              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                <p className="font-semibold text-yellow-800 text-sm">Special Instructions</p>
                                <p className="text-yellow-900 text-sm whitespace-pre-wrap">{comment}</p>
                              </div>
                            )}

                            {(width || height) && (
                              <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg mt-2">
                                <p className="font-semibold text-purple-800 text-sm">Canvas Dimensions</p>
                                <p className="text-purple-900 text-sm">{width || '-'} x {height || '-'}</p>
                              </div>
                            )}

                            {item.Attributes?.length > 0 && (
                              <div className="text-sm space-y-1">
                                {item.Attributes.filter((a: any) => a.AttributeName !== 'PosterQuantity').map((a: any, i: number) => (
                                  <div key={i} className="flex justify-between">
                                    <span className="text-gray-600">{a.AttributeName}:</span>
                                    <span className="font-medium">{a.AttributeValue}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {posterBundleQuantity && (
                              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                <p className="font-semibold text-blue-800 text-sm">Bundle Quantity Information</p>
                                <p className="text-blue-900 text-sm">This product is sold in bundles - 1 bundle equals 1000 units. Customer ordered {posterBundleQuantity} bundle(s) totaling {posterBundleQuantity * 1000} units.</p>
                              </div>
                            )}

                            {(item.Addons ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {(item.Addons ?? []).map((a: any, i: number) => (
                                  <span key={i} className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-medium">
                                    {a?.AddonName}
                                    {a?.NumberOfBooks > 1 && <span>{a.NumberOfBooks} books</span>}
                                  </span>
                                ))}
                              </div>
                            )}

                            {(colorRange || pageCount || colorPages || bwPages || copies || numberOfCards || squareFeet) && (
                              <div className="flex flex-wrap gap-3 text-sm mt-2">
                                {colorRange && <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full font-medium">Color: {colorRange}</span>}
                                {squareFeet && <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">Size: {squareFeet} Sq.Ft</span>}
                                {pageCount && <span className="text-gray-700"><strong>Total Pages:</strong> {pageCount}</span>}
                                {colorPages && <span className="text-teal-700"><strong>Color Pages:</strong> {colorPages}</span>}
                                {bwPages && <span className="text-gray-700"><strong>B&W Pages:</strong> {bwPages}</span>}
                                {copies && <span className="text-gray-700"><strong>Copies:</strong> {copies}</span>}
                                {numberOfCards && <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">Number of Cards: {numberOfCards}</span>}
                              </div>
                            )}

                            {/* Other Dynamic Attributes */}
                            <div className="text-sm space-y-1 mt-2">
                              {item.DynamicAttributes?.filter((a: any) => 
                                !['ProductComment', 'Comment', 'ColorPrintRange', 'PageCount', 'TotalColorPageCount', 
                                  'TotalBwPageCount', 'NumberOfCopies', 'NumberOfCards', 'PosterBundleQuantity', 
                                  'Quantity', 'TotalAcrylicWallClockCount', 'TemplateName', 'SquareFeet', 
                                  'CalculatedTotalPrice', 'Width', 'Height', 'CanvasWidth', 'CanvasHeight'].includes(a.AttributeName)
                              ).map((a: any, i: number) => (
                                <div key={i} className="flex justify-between border-b border-gray-50 py-1">
                                  <span className="text-gray-600">{a.AttributeName}:</span>
                                  <span className="font-medium">{a.AttributeValue}</span>
                                </div>
                              ))}
                            </div>

                          </div>

                          <div className="text-right space-y-1">
                            <p className="text-2xl font-bold text-emerald-700">
                              ₹{finalPrice.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">Calculated by system</p>

                            <div className="mt-3">
                              <button
                                onClick={() => handleDownloadItemZip(item.OrderItemId, item.IsCustomProduct ? (item.CustomProductName || item.ProductName) : item.ProductName)}
                                disabled={isDownloading === item.OrderItemId}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed"
                              >
                                {isDownloading === item.OrderItemId ? 'Downloading...' : 'Download ZIP'}
                              </button>
                              {isDownloading === item.OrderItemId && (
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                  <div 
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${downloadProgress[item.OrderItemId] || 0}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {item.Documents?.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-bold text-base mb-3">Documents</h4>
                            <div className="space-y-3">
                              {item.Documents.map((doc: any, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                  <span className="text-sm font-medium text-gray-800 truncate max-w-xs">{doc.FileName}</span>
                                  <a href={doc.DocumentUrl} download={doc.FileName} className="text-sm text-blue-600 hover:underline">Download</a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment */}
              <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-black mb-6">Payment Information</h2>
                <div className="space-y-4">
                  <div><p className="text-gray-600 text-base sm:text-lg mb-1">Payment Method</p><p className="text-black text-lg sm:text-xl">{currentOrder.Payment?.PaymentMethod || '—'}</p></div>
                  <div><p className="text-gray-600 text-base sm:text-lg mb-1">Payment Status</p><p className="text-black text-lg sm:text-xl">{currentOrder.Payment?.PaymentStatus || '—'}</p></div>
                </div>
              </div>

              {/* Comments */}
              <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-black mb-6">Comments</h2>
                <div className="space-y-6">
                  {(currentOrder?.Comments ?? []).map((c: any, i: number) => (
                    <div key={i} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                      <p className="text-black text-base sm:text-lg">{c.Text ?? c.CommentText}</p>
                    </div>
                  ))}
                  <div className="mt-6">
                    <textarea
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black text-lg"
                      rows={3}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={isUpdating || !newComment.trim()}
                      className="mt-4 w-full sm:w-auto px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 text-base sm:text-lg disabled:opacity-50"
                    >
                      {isUpdating ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1 space-y-6 lg:space-y-8">
              <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-black mb-6">Order Summary</h2>
                <div className="space-y-4">
                  <div className="flex justify-between"><p className="text-gray-600 text-base sm:text-lg">Subtotal</p><p className="text-black text-lg sm:text-xl font-semibold">₹{(currentOrder.TotalAmount - (currentOrder.DeliveryCharge ?? 0)).toFixed(2)}</p></div>
                  <div className="flex justify-between"><p className="text-gray-600 text-base sm:text-lg">Shipping</p><p className="text-black text-lg sm:text-xl font-semibold">{(currentOrder.DeliveryCharge ?? 0) > 0 ? `₹${(currentOrder.DeliveryCharge ?? 0).toFixed(2)}` : 'Free'}</p></div>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between"><p className="text-black text-lg sm:text-xl font-bold">Total</p><p className="text-black text-xl sm:text-2xl font-bold">₹{currentOrder.TotalAmount.toFixed(2)}</p></div>
                  </div>
                </div>
              </div>

              {currentOrder.Shipment && (
                <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-black mb-6">Shipment</h2>
                  <div className="space-y-4">
                    <div><p className="text-gray-600 text-base sm:text-lg mb-1">Status</p><p className="text-black text-lg sm:text-xl font-semibold">{currentOrder.OrderStatus}</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderContent()}

      {/* Shipping Modal */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-black mb-6">Shipping Information</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Tracking Number *" value={shippingData.trackingNumber} onChange={e => setShippingData(p => ({ ...p, trackingNumber: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black text-lg" />
              <input type="url" placeholder="Tracking URL" value={shippingData.trackingUrl} onChange={e => setShippingData(p => ({ ...p, trackingUrl: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg text-lg" />
              <input type="text" placeholder="Courier Name *" value={shippingData.courierName} onChange={e => setShippingData(p => ({ ...p, courierName: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black text-lg" />
            </div>
            <div className="flex space-x-4 mt-8">
              <button onClick={() => setShowShippingModal(false)} className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-lg font-semibold" disabled={isUpdating}>Cancel</button>
              <button onClick={handleShippingSubmit} className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 text-lg font-semibold disabled:opacity-50" disabled={isUpdating || !shippingData.trackingNumber.trim() || !shippingData.courierName.trim()}>
                {isUpdating ? 'Updating...' : 'Ship Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderDetail;