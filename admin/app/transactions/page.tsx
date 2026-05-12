'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { adminApi, getAdminToken } from '@/lib/api';
import { ArrowUpCircle, ArrowDownCircle, CreditCard, Filter } from 'lucide-react';

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.push('/login');
      return;
    }

    adminApi.getTransactions({ limit: 100 })
      .then(data => setTransactions(data.transactions || []))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const filteredTx = filter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.type === filter);

  const getIcon = (type: string) => {
    switch(type) {
      case 'send': case 'payment': return ArrowUpCircle;
      case 'receive': case 'topup': return ArrowDownCircle;
      default: return CreditCard;
    }
  };

  const getColor = (type: string) => {
    switch(type) {
      case 'send': case 'payment': return 'text-red-600 bg-red-50';
      case 'receive': case 'topup': return 'text-green-600 bg-green-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-500 mt-1">Monitor all payment activities</p>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Transactions</option>
                  <option value="payment">Payments</option>
                  <option value="topup">Top Ups</option>
                  <option value="send">Transfers</option>
                  <option value="receive">Received</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTx.map((tx) => {
                      const Icon = getIcon(tx.type);
                      const colorClass = getColor(tx.type);
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colorClass}`}>
                              <Icon className="w-4 h-4" />
                              <span className="text-sm font-medium capitalize">{tx.type}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{tx.description}</div>
                            {tx.reference && (
                              <div className="text-xs text-gray-500 mt-1">Ref: {tx.reference}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {tx.amount.toLocaleString()} RWF
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              tx.status === 'success' 
                                ? 'bg-green-100 text-green-800'
                                : tx.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredTx.length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    No transactions found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
