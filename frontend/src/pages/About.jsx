import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Utensils, 
  Wallet, 
  Clock, 
  CheckCircle, 
  ShoppingBag, 
  TrendingUp,
  Users,
  Mail,
  MapPin,
  Phone
} from "lucide-react";

function SiteHeader() {
  const navigate = useNavigate();
  return (
    <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-gray-900 text-lg">
          Jesus Christ King of Kings and Lord of Lords Academy Inc.
        </div>
        <nav>
          <ul className="flex items-center space-x-8">
            <li>
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1"
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
              >
                Register
              </Link>
            </li>
            <li>
              <button
                onClick={() => navigate("/login")}
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
          <div className="font-bold text-xl text-white">
            Food Reservation & Allowance System
          </div>
        </div>
        <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
          Empowering students with modern technology for a better dining experience.
        </p>
        <div className="text-gray-500 text-sm">
          © 2025 JCKL Food Reservation System. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <SiteHeader />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-extrabold mb-6">About Our System</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Transforming the dining experience at JCKL Academy through
              innovation, efficiency, and student-first design.
            </p>
          </div>
        </section>

        {/* About the School */}
        <section className="py-16 max-w-6xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-lg p-10 border border-gray-100">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                About JCKL Academy
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Jesus Christ King of Kings and Lord of Lords Academy Inc. is a
                Christian educational institution committed to providing
                quality education grounded in biblical principles and academic
                excellence. Our school nurtures students spiritually,
                academically, and socially to become future leaders who honor
                God and serve their communities.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Our Vision
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  To be a leading Christ-centered institution that develops
                  well-rounded individuals equipped with knowledge, character,
                  and faith to make a positive impact in society.
                </p>
              </div>

              <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Our Mission
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  To provide holistic Christian education that cultivates
                  academic excellence, moral integrity, and spiritual growth,
                  empowering students to become responsible citizens and
                  faithful servants of God.
                </p>
              </div>
            </div>

            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Core Values
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-gray-700">
                <div>
                  <span className="font-semibold text-blue-600">Faith:</span>{" "}
                  Grounded in biblical teachings
                </div>
                <div>
                  <span className="font-semibold text-blue-600">Excellence:</span>{" "}
                  Pursuing the highest standards
                </div>
                <div>
                  <span className="font-semibold text-blue-600">Integrity:</span>{" "}
                  Living with honesty and honor
                </div>
                <div>
                  <span className="font-semibold text-blue-600">Service:</span>{" "}
                  Contributing to community welfare
                </div>
                <div>
                  <span className="font-semibold text-blue-600">Compassion:</span>{" "}
                  Caring for others with love
                </div>
                <div>
                  <span className="font-semibold text-blue-600">Discipline:</span>{" "}
                  Committed to personal growth
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About the System */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                About This System
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                The Food Reservation & Allowance System was developed to
                modernize the cafeteria experience and support our school's
                commitment to efficiency, student welfare, and responsible
                financial management.
              </p>
            </div>
          </div>
        </section>

        {/* Why We Built This */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Why We Built This System
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <Users className="w-6 h-6 text-blue-600" />
                  For Students
                </h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>No more waiting in long cafeteria lines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Cashless, secure digital wallet system</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Pre-order meals and skip the rush</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Track spending and manage allowance easily</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-xl border border-green-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  For The School
                </h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Better inventory management and forecasting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Reduced food waste through accurate ordering</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Real-time sales reports and analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Streamlined cafeteria operations</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-7 h-7 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-2">Step 1</div>
              <h3 className="font-bold text-gray-900 mb-2">Top Up Wallet</h3>
              <p className="text-sm text-gray-600">
                Load your digital wallet with cash through the admin office
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-7 h-7 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600 mb-2">Step 2</div>
              <h3 className="font-bold text-gray-900 mb-2">Browse Menu</h3>
              <p className="text-sm text-gray-600">
                View daily menu items with prices and availability
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-7 h-7 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600 mb-2">Step 3</div>
              <h3 className="font-bold text-gray-900 mb-2">Place Order</h3>
              <p className="text-sm text-gray-600">
                Reserve your meal and pay using your wallet balance
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-600 mb-2">Step 4</div>
              <h3 className="font-bold text-gray-900 mb-2">Pick Up</h3>
              <p className="text-sm text-gray-600">
                Collect your order at the designated pickup time
              </p>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Key Features
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <Wallet className="w-10 h-10 text-blue-600 mb-4" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Digital Wallet System
                </h3>
                <p className="text-gray-600 text-sm">
                  Secure cashless payments with real-time balance tracking and
                  transaction history
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <Utensils className="w-10 h-10 text-green-600 mb-4" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Daily Menu Updates
                </h3>
                <p className="text-gray-600 text-sm">
                  Browse fresh menu items updated daily with accurate pricing and
                  availability
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <TrendingUp className="w-10 h-10 text-purple-600 mb-4" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Real-Time Inventory
                </h3>
                <p className="text-gray-600 text-sm">
                  Live stock tracking ensures you know what's available before
                  ordering
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <Clock className="w-10 h-10 text-orange-600 mb-4" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Order Tracking
                </h3>
                <p className="text-gray-600 text-sm">
                  Monitor your reservation status from placement to pickup
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <ShoppingBag className="w-10 h-10 text-indigo-600 mb-4" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Transaction History
                </h3>
                <p className="text-gray-600 text-sm">
                  Complete record of all purchases and wallet top-ups for easy
                  tracking
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <Users className="w-10 h-10 text-pink-600 mb-4" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Admin Dashboard
                </h3>
                <p className="text-gray-600 text-sm">
                  Comprehensive management tools for staff to handle orders,
                  inventory, and reports
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Contact & Support
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Cafeteria Hours
                </h3>
                <div className="space-y-3 text-gray-700">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span>
                      <strong>Breakfast:</strong> 7:00 AM - 8:30 AM
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span>
                      <strong>Lunch:</strong> 11:30 AM - 1:30 PM
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span>
                      <strong>Snacks:</strong> 3:00 PM - 4:00 PM
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Get In Touch
                </h3>
                <div className="space-y-4 text-gray-700">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>
                      Jesus Christ King of Kings and Lord of Lords Academy Inc.
                      <br />
                      School Cafeteria, Ground Floor
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span>cafeteria@jckl.edu.ph</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span>Local Extension: 1234</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
              <p className="text-gray-700">
                <strong>Need Help?</strong> Contact the school administration
                office or speak with cafeteria staff for assistance with the
                system, wallet top-ups, or any technical issues.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700">
          <div className="max-w-4xl mx-auto px-6 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Join hundreds of students already enjoying a better cafeteria
              experience
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/register"
                className="px-8 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors duration-200"
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-400 transition-colors duration-200 border-2 border-white"
              >
                Log In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
