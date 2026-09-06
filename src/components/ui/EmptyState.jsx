import { Link } from 'react-router-dom';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && (
        <Link to={action.path} className="btn-primary mt-4">
          {action.label}
        </Link>
      )}
    </div>
  );
}
