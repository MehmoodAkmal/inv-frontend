import { forwardRef } from 'react';
import { NavLink } from 'react-router-dom';

export const SharedNavLink = forwardRef(
  ({ to, end, title, className, 'aria-label': ariaLabel, ...rest }, ref) => {
    const isActive = window.location.pathname === to;

    return (
      <NavLink
        ref={ref}
        to={to}
        end={end ?? false}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 relative
           ${
             isActive
               ? 'bg-primary-600/20 text-primary-400'
               : 'text-brand-400 hover:bg-brand-800 hover:text-brand-100'
           }
           ${className || ''}`
        }
        aria-label={ariaLabel ?? title}
        {...rest}
      >
        <span className="shrink-0">{title ? null : ''}</span>
      </NavLink>
    );
  }
);
SharedNavLink.displayName = 'SharedNavLink';
