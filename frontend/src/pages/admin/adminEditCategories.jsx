import React, { useEffect } from 'react'
import Navbar from '../../components/adminavbar'
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { refreshSessionForProtected } from "../../lib/auth";

export default function AdminEditCategories() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-4">Edit Categories</h1>
        {/* TODO: implement Edit Categories */}
      </main>
    </div>
  )
}
