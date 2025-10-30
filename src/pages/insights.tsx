import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie } from 'recharts';

type PresetRange = 'last7days' | 'last30days' | 'today' | 'yesterday' | 'custom';
type MetricType = 'orders' | 'newUsers' | 'totalAmount' | 'bestSelling';

interface BestSellingItem {
  name: string;
  value: number;
  count: number;
}

interface DailyDetail {
  Date: string;
  OrdersCount: number;
  FailedPaymentsCount: number;
  NewUsersCount: number;
  TotalAmount: number;
}

interface InsightsData {
  OrdersCount: number;
  FailedPaymentsCount: number;
  NewUsersCount: number;
  TotalAmount: number;
  Details: DailyDetail[];
  BestSellingItems?: Array<{
    name: string;
    count: number;
    totalAmount: number;
  }>;
}

const numberFormatter = new Intl.NumberFormat('en-IN');

const getMetricValue = (source: unknown, keys: string[]): number => {
  if (!source || typeof source !== 'object') {
    return 0;
  }
  for (const key of keys) {
    const value = (source as Record<string, unknown>)[key];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
};

const presetOptions: { value: PresetRange; label: string }[] = [
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'custom', label: 'Custom' },
];

const InsightsPage = () => {
  const [preset, setPreset] = useState<PresetRange>('last7days');
  const [customType, setCustomType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('orders');
  const [topSellersSort, setTopSellersSort] = useState<'amount' | 'count'>('amount');

  const activeType = useMemo(() => {
    if (preset === 'custom') {
      return customType.trim();
    }
    return preset;
  }, [preset, customType]);

  const dailyChartData = useMemo(() => {
    if (!data?.Details || !Array.isArray(data.Details)) {
      console.log('No Details array found in data:', data);
      return [];
    }
    
    console.log('Processing Details:', data.Details);
    
    return data.Details.map(detail => {
      const date = new Date(detail.Date);
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
      
      let value = 0;
      switch (selectedMetric) {
        case 'orders':
          value = detail.OrdersCount;
          break;
        case 'newUsers':
          value = detail.NewUsersCount;
          break;
        case 'totalAmount':
          value = detail.TotalAmount;
          break;
      }
      
      return {
        date: formattedDate,
        fullDate: detail.Date,
        value
      };
    });
  }, [data, selectedMetric]);

  const maxChartValue = useMemo(() => {
    if (!dailyChartData.length) return 0;
    const values = dailyChartData.map(item => item.value);
    const positiveValues = values.filter(value => value > 0);
    if (!positiveValues.length) return 0;
    return Math.max(...positiveValues);
  }, [dailyChartData]);

  const bestSellingData = useMemo(() => {
    if (data?.BestSellingItems?.length) {
      return data.BestSellingItems.map(item => ({
        name: item.name,
        value: item.totalAmount,
        count: item.count
      }));
    }
    return [];
  }, [data]);

  const metricConfig = useMemo(() => {
    const configs = {
      orders: { label: 'Orders Count', color: 'from-blue-600 to-indigo-500', value: data?.OrdersCount || 0 },
      newUsers: { label: 'New Users', color: 'from-green-600 to-emerald-500', value: data?.NewUsersCount || 0 },
      totalAmount: { label: 'Total Amount', color: 'from-purple-600 to-pink-500', value: data?.TotalAmount || 0 },
      bestSelling: { label: 'Best Selling Items', color: 'from-amber-500 to-orange-500', value: data?.BestSellingItems?.length || 0 }
    };
    return configs[selectedMetric];
  }, [selectedMetric, data]);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      
      let startDateParam: string | null = null;
      let endDateParam: string | null = null;
      
      if (preset !== 'custom') {
        const today = new Date();
        switch (preset) {
          case 'today':
            startDateParam = today.toISOString().split('T')[0];
            endDateParam = startDateParam;
            break;
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            startDateParam = yesterday.toISOString().split('T')[0];
            endDateParam = startDateParam;
            break;
          case 'last7days':
            const end = today.toISOString().split('T')[0];
            const start = new Date(today);
            start.setDate(today.getDate() - 6);
            startDateParam = start.toISOString().split('T')[0];
            endDateParam = end;
            break;
          case 'last30days':
            const end30 = today.toISOString().split('T')[0];
            const start30 = new Date(today);
            start30.setDate(today.getDate() - 29);
            startDateParam = start30.toISOString().split('T')[0];
            endDateParam = end30;
            break;
        }
        params.start = startDateParam!;
        params.end = endDateParam!;
      } else {
        if (startDate) params.start = startDate;
        if (endDate) params.end = endDate;
      }
      
      console.log('API Request params:', params);
      console.log('Selected Metric:', selectedMetric);

      const response = await api.get('/api/analytics/product-sales-report', {
        params: {
          type: preset,
          start: params.start,
          end: params.end
        }
      });
      const payload = (response.data && typeof response.data === 'object' && 'Data' in response.data)
        ? (response.data as Record<string, unknown>).Data
        : response.data;

      console.log('API Response:', response.data);
      console.log('Payload:', payload);
      console.log('Details array:', (payload as InsightsData)?.Details);
      
      // Transform API data to match old insights expectations
      const { Details = [], TotalProductsSold = 0, TotalRevenue = 0 } = (payload as any) || {};
      const productMap = new Map<string, { name: string; count: number; totalAmount: number }>();
      for (const day of Details as any[]) {
        if (Array.isArray((day as any).Products)) {
          for (const p of (day as any).Products as any[]) {
            if (!productMap.has(p.ProductName)) {
              productMap.set(p.ProductName, {
                name: p.ProductName,
                count: 0,
                totalAmount: 0
              });
            }
            const entry = productMap.get(p.ProductName)!;
            entry.count += p.QuantitySold || 0;
            entry.totalAmount += p.Revenue || 0;
          }
        }
      }
      const BestSellingItems = Array.from(productMap.values());

      setData({
        OrdersCount: 0, // not available in new API, set as needed
        FailedPaymentsCount: 0, // set as needed
        NewUsersCount: 0, // set as needed
        TotalAmount: TotalRevenue,
        Details: Details as any,
        BestSellingItems
      });
    } catch (err) {
      setError('Unable to load insights data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [preset, startDate, endDate, selectedMetric]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900">Performance Insights</h1>
          <p className="text-gray-500 text-base">Review high-level metrics for the selected range.</p>
        </div>

        <form
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            fetchInsights();
          }}
        >
          <div className={`grid gap-4 ${preset === 'custom' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'}`}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Date Range</label>
              <select
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={preset}
                onChange={(event) => {
                  const value = event.target.value as PresetRange;
                  setPreset(value);
                  if (value !== 'custom') {
                    setCustomType('');
                    setStartDate('');
                    setEndDate('');
                  }
                }}
              >
                {presetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {preset === 'custom' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 transition-all"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 transition-all"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={loading || (preset === 'custom' && (!startDate || !endDate))}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : 'Apply Filters'}
              </button>
            </div>
          </div>
          
          {preset === 'custom' && (!startDate || !endDate) && (
            <div className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Please select both start and end dates for custom range
            </div>
          )}
        </form>

        {error ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-xl border border-gray-100">
            <p className="text-2xl font-semibold text-gray-900">Unable to load insights</p>
            <p className="text-gray-500 mt-2">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Universal Metric Selector */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Select Metric</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Choose which metric to display across all views</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedMetric('orders')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                      selectedMetric === 'orders'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📦 Orders
                  </button>
                  <button
                    onClick={() => setSelectedMetric('newUsers')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                      selectedMetric === 'newUsers'
                        ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    👥 Users
                  </button>
                  <button
                    onClick={() => setSelectedMetric('totalAmount')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                      selectedMetric === 'totalAmount'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    💰 Amount
                  </button>
                  <button
                    onClick={() => setSelectedMetric('bestSelling')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                      selectedMetric === 'bestSelling'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🏆 Best Sellers
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Metric Card */}
            <div className={`bg-gradient-to-br ${metricConfig.color} rounded-3xl p-8 text-white shadow-2xl transform transition-all hover:scale-[1.02]`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm uppercase tracking-widest opacity-90 mb-2">{metricConfig.label}</div>
                  <div className="text-5xl font-bold mb-2">
                    {selectedMetric === 'totalAmount' ? `₹${numberFormatter.format(metricConfig.value)}` : numberFormatter.format(metricConfig.value)}
                  </div>
                  <div className="text-sm opacity-80">Total for selected period</div>
                </div>
                <div className="text-6xl opacity-20">
                  {selectedMetric === 'orders' && '📦'}
                  {selectedMetric === 'newUsers' && '👥'}
                  {selectedMetric === 'totalAmount' && '💰'}
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedMetric === 'bestSelling' ? 'Best Selling Items' : `Daily Trends - ${metricConfig.label}`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedMetric === 'bestSelling' 
                    ? 'Top performing products by sales amount' 
                    : 'View daily breakdown for the selected period'}
                </p>
              </div>

              {selectedMetric === 'bestSelling' ? (
                <div className="w-full" style={{ height: '600px' }}>
                  {bestSellingData.length > 0 ? (
                    <div className="flex flex-col md:flex-row h-full gap-6">
                      <div className="w-full md:w-2/3 h-96 md:h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <defs>
                              {bestSellingData.map((entry, index) => (
                                <linearGradient 
                                  key={`gradient-${index}`} 
                                  id={`gradient-${index}`} 
                                  x1="0" 
                                  y1="0" 
                                  x2="0" 
                                  y2="1"
                                >
                                  <stop offset="0%" stopColor={`hsl(${index * 360 / bestSellingData.length}, 70%, 60%)`} />
                                  <stop offset="100%" stopColor={`hsl(${index * 360 / bestSellingData.length}, 90%, 40%)`} />
                                </linearGradient>
                              ))}
                            </defs>
                            <Pie
                              data={bestSellingData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={140}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, percent }: any) => {
                                return `${name}\n${((percent || 0) * 100).toFixed(0)}%`;
                              }}
                              labelLine={false}
                            >
                              {bestSellingData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`}
                                  fill={`url(#gradient-${index})`}
                                  stroke="#fff"
                                  strokeWidth={2}
                                  style={{
                                    filter: 'drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.2))',
                                    transition: 'opacity 0.3s',
                                    cursor: 'pointer'
                                  }}
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (!active || !payload || !payload.length) return null;
                                const p = payload[0].payload as { name: string; value: number; count: number };
                                return (
                                  <div style={{
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                                    padding: '12px',
                                    fontSize: '14px'
                                  }}>
                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                    <div style={{ color: '#4b5563' }}>₹{numberFormatter.format(p.value)}</div>
                                    <div style={{ color: '#6b7280', fontSize: '12px' }}>{p.count} items sold</div>
                                  </div>
                                );
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/3 space-y-4">
                        {/* Filter for sorting top sellers */}
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-800">Top Sellers</h3>
                          <select
                            className="border rounded outline-none px-2 py-1 text-sm"
                            value={topSellersSort}
                            onChange={e => setTopSellersSort(e.target.value as 'amount' | 'count')}
                          >
                            <option value="amount">By Amount</option>
                            <option value="count">By Count</option>
                          </select>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                          <div className="space-y-3">
                            {bestSellingData
                              .slice() // copy so sort doesn't mutate original
                              .sort((a, b) => topSellersSort === 'amount' ? b.value - a.value : b.count - a.count)
                              .map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ 
                                        background: `hsl(${index * 360 / bestSellingData.length}, 70%, 60%)`,
                                        boxShadow: '0 0 0 3px rgba(255,255,255,0.8), 0 2px 5px rgba(0,0,0,0.1)'
                                      }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900 flex flex-col items-end gap-0.5">
                                    <span>₹{numberFormatter.format(item.value)}</span>
                                    <span className="text-xs text-gray-500">{item.count} sold</span>
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                          <h4 className="font-medium text-blue-800 mb-2">Total Sales</h4>
                          <div className="text-2xl font-bold text-blue-900">
                            ₹{numberFormatter.format(bestSellingData.reduce((sum, item) => sum + item.value, 0))}
                          </div>
                          <div className="text-sm text-blue-600 mt-1">
                            {bestSellingData.reduce((sum, item) => sum + item.count, 0)} items sold
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No best selling items data available
                    </div>
                  )}
                </div>
              ) : data && dailyChartData.length > 0 ? (
                <div className="mt-8">
                  {/* Professional Recharts Bar Chart */}
                  <div className="w-full" style={{ height: '450px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dailyChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        barSize={dailyChartData.length > 15 ? 30 : 50}
                      >
                        <defs>
                          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.9}/>
                          </linearGradient>
                          <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.9}/>
                          </linearGradient>
                          <linearGradient id="colorTotalAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#ec4899" stopOpacity={0.9}/>
                          </linearGradient>
                          <linearGradient id="colorFailedPayments" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0.9}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke="#e5e7eb" 
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                          tickLine={{ stroke: '#d1d5db' }}
                          axisLine={{ stroke: '#d1d5db' }}
                          angle={dailyChartData.length > 10 ? -45 : 0}
                          textAnchor={dailyChartData.length > 10 ? 'end' : 'middle'}
                          height={dailyChartData.length > 10 ? 80 : 60}
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                          tickLine={{ stroke: '#d1d5db' }}
                          axisLine={{ stroke: '#d1d5db' }}
                          tickFormatter={(value: number) => 
                            selectedMetric === 'totalAmount' 
                              ? `₹${numberFormatter.format(value)}`
                              : numberFormatter.format(value)
                          }
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                            padding: '12px 16px'
                          }}
                          labelStyle={{ 
                            color: '#f9fafb', 
                            fontWeight: 600,
                            fontSize: '13px',
                            marginBottom: '4px'
                          }}
                          itemStyle={{ 
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: 700,
                            padding: '4px 0'
                          }}
                          formatter={(value: number) => [
                            selectedMetric === 'totalAmount' 
                              ? `₹${numberFormatter.format(value)}`
                              : numberFormatter.format(value),
                            metricConfig.label
                          ]}
                        />
                        <Bar 
                          dataKey="value" 
                          fill={`url(#color${selectedMetric === 'orders' ? 'Orders' : selectedMetric === 'newUsers' ? 'NewUsers' : 'TotalAmount'})`}
                          radius={[8, 8, 0, 0]}
                          animationDuration={800}
                          animationBegin={0}
                        >
                          {dailyChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`}
                              className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Summary Stats */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-semibold">Total {metricConfig.label}</div>
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                          {selectedMetric === 'totalAmount' ? `₹${numberFormatter.format(metricConfig.value)}` : numberFormatter.format(metricConfig.value)}
                        </div>
                        <div className="text-xs text-gray-500">Cumulative</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-xs text-blue-600 uppercase tracking-widest mb-2 font-semibold">Average per Day</div>
                        <div className="text-3xl font-bold text-blue-900 mb-1">
                          {selectedMetric === 'totalAmount' 
                            ? `₹${numberFormatter.format(Math.round(metricConfig.value / (dailyChartData.length || 1)))}` 
                            : numberFormatter.format(Math.round(metricConfig.value / (dailyChartData.length || 1)))}
                        </div>
                        <div className="text-xs text-blue-600">Daily Mean</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-center border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-xs text-green-600 uppercase tracking-widest mb-2 font-semibold">Peak Day</div>
                        <div className="text-3xl font-bold text-green-900 mb-1">
                          {selectedMetric === 'totalAmount' ? `₹${numberFormatter.format(maxChartValue)}` : numberFormatter.format(maxChartValue)}
                        </div>
                        <div className="text-xs text-green-600">Highest Value</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-center text-sm text-gray-500 py-12">
                  {data ? (
                    <div>
                      <p>No daily data available for the selected period</p>
                      <p className="text-xs mt-2">Details array: {data.Details ? `${data.Details.length} items` : 'not found'}</p>
                    </div>
                  ) : (
                    <p>Loading data...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default InsightsPage;
