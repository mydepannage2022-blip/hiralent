'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerificationsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/admin/verifications/pending', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
      if (data.ok && data.data) {
        setCompanies(data.data);
      }
    } catch (err) {
      console.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Company Verifications
          </h1>
          <p className="text-gray-600">
            Review and process pending company verifications
          </p>
        </div>
        <button
          onClick={loadVerifications}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        {companies.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <span className="text-6xl mb-4 block">✅</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No pending verifications at the moment.</p>
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company.company_id}
              onClick={() => router.push(`/admin/dashboard/verifications/${company.company_id}`)}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {company.company_name}
                    </h3>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                      Pending
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Industry:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {company.industry}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {company.company_size}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Registration:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {company.registration_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Submitted:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {getTimeAgo(company.verification_submitted_at)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Contact: </span>
                    <span className="text-sm font-medium text-gray-900">
                      {company.user.email}
                    </span>
                  </div>
                </div>

                <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  Review →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}