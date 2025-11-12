'use client';

import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState, Fragment } from 'react';
import api from '@/lib/axios';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, User, Mail, Phone, ArrowLeft } from 'lucide-react';

/* ────────────────────── Interfaces ────────────────────── */

interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
}

interface CartItemAttribute {
  AttributeName: string;
  AttributeValue: string;
}
interface CartDocument {
  DocumentUrl: string;
  FileName: string;
  ContentType: string;
}
interface CartItem {
  CartItemId: number;
  ProductId: number;
  ProductName: string;
  Quantity: number;
  ItemPrice: number;
  Total: number;
  Documents: CartDocument[];
  Attributes: Array<{ AttributeName: string; AttributeValue: string }>;
  DynamicAttributes: CartItemAttribute[];
  Addons: any[];
  IsCustomProduct: boolean;
  CustomProductName: string | null;
  CustomDescription: string | null;
  CustomBasePrice: number | null;
}
interface User {
  Id: string;
  UserName: string;
  Email: string;
  FirstName: string | null;
  LastName: string | null;
  PhoneNumber: string;
}
interface CartData {
  CartId: number;
  UserId: string;
  TotalPrice: number;
  DeliveryCharge: number;
  Items: any[];
  CreatedAt: string;
  UpdatedAt: string;
  GuestIdentifier: string | null;
  TotalItemsPrice: number;
}
interface CartResponse {
  data: CartData;
  message: string;
  success?: boolean;
}

