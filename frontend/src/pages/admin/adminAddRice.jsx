import React, { useRef, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  ArrowLeft,
  Save,
  Loader2,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/** ---------- image helpers ---------- **/
function readAsImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function compressImage(file, {
  maxW = 1024,
  maxH = 1024,
  quality = 0.82,
  mime = "image/jpeg",
} = {}) {
  const img = await readAsImage(file);
  const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        // Name the file similar to original to keep extensions reasonable
        const out = new File([blob], file.name.replace(/\.(png|jpeg|jpg|webp|gif)$/i, "") + ".jpg", { type: mime });
        resolve({ file: out, width: w, height: h });
      },
      mime,
      quality
    );
  });
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  const units = ["B", "KB", "MB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}
/** ------------------------------------ **/

export default function AdminAddRice() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "",
    category: "Meals",
    mealType: "Rice Meal",
    servingGrams: "",
    calories: "",
    description: "",
    isActive: true,
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageMeta, setImageMeta] = useState({ w: 0, h: 0, size: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const openPicker = () => fileRef.current?.click();

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic type guard
    if (!/^image\//i.test(file.type)) {
      setErrors((prev) => ({ ...prev, image: "Please choose a valid image file." }));
      return;
    }

    setErrors((prev) => ({ ...prev, image: undefined }));

    try {
      // Compress to keep payload small
      const { file: compressed, width, height } = await compressImage(file, {
        maxW: 1024,
        maxH: 1024,
        quality: 0.82,
        mime: "image/jpeg",
      });

      // Soft client cap ~1.2MB after compression to avoid server 413
      if (compressed.size > 1.2 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          image: "Image is still too large after compression (max ~1.2MB). Try a smaller picture.",
        }));
        return;
      }

      setImageFile(compressed);
      setImageMeta({ w: width, h: height, size: compressed.size });
      const url = URL.createObjectURL(compressed);
      setImagePreview(url);
    } catch {
      setErrors((prev) => ({ ...prev, image: "Could not process the image." }));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageMeta({ w: 0, h: 0, size: 0 });
    if (fileRef.current) fileRef.current.value = "";
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Meal name is required.";
    if (form.price === "" || Number(form.price) <= 0) e.price = "Price must be greater than 0.";
    if (form.stock === "" || Number(form.stock) < 0) e.stock = "Stock must be 0 or more.";
    if (!form.category) e.category = "Category is required.";
    return e;
  };

  const onSubmit = async (goToList = false) => {
    setFormError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      setSubmitting(true);

      // Build multipart form-data (no JSON/base64)
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("category", "Meals");
      fd.append("price", String(Number(form.price)));
      fd.append("stock", String(form.stock === "" ? 0 : Number(form.stock)));
      if (form.mealType) fd.append("mealType", form.mealType);
      if (form.servingGrams) fd.append("servingGrams", String(Number(form.servingGrams)));
      if (form.calories) fd.append("calories", String(Number(form.calories)));
      if (form.description) fd.append("description", form.description);
      fd.append("isActive", form.isActive ? "true" : "false");

      if (imageFile) {
        // If your backend expects the field name 'img' instead of 'image', change it here.
        fd.append("image", imageFile, imageFile.name);
      }

      // IMPORTANT: api.post will pass through FormData without JSON headers.
      await api.post("/admin/menu", fd);

      if (goToList) {
        navigate("/admin/shops", { replace: true });
      } else {
        setForm((f) => ({
          name: "",
          price: "",
          stock: "",
          category: f.category,
          mealType: "Rice Meal",
          servingGrams: "",
          calories: "",
          description: "",
          isActive: true,
        }));
        removeImage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes("413") || /entity too large|payload too large/i.test(msg)) {
        setFormError(
          "Upload rejected: the request is too large. We now compress client-side, but your server may still have a low limit. Ask the backend to raise 'limit' for multipart uploads (e.g., 5–10MB)."
        );
      } else {
        setFormError(msg || "Failed to save meal. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Add Rice Meal</h1>
            <p className="text-gray-600">Create a new meal for the canteen menu.</p>
          </div>
          <Link
            to="/admin/shops"
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </Link>
        </div>

        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: details */}
            <div className="lg:col-span-2 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g., Chicken Adobo w/ Rice"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.name ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (PHP) <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value.replace(/[^\d.]/g, ""))}
                    inputMode="decimal"
                    placeholder="e.g., 85"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      errors.price ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Preview: {form.price ? peso.format(Number(form.price)) : "—"}
                  </p>
                  {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.stock}
                    onChange={(e) => setField("stock", e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    placeholder="e.g., 30"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      errors.stock ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  {errors.stock && <p className="text-xs text-red-600 mt-1">{errors.stock}</p>}
                </div>
              </div>

              {/* Category (locked) & Meal type / Serving */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    value={form.category}
                    disabled
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type</label>
                  <select
                    value={form.mealType}
                    onChange={(e) => setField("mealType", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Rice Meal</option>
                    <option>Combo</option>
                    <option>Ala Carte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serving (g)</label>
                  <input
                    value={form.servingGrams}
                    onChange={(e) => setField("servingGrams", e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    placeholder="e.g., 250"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Nutrition row (optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calories (kcal)</label>
                  <input
                    value={form.calories}
                    onChange={(e) => setField("calories", e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    placeholder="e.g., 520"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Optional notes (ingredients, spice level, allergens, etc.)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setField("isActive", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Mark as active (visible in menu)
                </label>
              </div>
            </div>

            {/* Right: image upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meal Image</label>
              <div className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[260px]">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Meal" className="w-56 h-56 object-contain rounded" />
                    <div className="mt-2 text-xs text-gray-500">
                      {imageMeta.w && imageMeta.h ? `${imageMeta.w}×${imageMeta.h}px` : ""} • {formatBytes(imageMeta.size)}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={openPicker}
                        type="button"
                        className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Replace
                      </button>
                      <button
                        onClick={removeImage}
                        type="button"
                        className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">No image selected.</p>
                    <button
                      onClick={openPicker}
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Upload (auto-compressed ≤ ~1.2MB)
                    </button>
                    {errors.image && <p className="text-xs text-red-600 mt-2">{errors.image}</p>}
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Tip: square crop with clean background for better menu thumbnails.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => onSubmit(false)}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition text-sm disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Add Another
            </button>
            <button
              type="button"
              onClick={() => onSubmit(true)}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Go to List
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
