import React from 'react';

export function Tabs({ value, onValueChange, children, className = '' }) {
  return (
    <div className={"flex space-x-2 " + className}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { active: child.props.value === value, onClick: () => onValueChange(child.props.value) })
      )}
    </div>
  );
}