import { NavLink, useNavigate } from "react-router-dom";

export default function PageHeader({ title, subtitle, breadcrumbs, actions }) {
  return (
    <div className="page-header">
      <div>
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs mb-2">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <svg className="w-3 h-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
                {crumb.path ? (
                  <NavLink to={crumb.path} className="text-brand-500 hover:text-brand-700 transition-colors">{crumb.label}</NavLink>
                ) : (
                  <span className="text-brand-900 font-semibold">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