/* ────────────────────── Component ────────────────────── */
const UserCartPage = () => {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cartSummary, setCartSummary] = useState({
    totalItems: 0,
    totalPrice: 0,
    deliveryCharge: 0,
    totalItemsPrice: 0,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  /* ───── Parse user from query ───── */
  useEffect(() => {
    if (router.isReady && router.query.userData) {
      try {
        const userData = JSON.parse(router.query.userData as string);
        setUser(userData);
      } catch {
        setUser({
          Id: id || '',
          UserName: `User ${id || ''}`,
          Email: '',
          FirstName: null,
          LastName: null,
          PhoneNumber: '',
        });
      }
    }
  }, [router.isReady, router.query, id]);

  /* ───── Fetch cart ───── */
  const confirmDelete = () => {
    if (itemToDelete) {
      handleRemoveItem(itemToDelete);
    }
    setShowDeleteModal(false);
  };

  const handleRemoveClick = (cartItemId: number) => {
    setItemToDelete(cartItemId);
    setShowDeleteModal(true);
  };

  const handleRemoveItem = async (cartItemId: number) => {
    
    try {
      setDeletingId(cartItemId);
      setError('');
      
      console.log('Attempting to remove cart item ID:', cartItemId);
      
      // Add request interceptor for logging
      const requestInterceptor = api.interceptors.request.use(config => {
        console.log('Request config:', config);
        return config;
      });
      
      // Add response interceptor for logging
      const responseInterceptor = api.interceptors.response.use(
        response => {
          console.log('Response:', response);
          return response;
        },
        error => {
          console.error('Error response:', error.response);
          return Promise.reject(error);
        }
      );
      
      try {
        if (!id) {
          throw new Error('User ID is not available');
        }
        
        const url = `/api/cart/admin/remove-item/${cartItemId}?userId=${id}`;
        console.log('Sending DELETE request to:', url);
        
        const response = await api.delete<ApiResponse>(url, {
          validateStatus: (status) => true, // Don't throw for any status code
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            userId: id // Also include in params for good measure
          }
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        
        if (response.status === 200) {
          // Refresh the cart after successful deletion
          await fetchCart();
        } else if (response.status === 400) {
          // Handle 400 Bad Request specifically
          const errorDetails = response.data?.message || 'Invalid request. Please check the item ID and try again.';
          console.error('Bad Request Details:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers
          });
          throw new Error(`Bad Request: ${errorDetails}`);
        } else {
          // Handle other error statuses
          throw new Error(response.data?.message || `Server responded with status: ${response.status}`);
        }
      } finally {
        // Remove the interceptors to prevent memory leaks
        api.interceptors.request.eject(requestInterceptor);
        api.interceptors.response.eject(responseInterceptor);
      }
      
    } catch (error: unknown) {
      console.error('Error removing item:', error);
      
      // Type guard to check if error is an AxiosError
      const isAxiosError = (error: any): error is { response?: { data?: { message?: string } } } => {
        return error && typeof error === 'object' && 'response' in error;
      };
      
      // Type guard for standard Error
      const isError = (error: any): error is Error => {
        return error && typeof error === 'object' && 'message' in error;
      };
      
      let errorMessage = 'Failed to remove item. Please try again.';
      
      if (isAxiosError(error)) {
        errorMessage = error.response?.data?.message || errorMessage;
      } else if (isError(error)) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const fetchCart = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');

      const response = await api.get<CartResponse>('/api/cart/admin', {
        params: { UserId: id }
      });

      const cartData = response.data.data;

      if (cartData && Array.isArray(cartData.Items)) {
        const items: CartItem[] = cartData.Items.map((item: any) => ({
          CartItemId: item.CartItemId,
          ProductId: item.ProductId || 0,
          ProductName: item.IsCustomProduct
            ? item.CustomProductName || 'Custom Product'
            : item.ProductName || 'Unknown Product',
          Quantity: item.Quantity || 1,
          ItemPrice: item.ItemPrice || 0,
          Total: (item.ItemPrice || 0) * (item.Quantity || 1),
          Documents: Array.isArray(item.Documents)
            ? item.Documents.map((doc: any) => ({
                DocumentUrl: doc.DocumentUrl || '',
                FileName: doc.FileName || 'Document',
                ContentType: doc.ContentType || 'image/jpeg',
              }))
            : [],
          Attributes: Array.isArray(item.Attributes) ? item.Attributes : [],
          DynamicAttributes: Array.isArray(item.DynamicAttributes) ? item.DynamicAttributes : [],
          Addons: Array.isArray(item.Addons) ? item.Addons : [],
          IsCustomProduct: Boolean(item.IsCustomProduct),
          CustomProductName: item.CustomProductName || null,
          CustomDescription: item.CustomDescription || null,
          CustomBasePrice: item.CustomBasePrice || null,
        }));

        setCart(items);
        setCartSummary({
          totalItems: items.length,
          totalPrice: cartData.TotalPrice || 0,
          deliveryCharge: cartData.DeliveryCharge || 0,
          totalItemsPrice: cartData.TotalItemsPrice || 0,
        });
      } else {
        setCart([]);
      }
    } catch (err: any) {
      console.error('Error fetching cart:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load cart. Please try again.';
      setError(errorMessage);
      
      // If it's a 400 error, log the full response for debugging
      if (err.response?.status === 400) {
        console.error('Bad Request Details:', {
          status: err.response.status,
          data: err.response.data,
          userId: id
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  /* ───── Loading / Error ───── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Cart Load Failed</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchCart}
            className="w-full bg-teal-600 text-white py-3 rounded-xl font-medium hover:bg-teal-700 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const subtotal = cartSummary.totalItemsPrice;
  const total = cartSummary.totalPrice + cartSummary.deliveryCharge;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-7 h-7 sm:w-8 sm:h-8 text-teal-600" />
                Shopping Cart
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Link
                href={`/add-custom-product?userId=${id}`}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm sm:text-base font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Custom Product
              </Link>
              <Link
                href="/user-carts"
                className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors text-sm sm:text-base"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Users
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* User Info Card */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-3 sm:px-6 sm:py-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Customer Details
                    </h3>
                  </div>
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium truncate">{user.FirstName} {user.LastName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium truncate">{user.Email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{user.PhoneNumber || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Cart Items */}
              <AnimatePresence>
                {cart.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                    </div>
                    <p className="text-lg sm:text-xl font-medium text-gray-900">Your cart is empty</p>
                    <p className="text-gray-500 mt-2">No items have been added yet.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                        Cart Items ({cart.length})
                      </h3>
                    </div>

                    {cart.map((item, index) => (
                      <motion.div
                        key={item.CartItemId}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="p-4 sm:p-6">
                          <div className="flex gap-4">
                            {/* Image */}
                            <div className="flex-shrink-0">
                              {item.Documents[0]?.DocumentUrl ? (
                                <div className="relative">
                                  <img
                                    src={item.Documents[0].DocumentUrl}
                                    alt={item.ProductName}
                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling!.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="hidden w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                                    <Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                                  </div>
                                </div>
                              ) : (
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                                  <Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                <h4 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                                  {item.ProductName}
                                </h4>
                                <p className="text-base sm:text-lg font-bold text-teal-600 whitespace-nowrap">
                                  ₹{item.ItemPrice.toFixed(2)}
                                </p>
                              </div>

                              {/* Print Specifications */}
                              <div className="space-y-2 mb-3">
                                {/* Basic Attributes */}
                                {item.Attributes.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.Attributes.map((attr, i) => (
                                      <span
                                        key={`attr-${i}`}
                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-teal-50 text-teal-700"
                                      >
                                        {attr.AttributeName}: {attr.AttributeValue}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Print Details */}
                                {item.DynamicAttributes.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <h5 className="text-xs font-semibold text-gray-500 mb-1">PRINT DETAILS</h5>
                                    <div className="grid grid-cols-2 gap-1.5 text-sm">
                                      {item.DynamicAttributes.map((attr, i) => {
                                        if (!attr.AttributeValue) return null;

                                        const formatLabel = (label: string) =>
                                          label
                                            .replace(/([A-Z])/g, ' $1')
                                            .replace(/^./, (s) => s.toUpperCase())
                                            .trim();

                                        if (attr.AttributeName === 'ColorPrintRange') {
                                          const pageCount = item.DynamicAttributes.find(
                                            (a) => a.AttributeName === 'PageCount'
                                          )?.AttributeValue;
                                          const colorPageCount = item.DynamicAttributes.find(
                                            (a) => a.AttributeName === 'TotalColorPageCount'
                                          )?.AttributeValue;

                                          return (
                                            <Fragment key={`dyn-${i}`}>
                                              <div className="font-medium text-gray-700">Color Pages:</div>
                                              <div className="text-gray-900">
                                                {colorPageCount} pages ({attr.AttributeValue})
                                              </div>
                                              {pageCount && (
                                                <Fragment>
                                                  <div className="font-medium text-gray-700">Black & White Pages:</div>
                                                  <div className="text-gray-900">
                                                    {parseInt(pageCount) -
                                                      (parseInt(colorPageCount || '0') || 0)}{' '}
                                                    pages
                                                  </div>
                                                </Fragment>
                                              )}
                                            </Fragment>
                                          );
                                        }

                                        if (['PageCount', 'TotalColorPageCount'].includes(attr.AttributeName))
                                          return null;

                                        if (attr.AttributeName === 'NumberOfCopies') {
                                          return (
                                            <Fragment key={`dyn-${i}`}>
                                              <div className="font-medium text-gray-700">Copies:</div>
                                              <div className="text-gray-900">{attr.AttributeValue}</div>
                                            </Fragment>
                                          );
                                        }

                                        if (attr.AttributeName === 'ProductComment') {
                                          return (
                                            <div
                                              key={`dyn-${i}`}
                                              className="col-span-2 mt-2 pt-2 border-t border-gray-100"
                                            >
                                              <div className="text-xs font-medium text-gray-500 mb-1">
                                                CUSTOMER NOTE
                                              </div>
                                              <p className="text-sm text-gray-700 bg-amber-50 p-2 rounded-md">
                                                {attr.AttributeValue}
                                              </p>
                                            </div>
                                          );
                                        }

                                        return (
                                          <Fragment key={`dyn-${i}`}>
                                            <div className="font-medium text-gray-700">
                                              {formatLabel(attr.AttributeName)}:
                                            </div>
                                            <div className="text-gray-900">{attr.AttributeValue}</div>
                                          </Fragment>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Addons */}
                                {item.Addons?.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <h5 className="text-xs font-semibold text-gray-500 mb-1">ADD-ONS</  h5>
                                    <ul className="space-y-1">
                                      {item.Addons.map((addon: any, i: number) => (
                                        <li key={`addon-${i}`} className="text-sm text-gray-700">
                                          {addon.NumberOfBooks > 1 ? `${addon.NumberOfBooks}x ` : ''}
                                          {addon.AddonName || `Addon #${i + 1}`}
                                          {addon.AddonPrice ? ` (₹${addon.AddonPrice.toFixed(2)} each)` : ''}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Quantity and Actions */}
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">Qty:</span>
                                  <span className="font-semibold text-gray-900">{item.Quantity}</span>
                                </div>
                                <button
                                  onClick={() => handleRemoveClick(item.CartItemId)}
                                  disabled={deletingId === item.CartItemId}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {deletingId === item.CartItemId ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Removing...
                                    </>
                                  ) : (
                                    <>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Remove
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky Summary - Desktop */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-3 sm:px-6 sm:py-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white">Order Summary</h3>
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    <div className="space-y-3">
                      <div className="flex justify-between text-gray-600 text-sm sm:text-base">
                        <span>Subtotal ({cart.length} items)</span>
                        <span className="font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-sm sm:text-base">
                        <span>Delivery</span>
                        <span className="font-medium text-gray-900">
                          {cartSummary.deliveryCharge > 0
                            ? `₹${cartSummary.deliveryCharge.toFixed(2)}`
                            : 'Free'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between">
                        <span className="text-base sm:text-lg font-semibold text-gray-900">Total</span>
                        <span className="text-xl sm:text-2xl font-bold text-teal-600">
                          ₹{total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="text-center text-xs text-gray-500 mt-4">
                      Admin view only
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Mobile Fixed Total Bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl p-4 z-10">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-teal-600">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Bottom padding for mobile */}
          <div className="h-20 lg:hidden"></div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg 
                    className="h-6 w-6 text-red-600" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                    />
                  </svg>
                </div>
                <h3 className="mt-3 text-lg font-medium text-gray-900">Remove Item</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to remove this item from the cart?
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-xl">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId === itemToDelete}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === itemToDelete ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Removing...
                  </>
                ) : 'Remove'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserCartPage;