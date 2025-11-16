import React from "react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="relative">
        {/* Spinning border */}
        <div className="animate-spin rounded-full h-24 w-24 border-4 border-gray-200 border-t-blue-600"></div>
        
        {/* Logo in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src="/jckl-192.png" 
            alt="JCKL Academy Logo" 
            className="w-16 h-16 rounded-xl"
          />
        </div>
      </div>
      
      {/* Loading text */}
      <p className="mt-6 text-gray-600 font-medium animate-pulse">
        Loading...
      </p>
    </div>
  );
}
