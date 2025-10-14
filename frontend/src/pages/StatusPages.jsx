import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Button from "../components/Button";

// Both pages follow the same header/footer style used in Login/Register

function SiteHeader() {
  const navigate = useNavigate();
  return (
    <header className="w-full bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-gray-900 text-lg">Jesus Christ King of Kings and Lord of Lords Academy Inc.</div>
        <nav>
          <ul className="flex items-center space-x-8">
            <li>
              <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">Home</Link>
            </li>
            <li>
              <Link to="/about" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">About Us</Link>
            </li>
            <li>
              <Link to="/register" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">Register</Link>
            </li>
            <li>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200"
              >
                Log In
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="py-12 bg-gray-900 mt-12">
      <div className="container mx-auto px-6 text-center">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">JCKL</span>
          </div>
          <div className="font-bold text-xl text-white">Food Reservation & Allowance System</div>
        </div>
        <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
          A capstone project designed to revolutionize the dining experience at Jesus Christ King of Kings and Lord of Lords Academy Inc.
        </p>
        <div className="text-gray-500 text-sm">© 2025 JCKL Food Reservation System. Developed by Das, Dela Cruz, Silva.</div>
      </div>
    </footer>
  );
}

export function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <SiteHeader />

      <main className="flex-grow flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl text-center">
          <div className="inline-flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-full text-sm font-medium mb-6">404 • Page not found</div>

          <h1 className="text-6xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">Whoops — we can’t find that page.</h1>

          <p className="text-lg text-gray-600 mb-8">
            The page you tried to access doesn’t exist or may have been moved. If you typed the URL directly, please check it for typos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/">
              <Button variant="primary" size="lg">Go to Homepage</Button>
            </Link>

            <Link to="/contact">
              <Button variant="ghost" size="lg">Contact Support</Button>
            </Link>
          </div>

          <div className="mt-10 text-sm text-gray-500">
            Or try searching from the menu above — if you think this is an error, please let us know.
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function Unauthorized() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    // pass the original location so login page can redirect back after success
    navigate('/login', { state: { from: location.pathname } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <SiteHeader />

      <main className="flex-grow flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="inline-flex items-center px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium mb-4">🔒 Unauthorized</div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">You need to sign in to continue</h2>

          <p className="text-gray-600 mb-6">
            This section of the site requires an account. Please sign in with your student or admin credentials to proceed.
          </p>

          <div className="flex gap-3 justify-center mb-4">
            <button onClick={handleLogin} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Log In</button>

            <Link to="/register" className="px-6 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition">Create Account</Link>
          </div>

          <div className="text-sm text-gray-500">
            If you believe you’re seeing this in error, contact an administrator or check that your account has the right permissions.
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

// default export for convenience when importing

export function Offline() {
  const retry = () => {
    // try a soft reload; if offline, this will not do much but it's a simple UX
    if (navigator && !navigator.onLine) {
      // give a tiny hint for PWA users
      alert('You appear to be offline — reconnect and try again.');
      return;
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <SiteHeader />

      <main className="flex-grow flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium mb-4">📶 Offline</div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">You’re offline — check your connection</h2>

          <p className="text-gray-600 mb-6">
            We couldn’t reach the server. If you were using a cached / offline-capable section, some information may still be available.
          </p>

          <div className="flex gap-3 justify-center mb-4">
            <button onClick={retry} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Retry</button>
            <Link to="/" className="px-6 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition">Go to Homepage</Link>
          </div>

          <div className="text-sm text-gray-500">
            Tip: enable offline caching in your browser or check your network settings. If the problem persists, contact support.
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function ServerError() {
  const retry = () => window.location.reload();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <SiteHeader />

      <main className="flex-grow flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium mb-4">500 • Server error</div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">Something went wrong on our end</h2>

          <p className="text-gray-600 mb-6">
            Our server encountered an unexpected condition. We’ve been notified and are working to fix it.
          </p>

          <div className="flex gap-3 justify-center mb-4">
            <button onClick={retry} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Retry</button>
            <Link to="/contact" className="px-6 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition">Contact Support</Link>
          </div>

          <div className="text-sm text-gray-500">If this keeps happening, please report the steps that led here so we can reproduce and fix the issue.</div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function SessionExpired() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <SiteHeader />

      <main className="flex-grow flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="inline-flex items-center px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium mb-4">⏰ Session expired</div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your session has expired</h2>

          <p className="text-gray-600 mb-6">For your security, we signed you out. Please sign in again to continue where you left off.</p>

          <div className="flex gap-3 justify-center mb-4">
            <button onClick={handleLogin} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Sign In</button>
            <Link to="/" className="px-6 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition">Return to Home</Link>
          </div>

          <div className="text-sm text-gray-500">If you keep seeing this, clear your browser cookies or contact support.</div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function Maintenance() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <SiteHeader />

      <main className="flex-grow flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium mb-4">🚧 Maintenance</div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">We’ll be back soon</h2>

          <p className="text-gray-600 mb-6">We’re performing scheduled maintenance to improve the system. Thanks for your patience — check back shortly.</p>

          <div className="flex gap-3 justify-center mb-4">
            <Link to="/" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Go to Homepage</Link>
            <Link to="/contact" className="px-6 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition">Contact Support</Link>
          </div>

          <div className="text-sm text-gray-500">If you need immediate assistance, contact the administrator or follow our status page for updates.</div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default NotFound;
