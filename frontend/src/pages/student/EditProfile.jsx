// src/pages/EditProfile.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/avbar";
import BottomNav from "../../components/mobile/BottomNav";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import { getUserFromStorage, setUserToStorage } from "../../lib/storage";
import { Camera } from 'lucide-react';

export default function EditProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Get initial values from localStorage
  const localUser = getUserFromStorage() || {};
  
  // Initialize form with localStorage values
  const [form, setForm] = useState({
    name: localUser.name || "",
    email: localUser.email || "",
    studentId: localUser.studentId || localUser.user || "", // handle both fields
    phone: localUser.phone || localUser.contact || ""
  });

  const [imagePreview, setImagePreview] = useState(localUser.profilePictureUrl || localUser.profilePicture || null);
  const [imageFile, setImageFile] = useState(null);

  // Load fresh data from server and update form
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const meRes = await api.get("/wallets/me");
        const data = meRes;
        
        if (data && typeof data === "object") {
          setForm(prev => ({
            ...prev,
            name: data.name || data.fullName || prev.name || "",
            email: data.email || prev.email || "",
            studentId: data.user || prev.studentId || "",
            phone: data.phone || prev.phone || ""
          }));

          // Also update localStorage with fresh data
          const updatedUser = {
            ...localUser,
            ...data,
            studentId: data.user,
            phone: data.phone
          };
          setUserToStorage(updatedUser);

          if (data.profilePictureUrl) {
            const cacheBuster = `?t=${new Date().getTime()}`;
            setImagePreview(`${data.profilePictureUrl}${cacheBuster}`);
          }
        }
      } catch (err) {
        console.error("Failed to load user data:", err);
        // Fallback to localStorage if API fails
        setForm(prev => ({
          ...prev,
          studentId: localUser.studentId || localUser.user || prev.studentId || "",
          phone: localUser.phone || localUser.contact || prev.phone || ""
        }));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const formData = new FormData();

      // Add user ID to ensure uniqueness
      formData.append('userId', localUser.id || localUser.studentId || localUser.user);
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('studentId', form.studentId);
      formData.append('phone', form.phone);
      
      if (imageFile) {
        // Append file with unique identifier
        const fileExt = imageFile.name.split('.').pop();
        const uniqueFileName = `${form.studentId}_${Date.now()}.${fileExt}`;
        formData.append('profilePicture', imageFile, uniqueFileName);
      }

      const res = await api.post("/wallets/update-profile", formData);

      // more robust success detection
      const success = Boolean(
        (res && typeof res === 'object' && res.status && res.status >= 200 && res.status < 300) ||
        (res && res.ok) ||
        (res && res.data && res.data.ok) ||
        res === true
      );

      if (success) {
        const serverUser = res?.data?.user;
        const profilePictureUrl = serverUser?.profilePictureUrl || imagePreview;
        
        const updatedUser = {
          ...getUserFromStorage(),
          ...(serverUser || {}),
          ...(!serverUser ? form : {}),
          profilePicture: profilePictureUrl,
          profilePictureUpdatedAt: new Date().toISOString() // Add timestamp to force refresh
        };
        setUserToStorage(updatedUser);

        navigate("/profile");
        setTimeout(() => alert("Profile updated successfully"), 150);
        return;
      }

      // fallback: show error if server didn't indicate success
      throw new Error((res && res.data && (res.data.error || res.data.message)) || "Update failed");
    } catch (err) {
      console.error("Update failed:", err);
      alert(err.response?.data?.message || err.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 lg:p-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900">
            Edit Profile
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Profile Picture */}
            <div className="mb-6 sm:mb-8 flex flex-col items-center">
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-blue-100">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-blue-700">
                      {form.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading}
                  />
                </label>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center">Click the camera icon to upload a profile picture</p>
            </div>

            {/* Form Fields */}
            {['name', 'email', 'studentId', 'phone'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field === 'studentId' ? 'Student ID' : 
                   field === 'phone' ? 'Contact Number' :
                   field === 'email' ? 'Email Address' : 'Full Name'}
                </label>
                <input
                  name={field}
                  type={field === 'email' ? 'email' : 'text'}
                  value={form[field]}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  placeholder={`Enter your ${field === 'studentId' ? 'student ID' : 
                              field === 'phone' ? 'phone number' : field}`}
                  disabled={loading}
                />
              </div>
            ))}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-6 sm:mt-8">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
