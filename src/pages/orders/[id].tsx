import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Order } from '@/types/order';
import { API_CONFIG, DOWNLOAD_ORDERITEM_ZIP } from '@/config/api';

const OrderDetail = () => {
  const router = useRouter();
  const { id } = router.query;

  // Skip React Strict Mode fake first mount
  const isFirstMount = useRef(true);

  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingData, setShippingData] = useState({
    trackingNumber: '', trackingUrl: '', courierName: ''
  });
  const [newComment, setNewComment] = useState('');

  const parseJsonIfPossible = async (response: Response): Promise<any | null> => {
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  };

  const fetchOrderById = async (orderId: number, silent = false) => {
    try {
      setDetailLoading(true);
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
    } catch (err: any) {
      if (!silent) setNotification({ type: 'error', message: err.message });
    } finally {
      setDetailLoading(false);
    }
  };

  // Fixed useEffect: Skip fake Strict Mode mount
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (!id) return;
    const oid = Number(id);
    if (isNaN(oid)) {
      setNotification({ type: 'error', message: 'Invalid order ID' });
      return;
    }
    fetchOrderById(oid);
  }, [id]);

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
      const res = await fetch(API_CONFIG.getFullUrl(DOWNLOAD_ORDERITEM_ZIP(itemId)), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-z0-9]/gi, '_')}_${itemId}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
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

  const renderContent = () => {
    if (!id) return <div className="text-center py-20">Invalid Order ID</div>;
    if (detailLoading) return <div className="text-center py-20">Loading...</div>;
    if (notification?.type === 'error') return <div className="text-center py-20 text-red-600">{notification.message}</div>;
    if (!currentOrder) return <div className="text-center py-20">Order not found</div>;

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-black hover:text-gray-700 text-base sm:text-lg">
            Back to Orders
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black text-center sm:text-right">Order #{currentOrder.OrderId}</h1>
        </div>

        {notification && (
          <div className={`mb-8 p-4 sm:p-5 rounded-lg text-base sm:text-lg ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {notification.message}
          </div>
        )}

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
                <div><p className="text-gray-600 text-base sm:text-lg mb-1">Phone Number</p><p className="text-black text-lg sm:text-xl">{currentOrder.UserAddress?.PhoneNumber || '—'}</p></div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Order Items</h2>
              <div className="space-y-6">
                {(currentOrder?.Items ?? []).map((item, index) => {
                  // Get REAL calculated price from API
                  const calculatedPriceStr = item.DynamicAttributes?.find(
                    (d: any) => d.AttributeName === 'CalculatedTotalPrice'
                  )?.AttributeValue;
                  const calculatedPrice = calculatedPriceStr ? parseFloat(calculatedPriceStr) : 0;

                  // Fallback manual calc (for non-paperprint or debug)
                  const basePrice = item.IsCustomProduct ? (item.CustomBasePrice ?? item.Price ?? 0) : (item.Price ?? 0);
                  const baseTotal = basePrice * (item.Quantity ?? 1);
                  const addonsTotal = (item.Addons ?? []).reduce((s: number, a: any) => s + ((a.AddonPrice ?? 0) * (a.NumberOfBooks ?? 1)), 0);
                  const fallbackTotal = baseTotal + addonsTotal;

                  const finalPrice = calculatedPrice > 0 ? calculatedPrice : fallbackTotal;

                  // Extract details
                  const comment = item.DynamicAttributes?.find((d: any) => d.AttributeName === 'ProductComment')?.AttributeValue;
                  const colorRange = item.DynamicAttributes?.find((d: any) => d.AttributeName === 'ColorPrintRange')?.AttributeValue;
                  const pageCount = item.DynamicAttributes?.find((d: any) => d.AttributeName === 'PageCount')?.AttributeValue;
                  const colorPages = item.DynamicAttributes?.find((d: any) => d.AttributeName === 'TotalColorPageCount')?.AttributeValue;
                  const bwPages = item.DynamicAttributes?.find((d: any) => d.AttributeName === 'TotalBwPageCount')?.AttributeValue;
                  const copies = item.DynamicAttributes?.find((d: any) => d.AttributeName === 'NumberOfCopies')?.AttributeValue;

                  return (
                    <div key={index} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start mb-4">
                        <div className="space-y-3 flex-1">
                          <h3 className="text-lg sm:text-xl font-bold text-black">
                            {item.IsCustomProduct ? (item.CustomProductName || item.ProductName) : item.ProductName}
                          </h3>

                          <div className="flex flex-wrap gap-4 text-base">
                            <span className="text-gray-600">Qty: <strong>{item.Quantity}</strong></span>
                            <span className="text-gray-600">Unit Price: <strong>₹{basePrice.toFixed(2)}</strong></span>
                          </div>

                          {/* Special Comment */}
                          {comment && (
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                              <p className="font-semibold text-yellow-800 text-sm">Special Instructions</p>
                              <p className="text-yellow-900 text-sm">{comment}</p>
                            </div>
                          )}

                          {/* Print Specs */}
                          {item.Attributes?.length > 0 && (
                            <div className="text-sm space-y-1">
                              {item.Attributes.map((a: any, i: number) => (
                                <div key={i} className="flex justify-between">
                                  <span className="text-gray-600">{a.AttributeName}:</span>
                                  <span className="font-medium">{a.AttributeValue}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add-ons */}
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

                          {/* Print Details */}
                          {(colorRange || pageCount || colorPages || bwPages || copies) && (
                            <div className="flex flex-wrap gap-3 text-sm mt-2">
                              {colorRange && <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full font-medium">Color: {colorRange}</span>}
                              {pageCount && <span className="text-gray-700"><strong>Total Pages:</strong> {pageCount}</span>}
                              {colorPages && <span className="text-teal-700"><strong>Color Pages:</strong> {colorPages}</span>}
                              {bwPages && <span className="text-gray-700"><strong>B&W Pages:</strong> {bwPages}</span>}
                              {copies && <span className="text-gray-700"><strong>Copies:</strong> {copies}</span>}
                            </div>
                          )}
                        </div>

                        {/* Price – REAL FROM API */}
                        <div className="text-right space-y-1">
                         
                          <p className="text-2xl font-bold text-emerald-700">
                            ₹{finalPrice.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">Calculated by system</p>

                          <button
                            onClick={() => handleDownloadItemZip(item.OrderItemId, item.IsCustomProduct ? (item.CustomProductName || item.ProductName) : item.ProductName)}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base font-semibold"
                          >
                            Download ZIP
                          </button>
                        </div>
                      </div>

                      {/* Documents */}
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
                <div className="flex justify-between"><p className="text-gray-600 text-base sm:text-lg">Subtotal</p><p className="text-black text-lg sm:text-xl font-semibold">₹{currentOrder.TotalAmount}</p></div>
                <div className="flex justify-between"><p className="text-gray-600 text-base sm:text-lg">Shipping</p><p className="text-black text-lg sm:text-xl font-semibold">₹0.00</p></div>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between"><p className="text-black text-lg sm:text-xl font-bold">Total</p><p className="text-black text-xl sm:text-2xl font-bold">₹{currentOrder.TotalAmount}</p></div>
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