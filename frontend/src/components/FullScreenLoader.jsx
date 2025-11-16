import React from "react";

export default function FullScreenLoader({ message = "Loading..." }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-24 w-24 border-4 border-gray-200 border-t-blue-600"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src="/jckl-192.png" 
            alt="JCKL Academy Logo" 
            className="w-16 h-16 rounded-xl"
          />
        </div>
      </div>
      <p className="mt-6 text-gray-600 font-medium animate-pulse">
        {message}
      </p>
    </div>
  );
}
