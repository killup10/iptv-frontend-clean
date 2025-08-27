import React from 'react';

export function Tab({ value, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        (active ? 'border-b-2 border-blue-500 text-blue-500 ' : 'text-gray-400 ') +
        'px-3 py-1 font-medium focus:outline-none'
      }
    >
      {label}
    </button>
  );
}