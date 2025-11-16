import React, { Suspense, lazy, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

// Lazy load non-critical sections
const LazyFAQ = lazy(() => import("../components/FAQ").catch(() => ({ default: () => null })));
const LazyTestimonials = lazy(() => import("../components/Testimonials").catch(() => ({ default: () => null })));

// Accessible, reusable Button with improved contrast
const Button = React.forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      className = "",
      isLoading = false,
      ...props
    },
    ref
  ) => {
    const base =
      "font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
    const variants = {
      primary:
        "bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-500 shadow-lg hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:transform-none",
      ghost:
        "bg-transparent hover:bg-gray-100 text-gray-800 hover:text-blue-700 border border-gray-400 focus-visible:ring-gray-500 motion-reduce:transition-none",
    };
    const sizes = { md: "px-6 py-2.5 text-sm", lg: "px-8 py-3.5 text-base" };

    return (
      <button
        ref={ref}
        type="button"
        aria-busy={isLoading || undefined}
        disabled={props.disabled || isLoading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? "Loading…" : children}
      </button>
    );
  }
);
Button.displayName = "Button";

// Simple Card wrapper
const Card = ({ children, title, className = "" }) => (
  <div className={`bg-white rounded-2xl p-6 ${className}`}>
    {title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}
    {children}
  </div>
);

// Data (maps remove repetition)
const problems = [
  {
    tag: "❌ Problem",
    tagClass: "bg-red-100 text-red-700",
    title: "Long Queue Times",
    img:
      "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    alt: "Students waiting in long overcrowded canteen queue during break time",
    copy:
      "Students spend entire break times waiting in overcrowded canteen lines, causing late returns to class and disrupting the academic schedule across all grade levels.",
    gradient: "from-white to-red-50/30",
  },
  {
    tag: "💰 Challenge",
    tagClass: "bg-orange-100 text-orange-700",
    title: "Cash Management Issues",
    img:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    alt: "Philippine peso bills and coins illustrating cash handling complexity for students",
    copy:
      "Younger students struggle with physical cash handling, leading to money mismanagement, while parents find it difficult to monitor their children's spending habits.",
    gradient: "from-white to-orange-50/30",
  },
  {
    tag: "🗑️ Waste",
    tagClass: "bg-amber-100 text-amber-700",
    title: "Food Wastage Crisis",
    img:
      "https://images.unsplash.com/photo-1628863353691-0071c8c1874c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    alt: "Discarded food showing common canteen waste problem",
    copy:
      "Unpredictable demand leads to over-preparation and significant food waste, while popular items frequently run out, disappointing students and wasting resources.",
    gradient: "from-white to-amber-50/30",
  },
  {
    tag: "✅ Solution",
    tagClass: "bg-green-100 text-green-700",
    title: "Smart Reservation System",
    img:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    alt: "Organized food trays ready for pickup showing efficient pre-order system",
    copy:
      "Pre-order meals through our cashless platform with GCash/Maya integration, enabling accurate demand forecasting, reducing waste, ensuring meal availability, and eliminating wait times.",
    gradient: "from-white to-green-50/30",
  },
];

const featuresLeft = [
  {
    icon: "💳",
    title: "E-Wallet Integration",
    copy:
      "Secure top-ups through GCash and Maya with manual verification by canteen staff to ensure transaction accuracy.",
    bg: "bg-blue-100",
    txt: "text-blue-700",
  },
  {
    icon: "📱",
    title: "QR Code Payments",
    copy:
      "Quick and easy balance top-ups using QR code scanning for seamless fund transfers.",
    bg: "bg-green-100",
    txt: "text-green-700",
  },
  {
    icon: "📋",
    title: "Pre-Order System",
    copy:
      "Reserve meals in advance for pickup during break times, eliminating the need to arrive early at school.",
    bg: "bg-purple-100",
    txt: "text-purple-700",
  },
  {
    icon: "🎫",
    title: "Order Code QR",
    copy:
      "Each order generates a unique QR code for quick, contactless verification and pickup at the canteen counter.",
    bg: "bg-indigo-100",
    txt: "text-indigo-700",
  },
];

const featuresRight = [
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Parental Monitoring",
    copy:
      "Parents can track spending history, view transaction details, and receive notifications for all purchases.",
    bg: "bg-orange-100",
    txt: "text-orange-700",
  },
  {
    icon: "🛡️",
    title: "Spending Limits",
    copy:
      "Set daily or weekly spending caps and restrict specific food categories to promote healthy eating habits.",
    bg: "bg-rose-100",
    txt: "text-rose-700",
  },
  {
    icon: "🔒",
    title: "Secure Database",
    copy:
      "All transactions, balances, and user information stored securely in a centralized database system.",
    bg: "bg-red-100",
    txt: "text-red-700",
  },
  {
    icon: "📊",
    title: "Order Management",
    copy:
      "Streamlined order tracking and menu management for the 5-person canteen staff team.",
    bg: "bg-yellow-100",
    txt: "text-yellow-700",
  },
];

