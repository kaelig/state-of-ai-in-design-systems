// Harbor's React implementation. Each component takes exactly the props its
// catalog entry declares, so a tree that validates renders without adapters.

import { useId, useMemo } from 'react';
import { darkCss, tokensToCss } from '../catalog/tokens.js';
import './harbor.css';

const TOKEN_CSS = tokensToCss({ selector: '.harbor' }) + darkCss('.harbor[data-harbor-mode="dark"]');

/**
 * Scopes Harbor's tokens to a subtree. `mode` and `density` are the two theme
 * axes the agent can change through shared state.
 */
export function HarborTheme({ mode = 'light', density = 'comfortable', className = '', style, children }) {
  return (
    <div className={`harbor ${className}`} data-harbor-mode={mode} data-harbor-density={density} style={{ containerType: 'inline-size', ...style }}>
      <style>{TOKEN_CSS}</style>
      {children}
    </div>
  );
}

const space = (token) => (token && token !== 'none' ? `var(--harbor-space-${token})` : '0');
const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' };
const JUSTIFY = { start: 'flex-start', center: 'center', end: 'flex-end', 'space-between': 'space-between' };

export function Stack({ direction = 'vertical', gap = 'md', align = 'stretch', justify = 'start', padding = 'none', children, className = '' }) {
  return (
    <div
      className={`h-stack ${className}`}
      data-direction={direction}
      style={{ gap: space(gap), alignItems: ALIGN[align], justifyContent: JUSTIFY[justify], padding: space(padding) }}
    >
      {children}
    </div>
  );
}

export function Grid({ columns = 3, gap = 'lg', children, className = '' }) {
  return (
    <div className={`h-grid ${className}`} style={{ '--h-cols': columns, gap: space(gap) }}>
      {children}
    </div>
  );
}

export function Card({ padding = 'lg', elevation = 'flat', children, className = '' }) {
  return (
    <section className={`h-card ${className}`} data-elevation={elevation} style={{ padding: space(padding) }}>
      {children}
    </section>
  );
}

export function Heading({ text, level = 2, className = '' }) {
  const Tag = `h${Math.min(3, Math.max(1, level))}`;
  return (
    <Tag className={`h-heading ${className}`} data-level={level}>
      {text}
    </Tag>
  );
}

export function Text({ text, tone = 'default', size = 'md', className = '' }) {
  return (
    <p className={`h-text ${className}`} data-tone={tone} data-size={size}>
      {text}
    </p>
  );
}

export function Button({ label, variant = 'primary', size = 'md', fullWidth = false, disabled = false, onClick, className = '' }) {
  return (
    <button type="button" className={`h-button ${className}`} data-variant={variant} data-size={size} data-full-width={String(fullWidth)} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

export function Badge({ label, tone = 'neutral', className = '' }) {
  return (
    <span className={`h-badge ${className}`} data-tone={tone}>
      {label}
    </span>
  );
}

export function TextField({ label, placeholder, type = 'text', hint, required = false, className = '' }) {
  const id = useId();
  return (
    <div className={`h-field ${className}`}>
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="h-required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      <input id={id} className="h-input" type={type} placeholder={placeholder} required={required} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint ? (
        <span id={`${id}-hint`} className="h-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, checked = false, className = '' }) {
  return (
    <label className={`h-checkbox ${className}`}>
      <input type="checkbox" defaultChecked={checked} />
      <span>{label}</span>
    </label>
  );
}

export function Alert({ title, text, tone = 'info', className = '' }) {
  return (
    <div className={`h-alert ${className}`} data-tone={tone} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}>
      {title ? <strong>{title}</strong> : null}
      <p>{text}</p>
    </div>
  );
}

export function Avatar({ name, size = 'md', className = '' }) {
  const initials = useMemo(
    () =>
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join(''),
    [name],
  );
  return (
    <span className={`h-avatar ${className}`} data-size={size} role="img" aria-label={name}>
      {initials}
    </span>
  );
}

const TREND = { up: '▲', down: '▼', flat: '' };

export function Stat({ label, value, change, trend = 'flat', className = '' }) {
  return (
    <div className={`h-stat ${className}`}>
      <span className="h-stat-label">{label}</span>
      <span className="h-stat-value">{value}</span>
      {change ? (
        <span className="h-stat-change" data-trend={trend}>
          {TREND[trend] ? <span aria-hidden="true">{TREND[trend]} </span> : null}
          {change}
        </span>
      ) : null}
    </div>
  );
}

export function Divider({ className = '' }) {
  return <hr className={`h-divider ${className}`} />;
}

/** Catalog type name to component, for renderers. */
export const registry = { Stack, Grid, Card, Heading, Text, Button, Badge, TextField, Checkbox, Alert, Avatar, Stat, Divider };
