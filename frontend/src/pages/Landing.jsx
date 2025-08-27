import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Add this import

// Mock Button component
const Button = ({ children, variant = "primary", size = "md", className = "", ...props }) => {
  const baseClasses = "font-medium rounded-lg transition-all duration-200 focus:ring-4 focus:outline-none";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300 shadow-lg hover:shadow-xl",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 hover:text-blue-600 border border-gray-300",
  };
  const sizes = {
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base",
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Mock Card component
const Card = ({ children, title, className = "" }) => {
  return (
    <div className={`bg-white rounded-2xl p-6 ${className}`}>
      {title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  );
};

export default function Landing() {
  const [activeNav, setActiveNav] = useState('home');
  const navigate = useNavigate(); // Add this line

  const handleNavClick = (nav) => {
    setActiveNav(nav);
    if (nav === 'register') {
      navigate('/register');
    }
    // You can add navigation for 'home' and 'about' if needed
  };

  // Button handlers
  const handleCreateAccount = () => navigate("/register");
  const handleViewMenu = () => navigate("/menu");
  const handleStudentLogin = () => navigate("/login");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* MODERN HEADER */}
      <header className="bg-white/80 backdrop-blur-md py-4 shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">JCKL</span>
            </div>
            <div className="font-bold text-xl text-gray-900">
              Jesus Christ King of Kings Academy
            </div>
          </div>
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              <li>
                <button
                  onClick={() => handleNavClick('home')}
                  className={
                    activeNav === 'home'
                      ? "font-semibold text-blue-600 border-b-2 border-blue-600 pb-1" 
                      : "text-gray-600 hover:text-blue-600 transition-colors duration-200"
                  }
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('about')}
                  className={
                    activeNav === 'about'
                      ? "font-semibold text-blue-600 border-b-2 border-blue-600 pb-1" 
                      : "text-gray-600 hover:text-blue-600 transition-colors duration-200"
                  }
                >
                  About System
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('register')}
                  className={
                    activeNav === 'register'
                      ? "font-semibold text-blue-600 border-b-2 border-blue-600 pb-1" 
                      : "text-gray-600 hover:text-blue-600 transition-colors duration-200"
                  }
                >
                  Register
                </button>
              </li>
            </ul>
          </nav>
          <Button variant="ghost" className="font-medium" onClick={handleStudentLogin}>
            Student Login
          </Button>
        </div>
      </header>

      {/* MODERN HERO SECTION */}
      <section className="flex-grow flex items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5"></div>
        <div className="container mx-auto px-6 text-center py-24 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
              🍽️ Revolutionizing School Dining Since 1993
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent leading-tight">
              Food Reservation & Allowance System
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Streamlining meal purchases for students, parents, and staff at Jesus Christ King of Kings 
              Academy through our innovative cashless reservation platform. No more long queues, 
              no more missed classes, just efficient dining experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                variant="primary" 
                size="lg" 
                className="px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                onClick={handleCreateAccount}
              >
                Create Account
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="px-8 py-4 text-lg font-medium"
                onClick={handleViewMenu}
              >
                View Menu →
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </section>

      {/* PROBLEM SOLUTION SECTION */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Solving Real School Canteen Problems
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Our research identified key issues affecting 700-1000 students daily. Here's how we're addressing them.
            </p>
          </div>
          
          <div className="grid gap-8 grid-cols-1 md:grid-cols-3 max-w-7xl mx-auto">
            <Card className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-red-50/30">
              <div className="relative overflow-hidden rounded-2xl mb-6">
                <img
                  src="https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Long Queue Problem"
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div className="absolute top-4 left-4 bg-red-100 px-3 py-1 rounded-full text-sm font-medium text-red-600">
                  ❌ Problem
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Long Queue Times</h3>
              <p className="text-gray-600 leading-relaxed">
                Students spend entire break times waiting in overcrowded canteen lines, causing late returns 
                to class and disrupting the academic schedule across all grade levels.
              </p>
            </Card>

            <Card className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/30">
              <div className="relative overflow-hidden rounded-2xl mb-6">
                <img
                  src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Cash Management Issues"
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div className="absolute top-4 left-4 bg-orange-100 px-3 py-1 rounded-full text-sm font-medium text-orange-600">
                  💰 Challenge
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Cash Management Issues</h3>
              <p className="text-gray-600 leading-relaxed">
                Younger students struggle with physical cash handling, leading to money mismanagement, 
                while parents find it difficult to monitor their children's spending habits.
              </p>
            </Card>

            <Card className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-green-50/30">
              <div className="relative overflow-hidden rounded-2xl mb-6">
                <img
                  src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Food Reservation Solution"
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div className="absolute top-4 left-4 bg-green-100 px-3 py-1 rounded-full text-sm font-medium text-green-600">
                  ✅ Solution
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Reservation System</h3>
              <p className="text-gray-600 leading-relaxed">
                Pre-order meals through our cashless platform with GCash/Maya integration, 
                ensuring meal availability and reducing wait times during scheduled break periods.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* BREAK TIME SCHEDULES */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Optimized for JCKL Break Schedules
            </h2>
            <p className="text-lg text-gray-600">
              Our system works seamlessly with your existing break time intervals
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-600 font-bold">PK</span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Pre-Elementary</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>9:00 - 9:15 AM</div>
                  <div>10:30 - 11:00 AM</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold">1-6</span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Elementary</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>9:15 - 9:30 AM</div>
                  <div>11:00 AM - 12:00 NN</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 font-bold">JHS</span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Junior High</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>9:30 - 9:45 AM</div>
                  <div>1:00 - 1:20 PM</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-orange-600 font-bold">SHS</span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Senior High</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>9:45 - 10:00 AM</div>
                  <div>1:20 - 1:40 PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SYSTEM FEATURES */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Key System Features
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Built specifically for the needs of JCKL students, parents, and canteen staff
            </p>
          </div>
          
          <div className="grid gap-12 grid-cols-1 lg:grid-cols-2 max-w-6xl mx-auto">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-xl">💳</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">E-Wallet Integration</h3>
                  <p className="text-gray-600">Secure top-ups through GCash and Maya with manual verification by canteen staff to ensure transaction accuracy.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 text-xl">📱</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">QR Code Payments</h3>
                  <p className="text-gray-600">Quick and easy balance top-ups using QR code scanning for seamless fund transfers.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 text-xl">📋</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Pre-Order System</h3>
                  <p className="text-gray-600">Reserve meals in advance for pickup during break times, eliminating the need to arrive early at school.</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-600 text-xl">👨‍👩‍👧‍👦</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Parent Monitoring</h3>
                  <p className="text-gray-600">Parents can track spending, set limits, and manage allowances for their children's canteen purchases.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-xl">🔒</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Secure Database</h3>
                  <p className="text-gray-600">All transactions, balances, and user information stored securely in a centralized database system.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-yellow-600 text-xl">📊</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Order Management</h3>
                  <p className="text-gray-600">Streamlined order tracking and menu management for the 5-person canteen staff team.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCHOOL STATS SECTION */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="container mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Serving the JCKL Community
            </h2>
            <p className="text-blue-100">Founded in 1993, continuing to innovate for our students</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">700-1000</div>
              <div className="text-blue-100">Students Served</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">32+</div>
              <div className="text-blue-100">Years of Excellence</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5</div>
              <div className="text-blue-100">Dedicated Canteen Staff</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4</div>
              <div className="text-blue-100">Break Time Schedules</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-gray-900">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">JCKL</span>
            </div>
            <div className="font-bold text-xl text-white">
              Food Reservation & Allowance System
            </div>
          </div>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            A capstone project designed to revolutionize the dining experience at 
            Jesus Christ King of Kings and Lord of Lords Academy Inc.
          </p>
          <div className="text-gray-500 text-sm">
            © 2025 JCKL Food Reservation System. Developed by Das, Dela Cruz, Silva.
          </div>
        </div>
      </footer>
    </div>
  );
}