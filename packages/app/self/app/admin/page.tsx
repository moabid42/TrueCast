'use client';

import AdminPanel from '../components/AdminPanel';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPanel contractAddress={process.env.NEXT_PUBLIC_JOURNALIST_APPLICATION_CONTRACT!} />
    </div>
  );
} 