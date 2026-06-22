import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/axios';

type Product = {
  ProductID: number;
  ProductName: string;
  Description?: string | null;
  ProductImage?: string | null;
  PricingStrategy?: number;
  UiMode?: number;
  ListingStatus?: number;
  IsEnabled?: boolean;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [query, setQuery] = useState('');

  const canDeleteProduct = (product: Product) => {
    const strategy = product.PricingStrategy as unknown;
    return strategy === 0 || strategy === '0' || strategy === 'GenericMatrix';
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<Product[]>('/api/products');
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch products', err);
        setError('Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter((product) => {
      const name = (product.ProductName || '').toLowerCase();
      const description = (product.Description || '').toLowerCase();
      const id = String(product.ProductID || '');
      return name.includes(q) || description.includes(q) || id.includes(q);
    });
  }, [products, query]);

  const confirmDelete = (product: Product) => {
    if (!canDeleteProduct(product)) return;
    setProductToDelete(product);
  };

  const executeDelete = async () => {
    if (!productToDelete) return;
    const product = productToDelete;

    try {
      setError(null);
      setBusyDeleteId(product.ProductID);
      await api.delete(`/api/products/${product.ProductID}`);
      setProducts((prev) => prev.filter((item) => item.ProductID !== product.ProductID));
      setProductToDelete(null);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || 'Failed to delete product');
    } finally {
      setBusyDeleteId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Product Management</h1>
            <p className="text-sm text-gray-500 font-medium">Manage your product catalog and storefront listings.</p>
          </div>
          <Link
            href="/products/new"
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/10 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Product
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                placeholder="Search catalog by ID, name, or description..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-gray-400"
              />
            </div>
          </div>

          {error && (
            <div className="px-5 py-3 text-sm font-medium text-red-700 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500">Product</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500">UI Mode</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500">Listing</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500">Enabled</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span className="text-sm font-medium">Loading products...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-1">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        </div>
                        <span className="font-medium text-gray-900">No products found</span>
                        <span className="text-sm">Try adjusting your search query.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.ProductID} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {product.ProductImage ? (
                            <img
                              src={product.ProductImage}
                              alt={product.ProductName}
                              className="h-12 w-12 rounded-xl object-cover border border-gray-200 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 truncate">{product.ProductName}</span>
                              <span className="text-xs font-semibold text-gray-400">#{product.ProductID}</span>
                            </div>
                            <span className="text-xs text-gray-500 truncate max-w-sm mt-0.5">
                              {product.Description || 'No description provided.'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {Number(product.UiMode ?? 1) === 1 ? 'Dynamic Mode' : 'Dedicated Mode'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-[12px] font-semibold ${product.ListingStatus === 1 ? 'text-blue-600' : 'text-gray-500'}`}>
                          {product.ListingStatus === 1 ? 'Ready for Store' : 'Draft Listing'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
                          product.IsEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${product.IsEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {product.IsEnabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/products/${product.ProductID}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors focus:outline-none focus:ring-4 focus:ring-gray-100"
                          >
                            Edit
                          </Link>
                          {canDeleteProduct(product) && (
                            <button
                              type="button"
                              onClick={() => confirmDelete(product)}
                              disabled={busyDeleteId === product.ProductID}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-100 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-red-50"
                            >
                              {busyDeleteId === product.ProductID ? 'Deleting...' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-100">
            {loading ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <svg className="animate-spin h-6 w-6 inline text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500 font-medium">No products found</div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.ProductID} className="p-4">
                  <div className="flex items-start gap-3">
                    {product.ProductImage ? (
                      <img
                        src={product.ProductImage}
                        alt={product.ProductName}
                        className="h-14 w-14 rounded-xl object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                         <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{product.ProductName}</h3>
                        <span className="text-[10px] font-bold text-gray-400">#{product.ProductID}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{product.Description || 'No description'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                          product.IsEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {product.IsEnabled ? 'Active' : 'Disabled'}
                        </span>
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                          product.ListingStatus === 1 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {product.ListingStatus === 1 ? 'Ready' : 'Draft'}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/products/${product.ProductID}`}
                          className="flex-1 text-center py-1.5 rounded-lg border border-gray-200 bg-white shadow-sm text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all active:scale-95"
                        >
                          Edit
                        </Link>
                        {canDeleteProduct(product) && (
                          <button
                            type="button"
                            onClick={() => confirmDelete(product)}
                            disabled={busyDeleteId === product.ProductID}
                            className="flex-1 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 shadow-sm focus:outline-none focus:ring-4 focus:ring-red-100 transition-all active:scale-95"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 text-red-600 mb-4">
                <div className="bg-red-50 p-3 rounded-full">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Confirm Deletion</h3>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <span className="font-semibold text-gray-900">"{productToDelete.ProductName}"</span> (ID: {productToDelete.ProductID})? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={busyDeleteId === productToDelete.ProductID}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50"
              >
                {busyDeleteId === productToDelete.ProductID ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
