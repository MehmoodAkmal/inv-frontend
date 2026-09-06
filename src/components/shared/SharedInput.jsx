import { forwardRef } from "react";
import { InputHTMLAttributes } from "react";

export const SharedInput = forwardRef(
  ({ label, placeholder, error, disabled, readonly, type = "text", variant = "default", ...rest }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label
            className="block text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1.5"
            htmlFor="shared-input"
          >
            {label}
          </label>
        )}

        <input
          id="shared-input"
          ref={ref}
          className="input-field"
          type={type}
          placeholder={placeholder || "Enter value"}
          disabled={disabled}
          readonly={readonly}
          {...rest}
        />
      </div>

      {error && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    );
  }
);
SharedInput.displayName = "SharedInput";