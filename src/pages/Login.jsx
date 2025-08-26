// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../components/Input";
import Button from "../components/Button";
import { api } from "../lib/api"; // <-- make sure src/lib/api.js exists (our fetch wrapper)

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setIsLoading(true);
    setErrors({}); // clear previous

    try {
      // POST /api/auth/login -> { token, user }
      const { token, user } = await api.post("/auth/login", {
        email: creds.email.trim(),
        password: creds.password,
      });

      // Persist session
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Route by role
      if (user?.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setErrors({ form: err.message || "Login failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="w-full bg-white shadow-sm border-b border-gray-200">
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

      {/* FORM */}
      <div className="py-12 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg border border-gray-200">
          <h1 className="text-2xl font-bold mb-6">Log In</h1>

          {/* Top-level form error */}
          {errors.form && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={creds.email}
              onChange={handleChange}
              placeholder="admin@school.test"
              error={errors.email}
              autoComplete="username"
            />
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
            <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
              {isLoading ? "Signing In..." : "Log In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don’t have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Register
            </Link>
          </p>

          {/* Quick test hint (remove later) */}
          <div className="mt-4 text-xs text-gray-500">
            Admin test account: <b>admin@school.test</b> / <b>admin123</b>
          </div>
        </div>
      </div>
    </div>
  );
}
