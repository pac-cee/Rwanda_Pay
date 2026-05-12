'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function RecentActivity() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getLogs({ limit: 10 })
      .then(data => setActivities(data.logs || []))
      .catch(console.error);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          activities.map((activity, i) => (
            <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {activity.created_at && formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
