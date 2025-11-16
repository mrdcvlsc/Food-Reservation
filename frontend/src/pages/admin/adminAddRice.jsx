import React, { useRef, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import {
  Upload,
  Image,
  Trash2,
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Info,
  Utensils,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function readAsImage(file) {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function compressImage(file, options = {}) {
  const { maxW = 1024, maxH = 1024, quality = 0.82, mime = "image/jpeg" } = options;
  
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

export default function AdminAddRice() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

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
  const [successMessage, setSuccessMessage] = useState("");

  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const openPicker = () => fileRef.current?.click();

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\//i.test(file.type)) {
      setErrors((prev) => ({ ...prev, image: "Please choose a valid image file." }));
      return;
    }

    setErrors((prev) => ({ ...prev, image: undefined }));

    try {
      const { file: compressed, width, height } = await compressImage(file, {
        maxW: 1024,
        maxH: 1024,
        quality: 0.82,
        mime: "image/jpeg",
      });

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
    setSuccessMessage("");
    
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);

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
        fd.append("image", imageFile, imageFile.name);
      }

      await api.post("/admin/menu", fd);

      if (goToList) {
        navigate("/admin/shops", { replace: true });
      } else {
        setSuccessMessage(`✓ "${form.name}" added successfully!`);
        setForm({
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
        removeImage();
        window.scrollTo({ top: 0, behavior: "smooth" });
        
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes("413") || /entity too large|payload too large/i.test(msg)) {
        setFormError(
          "Upload rejected: the request is too large. Image is compressed but server may have a low limit."
        );
      } else {
        setFormError(msg || "Failed to save meal. Please try again.");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <Navbar />
      <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <div className="space-y-3">
          <Link
            to="/admin/shops"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shop</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Add Rice Meal</h1>
              <p className="text-sm text-gray-600">Create a new meal for the canteen menu</p>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-900">{successMessage}</p>
          </div>
        )}

        {formError && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-900">{formError}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Meal Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 bg-gray-50 hover:border-orange-400 transition">
                {imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative w-full aspect-square max-w-xs mx-auto bg-white rounded-xl overflow-hidden shadow-lg">
                      <img
                        src={imagePreview}
                        alt="Meal preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {imageMeta.w && imageMeta.h && (
                      <p className="text-xs text-center text-gray-500 font-medium">
                        {imageMeta.w}×{imageMeta.h}px • {formatBytes(imageMeta.size)}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        onClick={openPicker}
                        type="button"
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition text-sm font-medium"
                      >
                        <Upload className="w-4 h-4" />
                        Replace Image
                      </button>
                      <button
                        onClick={removeImage}
                        type="button"
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 transition text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto">
                      <Image className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">No image selected</p>
                      <p className="text-xs text-gray-500 mt-1">Upload an appetizing photo of the meal</p>
                    </div>
                    <button
                      onClick={openPicker}
                      type="button"
                      className="inline-flex items-center justify-center gap-2 bg-orange-600 text-white px-5 py-3 rounded-xl hover:bg-orange-700 transition text-sm font-medium shadow-lg shadow-orange-200"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Image (Auto-compressed)
                    </button>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickImage}
                />
              </div>
              {errors.image && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.image}
                </p>
              )}
              <div className="mt-3 flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <Info className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-900">
                  <strong>Tip:</strong> Square crop with clean background. Image will be auto-compressed to ≤1.2MB
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Meal Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g., Chicken Adobo w/ Rice"
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
                  errors.name 
                    ? "border-red-400 focus:ring-red-300 bg-red-50" 
                    : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                }`}
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Price (PHP) <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="e.g., 85.00"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
                    errors.price 
                      ? "border-red-400 focus:ring-red-300 bg-red-50" 
                      : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
                {form.price && !errors.price && (
                  <p className="text-xs text-gray-600 mt-2 font-medium">
                    Preview: <span className="text-emerald-600">{peso.format(Number(form.price))}</span>
                  </p>
                )}
                {errors.price && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.price}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Initial Stock <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.stock}
                  onChange={(e) => setField("stock", e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="e.g., 30"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
                    errors.stock 
                      ? "border-red-400 focus:ring-red-300 bg-red-50" 
                      : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
                {errors.stock && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.stock}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Category
                </label>
                <input
                  value={form.category}
                  disabled
                  className="w-full border border-gray-200 bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Fixed for meals</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Meal Type
                </label>
                <select
                  value={form.mealType}
                  onChange={(e) => setField("mealType", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none bg-white"
                >
                  <option>Rice Meal</option>
                  <option>Combo</option>
                  <option>Ala Carte</option>
                  <option>Special</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Serving (grams)
                </label>
                <input
                  value={form.servingGrams}
                  onChange={(e) => setField("servingGrams", e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="e.g., 250"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Calories (kcal) <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  value={form.calories}
                  onChange={(e) => setField("calories", e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="e.g., 520"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Add details like ingredients, spice level, allergens, etc."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="flex-1 cursor-pointer">
                <div className="text-sm font-medium text-gray-900">Mark as active</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Active meals will be visible to customers in the menu
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => onSubmit(false)}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl hover:bg-black transition text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save & Add Another
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => onSubmit(true)}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-600 text-white px-5 py-3 rounded-xl hover:bg-orange-700 transition text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save & Go to List
                  </>
                )}
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
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