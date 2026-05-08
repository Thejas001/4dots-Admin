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

  const handleDeleteProduct = async (product: Product) => {
    if (!canDeleteProduct(product)) return;

    const confirmed = window.confirm(
      `Delete product "${product.ProductName}" (ID: ${product.ProductID})?\n\nThis action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      setError(null);
      setBusyDeleteId(product.ProductID);
      await api.delete(`/api/products/${product.ProductID}`);
      setProducts((prev) => prev.filter((item) => item.ProductID !== product.ProductID));
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || 'Failed to delete product');
    } finally {
      setBusyDeleteId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-500">List of all products in the catalog.</p>
          </div>
          <Link
            href="/products/new"
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            + New Product
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input
              placeholder="Search by ID, name, or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full md:max-w-md rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-t border-red-100">
              {error}
            </div>
          )}

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UI Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enabled</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      <svg className="animate-spin h-5 w-5 inline text-gray-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">No products found</td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.ProductID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{product.ProductID}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.ProductImage ? (
                          <img
                            src={product.ProductImage}
                            alt={product.ProductName}
                            className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-900">{product.ProductName}</td>
                      <td className="px-6 py-4 text-gray-600 max-w-xl truncate">
                        {product.Description || 'No description'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          Number(product.UiMode ?? 1) === 1
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {Number(product.UiMode ?? 1) === 1 ? 'Dynamic' : 'Dedicated'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.ListingStatus === 1
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {product.ListingStatus === 1 ? 'Ready' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.IsEnabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {product.IsEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/products/${product.ProductID}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </Link>
                          {canDeleteProduct(product) ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product)}
                              disabled={busyDeleteId === product.ProductID}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {busyDeleteId === product.ProductID ? 'Deleting...' : 'Delete'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {loading ? (
              <div className="px-4 py-10 text-center text-gray-500">
                <svg className="animate-spin h-5 w-5 inline text-gray-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-500">No products found</div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.ProductID} className="p-4">
                  <div className="rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      {product.ProductImage ? (
                        <img
                          src={product.ProductImage}
                          alt={product.ProductName}
                          className="h-14 w-14 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-gray-100 border border-gray-200" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">ID: {product.ProductID}</div>
                        <h3 className="text-base font-semibold text-gray-900 truncate">{product.ProductName}</h3>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{product.Description || 'No description'}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            Number(product.UiMode ?? 1) === 1
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {Number(product.UiMode ?? 1) === 1 ? 'Dynamic' : 'Dedicated'}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            product.ListingStatus === 1
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {product.ListingStatus === 1 ? 'Ready' : 'Draft'}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            product.IsEnabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {product.IsEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              href={`/products/${product.ProductID}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
                            >
                              Edit
                            </Link>
                            {canDeleteProduct(product) ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(product)}
                                disabled={busyDeleteId === product.ProductID}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm disabled:opacity-50"
                              >
                                {busyDeleteId === product.ProductID ? 'Deleting...' : 'Delete'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
