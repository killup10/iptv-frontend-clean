import React from 'react';

export function Button({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={
        'px-4 py-2 rounded font-semibold ' +
        (className || 'bg-blue-600 hover:bg-blue-700 text-white')
      }
    >
      {children}
    </button>
  );
}
