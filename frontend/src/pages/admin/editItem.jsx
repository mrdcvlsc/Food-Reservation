import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";

export default function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fields, setFields] = useState({ name: "", price: 0, category: "", stock: 0 });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // load item details for id -> setFields(...)
  }, [id]);

  async function saveItem(fields, file) {
    try {
      const form = new FormData();
      if (fields.name !== undefined) form.append("name", fields.name);
      if (fields.price !== undefined) form.append("price", String(fields.price));
      if (fields.category !== undefined) form.append("category", fields.category);
      if (fields.stock !== undefined) form.append("stock", String(fields.stock));
      if (fields.desc !== undefined) form.append("desc", fields.desc);
      if (file) form.append("image", file); // backend expects "image"
      await api.putForm(`/menu/${id}`, form);
      // notify other pages to refresh their menu
      try { window.dispatchEvent(new Event("menu:updated")); } catch {}
      alert("Saved");
      navigate("/admin/shop");
    } catch (err) {
      console.error("Save failed", err);
      alert((err && err.message) || "Failed to save item");
    }
  }

  return (
    <div>
      {/* form fields (name, price, category, stock) */}
      <input value={fields.name} onChange={e => setFields(f => ({...f, name: e.target.value}))} />
      <input type="number" value={fields.price} onChange={e => setFields(f => ({...f, price: Number(e.target.value)}))} />
      <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <button
        onClick={async () => {
          setSaving(true);
          await saveItem(fields, file);
          setSaving(false);
        }}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}