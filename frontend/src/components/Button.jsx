import React from "react";
import clsx from "clsx";

/**
 * @param {"primary"|"secondary"|"ghost"} variant
 * @param {boolean} fullWidth
 * @param {string} className
 * @param {React.ReactNode} children
 */
export default function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...props
}) {
  const base = "px-4 py-2 rounded-lg font-medium focus:outline-none";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-green-600 text-white hover:bg-green-700",
    ghost: "bg-transparent text-gray-800 hover:bg-gray-100"
  };

  return (
    <button
      className={clsx(
        base,
        variants[variant],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
