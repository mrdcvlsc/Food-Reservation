// src/pages/Login.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../components/Input";
import Button from "../components/Button";
import { api, ApiError } from "../lib/api";
import { refreshSessionForPublic } from "../lib/auth";
import { setUserToStorage, setTokenToStorage } from "../lib/storage";

export default function Login() {
  const navigate = useNavigate();

  const [creds, setCreds] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setCreds((c) => ({ ...c, [e.target.name]: e.target.value }));
    if (errors[e.target.name] || errors.form) {
      setErrors((err) => ({ ...err, [e.target.name]: "", form: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!creds.email.trim()) errs.email = "Email is required";
    if (!creds.password) errs.password = "Password is required";
    return errs;
  };

  useEffect(() => {
    (async () => {
      await refreshSessionForPublic({ navigate });
    })();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setIsLoading(true);
    setErrors({});

    try {
      const data = await api.post("/auth/login", {
        email: creds.email,
        password: creds.password,
      });

      setTokenToStorage(data.token);
      setUserToStorage(data.user);

      if (data.user?.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (data.user?.role === "student") {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setIsLoading(false);
        switch (err.status) {
          case ApiError.Maintenance:
            navigate("/status/maintenance", { replace: true });
            break;
          case ApiError.ServerError:
            navigate("/status/server_error", { replace: true });
            break;
          default:
            setErrors({
              form: err.message || "Login failed. Please try again.",
            });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* HEADER */}
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
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
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
                <Link
                  to="/login"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200"
                >
                  Log In
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-grow flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mb-4 shadow-lg">
              <span className="text-white font-bold text-2xl">JCKL</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">
              Sign in to your food reservation account
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {/* Top-level form error */}
            {errors.form && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{errors.form}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={creds.email}
                onChange={handleChange}
                placeholder="student@jckl.edu.ph"
                error={errors.email}
                autoComplete="username"
              />
              <div>
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  value={creds.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  error={errors.password}
                  autoComplete="current-password"
                />
                <div className="text-right mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Create Account
                </Link>
              </p>
            </div>

            {/* Quick test hint (remove later) */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <div className="font-semibold text-gray-700 mb-1">
                Test Accounts:
              </div>
              <div>
                <span className="font-medium">Admin:</span> admin@school.test /
                admin123
              </div>
              <div>
                <span className="font-medium">Student:</span>{" "}
                student@school.test / student123
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