const schedules = [
  {
    key: "PK",
    name: "Pre-Elementary",
    times: ["9:00 - 9:15 AM", "10:30 - 11:00 AM"],
    bg: "bg-purple-100",
    txt: "text-purple-700",
    badge: "bg-purple-50 text-purple-700",
  },
  {
    key: "1-6",
    name: "Elementary",
    times: ["9:15 - 9:30 AM", "11:00 AM - 12:00 NN"],
    bg: "bg-blue-100",
    txt: "text-blue-700",
    badge: "bg-blue-50 text-blue-700",
  },
  {
    key: "JHS",
    name: "Junior High",
    times: ["9:30 - 9:45 AM", "1:00 - 1:20 PM"],
    bg: "bg-green-100",
    txt: "text-green-700",
    badge: "bg-green-50 text-green-700",
  },
  {
    key: "SHS",
    name: "Senior High",
    times: ["9:45 - 10:00 AM", "1:20 - 1:40 PM"],
    bg: "bg-orange-100",
    txt: "text-orange-700",
    badge: "bg-orange-50 text-orange-700",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prefetch critical routes on hover/idle
  React.useEffect(() => {
    const prefetchRoutes = () => {
      // Prefetch register and menu pages
      const link1 = document.createElement("link");
      link1.rel = "prefetch";
      link1.href = "/register";
      document.head.appendChild(link1);

      const link2 = document.createElement("link");
      link2.rel = "prefetch";
      link2.href = "/menu";
      document.head.appendChild(link2);
    };

    // Prefetch on idle
    if ("requestIdleCallback" in window) {
      requestIdleCallback(prefetchRoutes);
    } else {
      setTimeout(prefetchRoutes, 1000);
    }
  }, []);

  // Button handlers
  const handleCreateAccount = () => navigate("/register");
  const handleViewMenu = () => navigate("/menu");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Skip link for keyboard users */}
      <a href="#main" className="sr-only focus:not-sr-only focus:block focus:p-3 focus:bg-white focus:shadow rounded-md m-2">
        Skip to content
      </a>

      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md py-3 sm:py-4 shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-2 sm:px-4 lg:px-6 gap-2">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink" aria-label="JCKL Food Reservation Home">
            <img 
              src="/jckl-192.png" 
              alt="JCKL Academy Logo" 
              className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl shadow-md flex-shrink-0"
            />
            <span className="font-bold text-gray-900 min-w-0">
              <span className="hidden xl:inline text-xl">Jesus Christ King of Kings Academy</span>
              <span className="hidden md:inline xl:hidden text-base truncate max-w-[300px]">Jesus Christ King of Kings Academy</span>
              <span className="md:hidden text-sm truncate">JCKL Academy</span>
            </span>
          </Link>

          <nav className="hidden md:block" aria-label="Primary navigation">
            <ul className="flex space-x-8">
              <li>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    isActive
                      ? "font-semibold text-blue-600 border-b-2 border-blue-600 pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
                      : "text-gray-700 hover:text-blue-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded motion-reduce:transition-none"
                  }
                  aria-current={({ isActive }) => (isActive ? "page" : undefined)}
                >
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    isActive
                      ? "font-semibold text-blue-600 border-b-2 border-blue-600 pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
                      : "text-gray-700 hover:text-blue-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded motion-reduce:transition-none"
                  }
                  aria-current={({ isActive }) => (isActive ? "page" : undefined)}
                >
                  About System
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    isActive
                      ? "font-semibold text-blue-600 border-b-2 border-blue-600 pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
                      : "text-gray-700 hover:text-blue-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded motion-reduce:transition-none"
                  }
                  aria-current={({ isActive }) => (isActive ? "page" : undefined)}
                >
                  Register
                </NavLink>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/login" className="hidden sm:inline-block">
              <Button variant="ghost" className="font-medium text-sm sm:text-base px-3 sm:px-4">Student Login</Button>
            </Link>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="px-4 py-3 space-y-2">
              <Link
                to="/"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/about"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/register"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Register
              </Link>
              <Link
                to="/login"
                className="block px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Student Login
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <main id="main" className="flex-grow flex items-center relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5"
          aria-hidden="true"
        ></div>

        <div className="container mx-auto px-6 text-center py-24 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
              🍽️ Revolutionizing School Dining Since 1993
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent leading-tight">
              Skip the Queue, Enjoy Your Break
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-3xl mx-auto leading-relaxed">
              Pre-order meals, pay cashlessly, and pick up during your scheduled break—no more waiting, no more missed recess time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                variant="primary"
                size="lg"
                className="px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 motion-reduce:transform-none motion-reduce:hover:transform-none"
                onClick={handleCreateAccount}
                onMouseEnter={() => {
                  // Prefetch on hover for faster navigation
                  const link = document.createElement("link");
                  link.rel = "prefetch";
                  link.href = "/register";
                  if (!document.querySelector('link[href="/register"]')) {
                    document.head.appendChild(link);
                  }
                }}
              >
                Create Account
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="px-8 py-4 text-lg font-medium"
                onClick={handleViewMenu}
                onMouseEnter={() => {
                  const link = document.createElement("link");
                  link.rel = "prefetch";
                  link.href = "/menu";
                  if (!document.querySelector('link[href="/menu"]')) {
                    document.head.appendChild(link);
                  }
                }}
              >
                View Menu →
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div
          className="absolute top-20 right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        ></div>
        <div
          className="absolute bottom-20 left-20 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000 motion-reduce:animate-none"
          aria-hidden="true"
        ></div>
      </main>

      {/* PROBLEM / SOLUTION */}
      <section className="py-20 bg-white" aria-labelledby="problems-heading">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 id="problems-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Solving Real School Canteen Problems
            </h2>
            <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
              Our research identified key issues affecting 700-1000 students daily. Here's how we're addressing them.
            </p>
          </div>

          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
            {problems.map((p) => (
              <Card
                key={p.title}
                className={`group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:transform-none border-0 shadow-lg bg-gradient-to-br ${p.gradient}`}
              >
                <div className="relative overflow-hidden rounded-2xl mb-6">
                  <img
                    src={p.img}
                    alt={p.alt}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none motion-reduce:hover:scale-100"
                    loading="lazy"
                    width={800}
                    height={192}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" aria-hidden="true"></div>
                  <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-medium ${p.tagClass}`}>
                    {p.tag}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{p.title}</h3>
                <p className="text-gray-700 leading-relaxed">{p.copy}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEDULES */}
      <section className="py-16 bg-gray-50" aria-labelledby="schedules-heading">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 id="schedules-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Optimized for JCKL Break Schedules
            </h2>
            <p className="text-lg text-gray-700 mb-2">
              Our system works seamlessly with your existing break time intervals
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 rounded-lg text-sm font-medium border border-amber-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Orders are only claimable during your designated time slot</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-8">
            {schedules.map((s) => (
              <div 
                key={s.key} 
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 motion-reduce:transition-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
              >
                <div className="text-center">
                  <div className={`w-12 h-12 ${s.bg} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                    <span className={`${s.txt} font-bold`}>{s.key}</span>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{s.name}</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    {s.times.map((t) => (
                      <div key={t}>{t}</div>
                    ))}
                  </div>
                  <div className={`mt-3 inline-block px-2 py-1 ${s.badge} rounded text-xs font-medium`}>
                    Slot {s.key}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link 
              to="/break-policy" 
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded px-2 py-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>View full break-time policy</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-white" aria-labelledby="features-heading">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Key System Features
            </h2>
            <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
              Built specifically for the needs of JCKL students, parents, and canteen staff
            </p>
          </div>

          <div className="grid gap-12 grid-cols-1 lg:grid-cols-2 max-w-6xl mx-auto">
            <div className="space-y-8">
              {featuresLeft.map((f) => (
                <div 
                  key={f.title} 
                  className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 motion-reduce:transition-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
                >
                  <div 
                    className={`w-12 h-12 ${f.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                    aria-hidden="true"
                  >
                    <span className={`${f.txt} text-xl`}>{f.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-gray-700">{f.copy}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-8">
              {featuresRight.map((f) => (
                <div 
                  key={f.title} 
                  className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 motion-reduce:transition-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
                >
                  <div 
                    className={`w-12 h-12 ${f.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                    aria-hidden="true"
                  >
                    <span className={`${f.txt} text-xl`}>{f.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-gray-700">{f.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700" aria-labelledby="stats-heading">
        <div className="container mx-auto px-6">
          <div className="text-center mb-8">
            <h2 id="stats-heading" className="text-3xl font-bold text-white mb-2">
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
      <footer className="py-12 bg-gray-900" role="contentinfo">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <img 
              src="/jckl-192.png" 
              alt="JCKL Academy Logo" 
              className="w-10 h-10 rounded-xl shadow-md"
            />
            <div className="font-bold text-xl text-white">Food Reservation & Allowance System</div>
          </div>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            A capstone project designed to revolutionize the dining experience at Jesus Christ King of Kings and Lord of Lords Academy Inc.
          </p>
          <div className="text-gray-500 text-sm">
            © 2025 JCKL Food Reservation System. Developed by Das, Dela Cruz, Silva.
          </div>
        </div>
      </footer>

      {/* Lazy loaded sections */}
      <Suspense fallback={<div className="py-8 text-center text-gray-500">Loading...</div>}>
        <LazyFAQ />
        <LazyTestimonials />
      </Suspense>
    </div>
  );
}
