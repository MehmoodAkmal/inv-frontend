import { forwardRef } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const SharedModal = forwardRef(
  ({ isOpen, onClose, title, children, size = "md", overlayClassName, contentClassName, ...rest }, ref) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(isOpen);
    }, [isOpen]);

    if (!mounted) return null;

    const navigate = useNavigate();

    const handleClose = (e) => {
      e.stopPropagation();
      onClose();
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-modal-title"
      >
        <div
          role="document"
          className={`relative bg-white dark:bg-dark-900 rounded-lg shadow-xl overflow-hidden transform transition-all duration-300 ease-out ${
            size === "sm"
              ? "max-w-sm sm:max-w-md"
              : size === "md"
                ? "max-w-md"
                : size === "lg"
                  ? "max-w-2xl"
                  : "max-w-full"
          } ${overlayClassName || ""} p-4`}
        >
          <h2 id="shared-modal-title" className="text-xl font-bold text-brand-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded hover:bg-brand-100 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 {contentClassName || ""}">
          {children}
        </div>
      </div>
    );
  }
);
SharedModal.displayName = "SharedModal";