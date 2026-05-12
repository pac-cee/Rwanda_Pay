'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { adminApi, getAdminToken } from '@/lib/api';
import { Store, Plus, X, Edit, Trash2 } from 'lucide-react';

export default function MerchantsPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMerchant, setEditMerchant] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'retail',
    description: '',
    address: '',
    city: 'Kigali',
  });

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadMerchants();
  }, [router]);

  const loadMerchants = () => {
    adminApi.getMerchants()
      .then(data => setMerchants(data.merchants || []))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMerchant) {
        await adminApi.updateMerchant(editMerchant.id, formData);
      } else {
        await adminApi.addMerchant(formData);
      }
      setShowModal(false);
      setEditMerchant(null);
      setFormData({ name: '', email: '', phone: '', category: 'retail', description: '', address: '', city: 'Kigali' });
      loadMerchants();
    } catch (err) {
      alert('Failed to save merchant');
    }
  };

  const handleEdit = (merchant: any) => {
    setEditMerchant(merchant);
    setFormData({
      name: merchant.name,
      email: merchant.email || '',
      phone: merchant.phone || '',
      category: merchant.category,
      description: merchant.description || '',
      address: merchant.address || '',
      city: merchant.city || 'Kigali',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this merchant?')) return;
    try {
      await adminApi.deleteMerchant(id);
      loadMerchants();
    } catch (err) {
      alert('Failed to delete merchant');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Merchants</h1>
              <p className="text-gray-500 mt-1">Manage payment merchants</p>
            </div>
            <button
              onClick={() => { setEditMerchant(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
            >
              <Plus className="w-5 h-5" />
              Add Merchant
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchants.map((merchant) => (
                <div key={merchant.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Store className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{merchant.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{merchant.category?.replace('_', ' ')}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(merchant)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(merchant.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {merchant.description && (
                    <p className="text-sm text-gray-600 mt-4">{merchant.description}</p>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    {merchant.email && <p className="text-sm text-gray-600">{merchant.email}</p>}
                    {merchant.phone && <p className="text-sm text-gray-600">{merchant.phone}</p>}
                    {merchant.city && <p className="text-sm text-gray-600">{merchant.city}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {merchants.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              No merchants yet. Add your first merchant!
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editMerchant ? 'Edit' : 'Add'} Merchant</h2>
              <button onClick={() => { setShowModal(false); setEditMerchant(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Merchant Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="retail">Retail</option>
                  <option value="food_beverage">Food & Beverage</option>
                  <option value="transport">Transport</option>
                  <option value="health">Health</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="utilities">Utilities</option>
                  <option value="services">Services</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditMerchant(null); }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  {editMerchant ? 'Update' : 'Add'} Merchant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
