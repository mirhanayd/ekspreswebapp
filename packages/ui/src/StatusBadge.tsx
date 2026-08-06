import * as React from 'react';

export interface StatusBadgeProps {
  status: 'ok' | 'degraded' | 'maintenance';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = status === 'ok' ? 'green' : status === 'degraded' ? 'orange' : 'red';
  return (
    <span
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: color,
        color: 'white',
        fontWeight: 'bold',
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}
