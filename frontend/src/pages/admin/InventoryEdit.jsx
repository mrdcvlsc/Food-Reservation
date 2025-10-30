import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function InventoryEdit({ product }) {
  const navigate = useNavigate();
  const [qty, setQty] = useState(product?.stock || 0);
  const [saving, setSaving] = useState(false);

  const saveStock = async () => {
    setSaving(true);
    try {
      // use relative path via api client (baseURL points to backend)
      await api.post(`/inventory/${product.id}/stock`, { qty: Number(qty) });
      // navigate within SPA — avoids causing a full page reload to unknown route
      navigate("/admin/inventory");
    } catch (err) {
      console.error("Save stock failed", err);
      alert("Failed to save stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div>
        <label>Stock:</label>
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
      </div>
      <button onClick={saveStock} disabled={saving}>Save</button>
    </>
  );
}