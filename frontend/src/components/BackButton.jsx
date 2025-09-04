import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ className = '' }) {
  const nav = useNavigate();
  const location = useLocation();
  const goBack = () => {
    try {
      // If there is a history entry, go back; otherwise navigate to a safe fallback
      if (window.history && window.history.length > 1) {
        nav(-1);
      } else {
        nav('/dashboard');
      }
    } catch (e) {
      nav('/dashboard');
    }
  };

  // Don't render the back button on auth or landing routes where going back
  // would return the user into an authenticated area after logout.
  const hideOn = ["/login", "/register", "/", "/home"];
  if (hideOn.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return null;
  }

  return (
    <button
      onClick={goBack}
      aria-label="Go back"
      className={`fixed left-4 top-4 z-50 inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md ${className}`}
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline text-sm">Back</span>
    </button>
  );
}
