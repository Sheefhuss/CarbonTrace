import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import useAuthStore from '../context/authStore';
import IndividualDashboard from '../components/IndividualDashboard';
import LogActivityModal from '../components/LogActivityModal';
import CarbonBot from '../components/CarbonBot';
import { useEmissions } from '../hooks/useData';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { emissions, loading, refetch } = useEmissions();

  const [showLogModal, setShowLogModal] = useState(false);

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800">
      {/*  */}
      {showLogModal && (
        <LogActivityModal
          onClose={() => setShowLogModal(false)}
          onSaved={refetch}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 md:px-8">
        <div className="flex justify-end mb-4">
          <button onClick={logout}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* */}
        <IndividualDashboard
          setShowLogModal={setShowLogModal}
          emissions={emissions}
          emissionsLoading={loading}
          refetch={refetch}
        />
      </div>

      <CarbonBot user={user} emissions={emissions} />
    </div>
  );
}
