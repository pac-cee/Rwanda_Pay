'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import RecentActivity from '@/components/RecentActivity';
import { adminApi, getAdminToken } from '@/lib/api';
import { Users, CreditCard, TrendingUp, Activity } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    total_users: 0,
    total_transactions: 0,
    total_volume: 0,
    active_users_today: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.push('/login');
      return;
    }

    adminApi.getStats()
      .then(setStats)
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const cards = [
    { 
      title: 'Total Users', 
      value: stats.total_users.toLocaleString(), 
      icon: Users, 
      color: 'bg-blue-500',
      change: '+12%'
    },
    { 
      title: 'Transactions', 
      value: stats.total_transactions.toLocaleString(), 
      icon: CreditCard, 
      color: 'bg-green-500',
      change: '+8%'
    },
    { 
      title: 'Volume (RWF)', 
      value: stats.total_volume.toLocaleString(), 
      icon: TrendingUp, 
      color: 'bg-purple-500',
      change: '+15%'
    },
    { 
      title: 'Active Today', 
      value: stats.active_users_today.toLocaleString(), 
      icon: Activity, 
      color: 'bg-orange-500',
      change: '+5%'
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, Admin</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/merchants')}
                  className="w-full text-left px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  Add New Merchant
                </button>
                <button 
                  onClick={() => router.push('/users')}
                  className="w-full text-left px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  View All Users
                </button>
                <button 
                  onClick={() => router.push('/transactions')}
                  className="w-full text-left px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  View Transactions
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
