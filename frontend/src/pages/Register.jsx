// src/pages/Register.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../components/Input";
import Button from "../components/Button";
import { api, ApiError } from "../lib/api";
import { refreshSessionForPublic } from "../lib/auth";

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
    phone: "" // added
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(err => ({ ...err, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.studentId.trim()) errs.studentId = "Student ID is required";
    else if (!/^\d+$/.test(String(form.studentId).trim())) errs.studentId = "Student ID must contain digits only";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email";

    if (!form.phone.trim()) errs.phone = "Contact number is required";
    else if (!/^[\d+\-\s\(\)]+$/.test(form.phone.trim())) errs.phone = "Invalid contact number";

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

    // Try backend register + auto-login. If backend fails, fallback to localStorage behavior.
    try {
      await api.post("/auth/register", {
        name: form.name.trim(),
        studentId: form.studentId.trim(),
        email: form.email.trim(),
        password: form.password,
        grade: "",
        section: "",
        phone: form.phone.trim()
      });

      // auto-login
      const { token, user } = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setIsLoading(false);
      navigate("/dashboard", { replace: true });
      return;
    } catch (err) {
      setIsLoading(false);
      // If ApiError, try to show useful form error(s)
      if (err instanceof ApiError) {
        const status = err.status;
        // try to extract server message
        const serverMsg = (err?.response && err.response.data && err.response.data.error) || (err?.data && err.data.error) || err.message || "";
        if (status === ApiError.Conflict) {
          setErrors({ email: "Email already registered. Please log in instead." });
          return;
        }
        if (status === 400) {
          // if message mentions studentId show on that field, otherwise generic
          if (/studentid/i.test(serverMsg) || /student id/i.test(serverMsg)) {
            setErrors({ studentId: serverMsg });
          } else {
            setErrors({ email: serverMsg || "Invalid registration data" });
          }
          return;
        }
        switch (status) {
          case ApiError.Maintenance: navigate("/status/maintenance",  { replace: true }); break;
          case ApiError.ServerError: navigate("/status/server_error", { replace: true }); break;
          default: navigate("/status/something_went_wrong");
        }
        return;
      }

      // fallback generic
      setErrors({ email: "Email already registered. Please log in instead." });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER: unchanged design */} 
      <header className="w-full bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-gray-900 text-lg">
            Jesus Christ King of Kings and Lord of Lords Academy Inc.
          </div>
          <nav>
            <ul className="flex items-center space-x-8">
              <li>
                <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
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
          <h1 className="text-2xl font-bold mb-6">Register</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Full Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              error={errors.name}
            />
            <Input
              label="Student ID Number"
              name="studentId"
              value={form.studentId}
              onChange={handleChange}
              placeholder="Digits only, e.g. 202300001"
              error={errors.studentId}
            />
            <Input
              label="Contact Number"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="e.g. +63 912 345 6789"
              error={errors.phone}
            />
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              error={errors.email}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a password"
              error={errors.password}
            />
            <Input
              label="Confirm Password"
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={handleChange}
              placeholder="Confirm your password"
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

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
