import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  Mail,
  Phone,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Package,
} from 'lucide-react';

interface User {
  Id: string;
  UserName: string;
  Email: string;
  FirstName: string | null;
  LastName: string | null;
  IsActive: boolean;
  CreatedByAdmin: boolean;
  PhoneNumber: string;
  CreatedDate: string;
}

const UserCartsPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'phone'>('email');
  const router = useRouter();

  interface ApiResponse<T> {
    Data?: { Items: T[]; TotalCount: number };
    Items?: T[];
    TotalCount?: number;
  }

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = { PageNumber: page, PageSize: pageSize };
      if (searchTerm) {
        params[searchType === 'email' ? 'Email' : 'PhoneNumber'] = searchTerm;
      }

      const res = await api.get<ApiResponse<User>>('/api/user/admin/list', { params });
      const data = res.data.Data || res.data;
      setUsers(data.Items || []);
      setTotal(data.TotalCount || 0);
      setTotalPages(Math.ceil((data.TotalCount || 0) / pageSize));
    } catch (e) {
      console.error('Error fetching users:', e);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, searchTerm, searchType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const getUserInitials = (user: User) => {
    const first = user.FirstName?.[0] || '';
    const last = user.LastName?.[0] || '';
    return (first + last).toUpperCase() || user.UserName[0].toUpperCase();
  };

  const getUserFullName = (user: User) => {
    if (user.FirstName && user.LastName) return `${user.FirstName} ${user.LastName}`;
    return user.FirstName || user.UserName;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy • h:mm a');
  };

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="w-8 h-8 text-teal-600" />
            User Management
          </h1>
          <p className="text-gray-600 mt-1">View and manage all registered users</p>
        </motion.div>

        {/* Search Bar – Mobile-Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <form onSubmit={handleSearch} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-0">
              {/* Type Selector */}
              <div className="relative">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'email' | 'phone')}
                  className="h-12 pl-4 pr-10 text-sm bg-gray-50 border border-gray-300 rounded-t-xl sm:rounded-l-xl sm:rounded-tr-none focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none w-full sm:w-auto"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {searchType === 'email' ? (
                    <Mail className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Phone className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Search Input */}
              <div className="relative flex-1">
                <input
                  type={searchType === 'phone' ? 'tel' : 'email'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search by ${searchType}...`}
                  className="h-12 w-full pl-10 pr-10 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSearchType('email');
                      fetchUsers();
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <Search className="absolute inset-y-0 left-0 flex items-center pl-3 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>

              {/* Search Button */}
              <button
                type="submit"
                className="h-12 mt-3 sm:mt-0 px-6 bg-teal-600 text-white font-medium rounded-b-xl sm:rounded-r-xl sm:rounded-bl-none hover:bg-teal-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Search className="w-5 h-5" />
                <span className="sm:hidden">Search</span>
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </form>
        </motion.div>

        {/* Responsive Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* MOBILE: Cards */}
          <div className="sm:hidden space-y-4 p-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-xl p-4 animate-pulse border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-36"></div>
                      <div className="h-3 bg-gray-200 rounded w-28"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">No users found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search filters</p>
              </div>
            ) : (
              users.map((user, idx) => (
                <motion.div
                  key={user.Id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center text-white font-semibold text-base shadow">
                        {getUserInitials(user)}
                      </div>
                      {user.CreatedByAdmin && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white"></div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-base truncate">
                        {getUserFullName(user)}
                      </div>
                      <div className="text-sm text-gray-500 truncate mt-0.5">
                        {user.Email || 'No email'}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-1 text-gray-700">
                          <Phone className="w-3.5 h-3.5" />
                          {user.PhoneNumber || '—'}
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(user.CreatedDate)}
                        </div>
                      </div>

                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.IsActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.IsActive ? 'Active' : 'Inactive'}
                        </span>
                        {user.CreatedByAdmin && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Created By Admin
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="mt-1">
                      <Link
                        href={{
                          pathname: `/user/${user.Id}/cart`,
                          query: {
                            userData: JSON.stringify({
                              Id: user.Id,
                              UserName: user.UserName,
                              Email: user.Email,
                              FirstName: user.FirstName,
                              LastName: user.LastName,
                              PhoneNumber: user.PhoneNumber,
                            }),
                          },
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-all shadow-sm"
                      >
                        <Package className="w-3.5 h-3.5" />
                        View Cart
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* DESKTOP: Table (unchanged) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm mt-1">Try adjusting your search filters</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <motion.tr
                      key={user.Id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
                              {getUserInitials(user)}
                            </div>
                            {user.CreatedByAdmin && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {getUserFullName(user)}
                            </div>
                            <div className="text-sm text-gray-500">{user.Email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm text-gray-900">{user.PhoneNumber || '—'}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user.IsActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {user.IsActive ? 'Active' : 'Inactive'}
                          </span>
                          {user.CreatedByAdmin && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Created By Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {formatDate(user.CreatedDate)}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={{
                            pathname: `/user/${user.Id}/cart`,
                            query: {
                              userData: JSON.stringify({
                                Id: user.Id,
                                UserName: user.UserName,
                                Email: user.Email,
                                FirstName: user.FirstName,
                                LastName: user.LastName,
                                PhoneNumber: user.PhoneNumber,
                              }),
                            },
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-all shadow-sm hover:shadow-md"
                        >
                          <Package className="w-4 h-4" />
                          View Cart
                        </Link>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (shared) */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-semibold">{startItem}</span> to{' '}
                  <span className="font-semibold">{endItem}</span> of{' '}
                  <span className="font-semibold">{total}</span> users
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className={`p-2 rounded-lg border ${
                      page === 1
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          page === pageNum
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }).concat(
                    totalPages > 5
                      ? [
                          <span key="ellipsis" className="px-2 text-gray-500">
                            ...
                          </span>,
                          <button
                            key={totalPages}
                            onClick={() => setPage(totalPages)}
                            className={`w-10 h-10 rounded-lg font-medium transition-all ${
                              page === totalPages
                                ? 'bg-teal-600 text-white shadow-md'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {totalPages}
                          </button>,
                        ]
                      : []
                  )}

                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className={`p-2 rounded-lg border ${
                      page === totalPages
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default UserCartsPage;