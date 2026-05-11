import React from 'react';

function IconBase({ children, className = '' }) {
  return (
    <span className={`heroku-icon ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

export function EnterpriseIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M8 20V8M16 20V8M3.5 10H20.5" />
      <path d="M10 12.5h4M10 16h4" />
    </IconBase>
  );
}

export function TeamsIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="9" r="2.5" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M3.5 19c.7-2.6 2.8-4 5.5-4s4.8 1.4 5.5 4" />
      <path d="M12 19c.6-2.2 2.2-3.4 4.2-3.4S19.8 16.8 20.5 19" />
    </IconBase>
  );
}

export function DynoIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 5 10l7 10.5L19 10 12 3.5Z" />
      <path d="M12 8.2v7.6" />
    </IconBase>
  );
}

export function PostgresIcon(props) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="6.5" rx="6.5" ry="2.8" />
      <path d="M5.5 6.5v8.5c0 1.6 2.9 2.8 6.5 2.8s6.5-1.2 6.5-2.8V6.5" />
      <path d="M5.5 10.7c0 1.6 2.9 2.8 6.5 2.8s6.5-1.2 6.5-2.8" />
    </IconBase>
  );
}

export function AddonsIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" />
      <rect x="12.5" y="12.5" width="7" height="7" rx="1.5" />
      <path d="M12.5 8h3.5v3.5M8 12.5v3.5h3.5" />
    </IconBase>
  );
}

export function ConnectIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="6.5" width="7" height="11" rx="2" />
      <rect x="13.5" y="6.5" width="7" height="11" rx="2" />
      <path d="M10.5 12h3" />
      <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="12" r="1" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function CostIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v10M9.5 9.8c0-1.4 1.1-2.3 2.5-2.3s2.5.8 2.5 2.3-1.1 2-2.5 2.4-2.5 1-2.5 2.4 1.1 2.3 2.5 2.3 2.5-.9 2.5-2.3" />
    </IconBase>
  );
}
