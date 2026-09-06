import { forwardRef } from "react";
import { useState } from "react";

export const SharedSelect = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Select",
  error,
  disabled = false,
  className: propsClassName,
  searchable = false,
  loading = false,
  loadingText = "Loading...",
}) => {
  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label
          className="block text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Select */}
      <div className="relative">
        <select
          className={`input-field w-full rounded-lg ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
        >
          <option value="" disabled={true}>
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search icon / clear */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.3-5.3a.75.75 0 01-1.06.02l-3.13 3.13a.75.75 0 11-1.06.02l5.3-5.3a.75.75 0 011.06.02l-3.13 3.13a.75.75 0 11-1.06.02l5.3-5.3a.75.75 0 011.06.02z" />
        </svg>
      </div>
    </div>

    {/* Error */}
    {error && (
      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        {error}
      </p>
    )}
  );
};
SharedSelect.displayName = "SharedSelect";