import React from "react";

// Simple spinner component
const Spinner = ({text, className = "", size = 4, inline = false}) => {
  const spinnerSizeClass = `h-${size} w-${size}`;
  
  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      {...(!inline && { role: "status", "aria-live": "polite" })}
    >
      <svg className={`animate-spin ${spinnerSizeClass}`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {text ? <span className="text-sm">{text}</span> : null}
    </span>
  );
};

export default Spinner;