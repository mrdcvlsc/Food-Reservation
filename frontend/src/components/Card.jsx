import React from "react";

export default function Card({ title, children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition ${className}`}
    >
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      {children}
    </div>
  );
}
