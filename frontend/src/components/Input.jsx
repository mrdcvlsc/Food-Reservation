import React from "react";

export default function Input({
  label,
  name,
  type = "text",
  error,
  ...props
}) {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        className={`block w-full border rounded-md p-2 focus:ring ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-200"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-red-600 text-sm">{error}</p>}
    </div>
  );
}
