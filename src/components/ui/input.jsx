// src/components/ui/input.jsx
import React from 'react';

export function Input(props) {
  return (
    <input
      {...props}
      className={
        (props.className || '') +
        ' w-full px-4 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500'
      }
    />
  );
}