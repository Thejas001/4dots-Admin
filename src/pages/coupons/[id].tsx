import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/axios';

type ApiCoupon = {
  Id: number;
  Code: string;
  Description?: string;
  DiscountAmount: number;
  MinimumOrderValue?: number;
  IsPercentage: boolean;
  MaxDiscountAmount?: number;
  MaxUsageCount?: number;
  MaxUsagePerUser?: number;
  IsFirstOrderOnly?: boolean;
  IsNewUserOnly?: boolean;
  StartDate?: string;
  EndDate?: string;
  IsActive: boolean;
  ApplicableProductIds?: number[];
};

export default function CouponDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [coupon, setCoupon] = useState<ApiCoupon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ApiCoupon | { Data: ApiCoupon }>(`/api/coupons/${id}`);
        const payload: any = res.data;
        const entity: ApiCoupon = (payload && typeof payload === 'object' && 'Data' in payload) ? (payload as any).Data : (payload as any);
        setCoupon(entity ?? null);
      } catch (e) {
        setError('Failed to load coupon');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router.isReady]);

  const currentCoupon: ApiCoupon | undefined = useMemo(() => {
    if (!coupon) return undefined;
    return coupon;
  }, [coupon]);

  const numberFmt = new Intl.NumberFormat('en-IN');
  const rupee = (n?: number) => (typeof n === 'number' ? `₹${numberFmt.format(n)}` : '—');
  const date = (s?: string) => (s ? s.slice(0, 10) : '—');
  const discount = (c?: ApiCoupon) => (!c ? '—' : c.IsPercentage ? `${c.DiscountAmount}%` : rupee(c.DiscountAmount));
  const status = (c?: ApiCoupon) => {
    if (!c) return { text: '—', cls: 'bg-gray-100 text-gray-800' };
    const now = new Date();
    const start = c.StartDate ? new Date(c.StartDate) : null;
    const end = c.EndDate ? new Date(c.EndDate) : null;
    let st: 'active' | 'expired' | 'scheduled' | 'inactive' = 'active';
    if (!c.IsActive) st = 'inactive';
    else if (start && now < start) st = 'scheduled';
    else if (end && now > end) st = 'expired';
    const cls =
      st === 'active'
        ? 'bg-green-100 text-green-800'
        : st === 'expired'
        ? 'bg-red-100 text-red-800'
        : st === 'scheduled'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-800';
    return { text: st, cls };
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coupon Details</h1>
            <p className="text-gray-500">Full information for the selected coupon.</p>
          </div>
          <Link href="/coupons" className="text-sm font-medium text-blue-600 hover:text-blue-800">&larr; Back to list</Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">Loading...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4">{error}</div>
        ) : !currentCoupon ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">Coupon not found</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-gray-900">{currentCoupon.Code}</div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status(currentCoupon).cls}`}>
                  {status(currentCoupon).text}
                </span>
              </div>
              <div className="text-gray-700">
                <span className="font-medium">Discount:</span> {discount(currentCoupon)}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-6 space-y-3 border-b md:border-b-0 md:border-r border-gray-100">
                <h2 className="text-sm font-semibold text-gray-500 uppercase">General</h2>
                <div className="text-gray-700"><span className="font-medium">Description:</span> {currentCoupon.Description || '—'}</div>
                <div className="text-gray-700"><span className="font-medium">Type:</span> {currentCoupon.IsPercentage ? 'Percentage' : 'Fixed amount'}</div>
                <div className="text-gray-700"><span className="font-medium">Minimum Order Value:</span> {rupee(currentCoupon.MinimumOrderValue)}</div>
                <div className="text-gray-700"><span className="font-medium">Max Discount Amount:</span> {rupee(currentCoupon.MaxDiscountAmount)}</div>
                <div className="text-gray-700"><span className="font-medium">Valid From:</span> {date(currentCoupon.StartDate)}</div>
                <div className="text-gray-700"><span className="font-medium">Valid To:</span> {date(currentCoupon.EndDate)}</div>
              </div>

              <div className="p-6 space-y-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase">Restrictions</h2>
                <div className="text-gray-700"><span className="font-medium">Max Usage (global):</span> {currentCoupon.MaxUsageCount ?? '—'}</div>
                <div className="text-gray-700"><span className="font-medium">Max Usage per User:</span> {currentCoupon.MaxUsagePerUser ?? '—'}</div>
                <div className="text-gray-700"><span className="font-medium">First Order Only:</span> {currentCoupon.IsFirstOrderOnly ? 'Yes' : 'No'}</div>
                <div className="text-gray-700"><span className="font-medium">New User Only:</span> {currentCoupon.IsNewUserOnly ? 'Yes' : 'No'}</div>
                <div className="text-gray-700"><span className="font-medium">Applicable Product IDs:</span> {currentCoupon.ApplicableProductIds?.length ? currentCoupon.ApplicableProductIds.join(', ') : '—'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
