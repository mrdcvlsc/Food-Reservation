// src/pages/BreakPolicy.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function BreakPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-md py-4 shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6">
          <Link to="/" className="flex items-center space-x-3" aria-label="JCKL Food Reservation Home">
            <div 
              className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-white font-bold text-sm">JCKL</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Break Time Policy</span>
          </Link>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">JCKL Break Time & Order Pickup Policy</h1>
        
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Schedule Overview</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-bold text-lg text-gray-900">Pre-Elementary (PK)</h3>
              <p className="text-gray-700">Snack: 9:00 - 9:15 AM | Lunch: 10:30 - 11:00 AM</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-bold text-lg text-gray-900">Elementary (Grades 1-6)</h3>
              <p className="text-gray-700">Recess: 9:15 - 9:30 AM | Lunch: 11:00 AM - 12:00 NN</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-bold text-lg text-gray-900">Junior High School (JHS)</h3>
              <p className="text-gray-700">Recess: 9:30 - 9:45 AM | Lunch: 1:00 - 1:20 PM</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-bold text-lg text-gray-900">Senior High School (SHS)</h3>
              <p className="text-gray-700">Recess: 9:45 - 10:00 AM | Lunch: 1:20 - 1:40 PM</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-amber-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Important Pickup Rules
          </h2>
          <ul className="space-y-3 text-gray-800">
            <li className="flex items-start gap-2">
              <span className="font-bold text-amber-700">•</span>
              <span>Orders can <strong>only be claimed during your designated time slot</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-amber-700">•</span>
              <span>You must present your <strong>QR code</strong> at the canteen counter for verification.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-amber-700">•</span>
              <span>Orders not picked up during the assigned slot may be <strong>forfeited</strong> to prevent food waste.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-amber-700">•</span>
              <span>Pre-order at least <strong>30 minutes before</strong> your break time for preparation.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Benefits of the System</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>No waiting in line</strong> – skip the queue and maximize your break time</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Guaranteed meal availability</strong> – your food is reserved when you order</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Cashless convenience</strong> – no need to bring physical money to school</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Parental monitoring</strong> – parents can track spending and set limits</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>Reduced food waste</strong> – accurate forecasting prevents over-preparation</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
