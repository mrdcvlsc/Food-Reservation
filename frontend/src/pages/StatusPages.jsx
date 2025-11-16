import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Button from "../components/Button";

// Both pages follow the same header/footer style used in Login/Register

function SiteHeader() {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    return (
        <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-3 sm:px-6">
                <div className="h-14 sm:h-16 flex items-center justify-between">
                    {/* Logo and Brand */}
                    <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
                        <img src="/jckl-192.png" alt="JCKL" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0" />
                        <div className="min-w-0">
                            <span className="hidden xl:inline text-base sm:text-lg font-bold text-gray-900">
                                Jesus Christ King of Kings and Lord of Lords Academy Inc.
                            </span>
                            <span className="hidden md:inline xl:hidden text-base font-bold text-gray-900 truncate max-w-[400px]">
                                Jesus Christ King of Kings and Lord of Lords Academy Inc.
                            </span>
                            <span className="md:hidden text-sm font-bold text-gray-900">JCKL Academy</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:block">
                        <ul className="flex items-center space-x-6">
                            <li>
                                <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">Home</Link>
                            </li>
                            <li>
                                <Link to="/about" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">About Us</Link>
                            </li>
                            <li>
                                <Link to="/register" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">Register</Link>
                            </li>
                            <li>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200"
                                >
                                    Log In
                                </button>
                            </li>
                        </ul>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="lg:hidden border-t border-gray-200 py-3 space-y-2">
                        <Link
                            to="/"
                            className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Home
                        </Link>
                        <Link
                            to="/about"
                            className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            About Us
                        </Link>
                        <Link
                            to="/register"
                            className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Register
                        </Link>
                        <button
                            onClick={() => {
                                setMobileMenuOpen(false);
                                navigate('/login');
                            }}
                            className="w-full text-left px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                        >
                            Log In
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}

function SiteFooter() {
    return (
        <footer className="py-6 sm:py-12 bg-gray-900 mt-6 sm:mt-12">
            <div className="container mx-auto px-3 sm:px-6 text-center">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs sm:text-sm">JCKL</span>
                    </div>
                    <div className="font-bold text-sm sm:text-xl text-white">Food Reservation & Allowance System</div>
                </div>
                <p className="text-gray-400 mb-4 sm:mb-6 max-w-2xl mx-auto text-xs sm:text-base">
                    A capstone project designed to revolutionize the dining experience at Jesus Christ King of Kings and Lord of Lords Academy Inc.
                </p>
                <div className="text-gray-500 text-xs sm:text-sm">© 2025 JCKL Food Reservation System. Developed by Das, Dela Cruz, Silva.</div>
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

export function Forbidden() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
            <SiteHeader />
            <main className="flex-grow flex items-center justify-center px-6 py-20">
                <div className="max-w-3xl text-center bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                    <div className="inline-flex items-center px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-sm font-medium mb-4">403 • Forbidden</div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">You don’t have permission to access this page</h2>
                    <p className="text-gray-600 mb-6">
                        Your account doesn't have the required permissions to view this resource. If you believe you should have access, request permission or contact an administrator.
                    </p>

                    <div className="flex gap-3 justify-center mb-4">
                        <button onClick={() => navigate(-1)} className="px-6 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition">Go Back</button>
                        <Link to="/contact" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Contact Support</Link>
                        <Link to="/request-access" className="px-6 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition">Request Access</Link>
                    </div>
                    <div className="text-sm text-gray-500">If you need admin access, include your full name and student ID in your request.</div>
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}

export function SomethingWentWrong() {
    const retry = () => window.location.reload();
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
            <SiteHeader />
            <main className="flex-grow flex items-center justify-center px-3 sm:px-6 py-10 sm:py-20">
                <div className="max-w-3xl text-center bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100">
                    <div className="inline-flex items-center px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs sm:text-sm font-medium mb-3 sm:mb-4">Oops</div>

                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Oops — something went wrong</h2>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                        An unexpected error occurred. Try refreshing the page or contact support if the problem persists.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                        <button onClick={retry} className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition">Refresh</button>
                        <Link to="/" className="px-6 py-2 border border-gray-200 text-sm rounded-lg font-medium hover:bg-gray-50 transition">Go to Homepage</Link>
                        <Link to="/contact" className="px-6 py-2 border border-gray-200 text-sm rounded-lg font-medium hover:bg-gray-50 transition">Contact Support</Link>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">If this keeps happening, please include steps to reproduce and any screenshots when you contact support.</div>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}

export default NotFound;
