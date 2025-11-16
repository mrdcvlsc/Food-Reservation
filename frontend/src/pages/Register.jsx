// src/pages/Register.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../components/Input";
import Button from "../components/Button";
import { api, ApiError } from "../lib/api";
import { refreshSessionForPublic } from "../lib/auth";
import { setUserToStorage, setTokenToStorage } from "../lib/storage";
import { Menu, X } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      await refreshSessionForPublic({ navigate });
    })();
  }, [navigate]);

  const [form, setForm] = useState({
    name: "",
    studentId: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.studentId.trim()) errs.studentId = "Student ID is required";
    else if (!/^\d+$/.test(String(form.studentId).trim()))
      errs.studentId = "Student ID must contain digits only";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email";

    if (!form.phone.trim()) errs.phone = "Contact number is required";
    else if (!/^[\d+\-\s\(\)]+$/.test(form.phone.trim()))
      errs.phone = "Invalid contact number";

    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8)
      errs.password = "Must be at least 8 characters";
    if (!form.confirm) errs.confirm = "Please confirm password";
    else if (form.confirm !== form.password)
      errs.confirm = "Passwords do not match";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setIsLoading(true);

    try {
      await api.post("/auth/register", {
        name: form.name.trim(),
        studentId: form.studentId.trim(),
        email: form.email.trim(),
        password: form.password,
        grade: "",
        section: "",
        phone: form.phone.trim(),
      });

      const data = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      setTokenToStorage(data.token);
      setUserToStorage(data.user);

      setIsLoading(false);
      navigate("/dashboard", { replace: true });
      return;
    } catch (err) {
      setIsLoading(false);
      if (err instanceof ApiError) {
        const status = err.status;
        const serverMsg =
          (err?.response && err.response.data && err.response.data.error) ||
          (err?.data && err.data.error) ||
          err.message ||
          "";
        if (status === ApiError.Conflict) {
          setErrors({
            email: "Email already registered. Please log in instead.",
          });
          return;
        }
        if (status === 400) {
          if (/studentid/i.test(serverMsg) || /student id/i.test(serverMsg)) {
            setErrors({ studentId: serverMsg });
          } else {
            setErrors({ email: serverMsg || "Invalid registration data" });
          }
          return;
        }
        switch (status) {
          case ApiError.Maintenance:
            navigate("/status/maintenance", { replace: true });
            break;
          case ApiError.ServerError:
            navigate("/status/server_error", { replace: true });
            break;
          default:
            navigate("/status/something_went_wrong");
        }
        return;
      }

      setErrors({ email: "Email already registered. Please log in instead." });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* HEADER */}
      <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0 flex-shrink">
            <img 
              src="/jckl-192.png" 
              alt="JCKL Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0"
            />
            <div className="font-bold text-gray-900 min-w-0">
              <span className="hidden xl:inline text-lg">Jesus Christ King of Kings and Lord of Lords Academy Inc.</span>
              <span className="hidden md:inline xl:hidden text-base truncate max-w-[400px]">Jesus Christ King of Kings and Lord of Lords Academy Inc.</span>
              <span className="md:hidden text-sm truncate">JCKL Academy</span>
            </div>
          </Link>
          <nav className="flex-shrink-0">
            <ul className="flex items-center gap-2 sm:gap-4 lg:gap-8">
              <li className="hidden lg:block">
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
                >
                  Home
                </Link>
              </li>
              <li className="hidden lg:block">
                <Link
                  to="/about"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
                >
                  About Us
                </Link>
              </li>
              <li className="hidden sm:block">
                <Link
                  to="/register"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 text-sm sm:text-base"
                >
                  Register
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200 text-sm sm:text-base"
                >
                  Log In
                </Link>
              </li>
            </ul>
          </nav>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
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
                About Us
              </Link>
              <Link
                to="/register"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition text-sm sm:hidden"
                onClick={() => setMobileMenuOpen(false)}
              >
                Register
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-grow flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img 
                src="/jckl-192.png" 
                alt="JCKL Academy Logo" 
                className="w-20 h-20 rounded-2xl shadow-lg"
              />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Create Your Account
            </h1>
            <p className="text-gray-600">
              Join the food reservation system at JCKL Academy
            </p>
          </div>

          {/* Registration Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Full Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Juan Dela Cruz"
                error={errors.name}
              />
              <Input
                label="Student ID Number"
                name="studentId"
                value={form.studentId}
                onChange={handleChange}
                placeholder="202300001"
                error={errors.studentId}
              />
              <Input
                label="Contact Number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+63 912 345 6789"
                error={errors.phone}
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="student@jckl.edu.ph"
                error={errors.email}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                error={errors.password}
              />
              <Input
                label="Confirm Password"
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={handleChange}
                placeholder="Re-enter your password"
                error={errors.confirm}
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Sign In
                </Link>
              </p>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Student Accounts Only</p>
                  <p className="text-blue-700">
                    This registration is for JCKL Academy students. Use your
                    school email and valid student ID.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="py-8 bg-gray-900 text-center">
        <div className="text-gray-400 text-sm">
          © 2025 JCKL Food Reservation System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
