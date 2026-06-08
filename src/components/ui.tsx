import type { ReactNode } from 'react'

export const Card = ({
  children,
  className = '',
  title,
  action,
}: {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}) => (
  <section className={`card ${className}`}>
    {(title || action) && (
      <div className="card-header">
        {title && <h2>{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
)

export const Button = ({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) => (
  <button className={`button button-${variant}`} type="button" {...props}>
    {children}
  </button>
)

export const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className="input" {...props} />
)

export const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className="input textarea" {...props} />
)

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className="input" {...props} />

export const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="empty-state">
    <strong>{title}</strong>
    <span>{body}</span>
  </div>
)

export const StatusDot = ({ color }: { color: string }) => <span className="status-dot" style={{ background: color }} />

export const Tag = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'info' }) => (
  <span className={`tag tag-${tone}`}>{children}</span>
)

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
)
