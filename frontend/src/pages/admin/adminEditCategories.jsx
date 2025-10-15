import React, { useEffect } from 'react'
import Navbar from '../../components/adminavbar'
import { useNavigate } from 'react-router-dom';

export default function AdminEditCategories() {
  const navigate = useNavigate();
    useEffect(() => {
      const authToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (!authToken || !storedUser) {
        navigate('/status/unauthorized');
      }
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
