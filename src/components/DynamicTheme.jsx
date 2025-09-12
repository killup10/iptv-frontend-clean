import React, { useEffect, useState } from 'react';

export default function DynamicTheme({ theme, children, className = "" }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (theme) {
      setIsLoaded(true);
    }
  }, [theme]);

  if (!theme) {
    return <div className={className}>{children}</div>;
  }

  const dynamicStyles = {
    '--dynamic-primary': theme.primaryColor || '#00e5ff',
    '--dynamic-secondary': theme.secondaryColor || '#ff00ff',
    '--dynamic-accent': theme.accentColor || '#ffffff',
    '--dynamic-gradient-start': theme.gradientStart || '#1a1a2e',
    '--dynamic-gradient-end': theme.gradientEnd || '#16213e',
    '--dynamic-text': theme.textColor || '#ffffff',
    '--dynamic-overlay-opacity': theme.overlayOpacity || 0.8,
  };

  const backgroundStyle = {
    background: `linear-gradient(135deg, ${theme.gradientStart} 0%, ${theme.gradientEnd} 100%)`,
    position: 'relative',
    overflow: 'hidden'
  };

  const glowStyle = theme.glowEffect ? {
    boxShadow: `0 0 30px ${theme.primaryColor}40, 0 0 60px ${theme.secondaryColor}20`,
    filter: `drop-shadow(0 0 10px ${theme.primaryColor}60)`
  } : {};

  const animationClass = {
    'fade': 'animate-fade-in',
    'slide': 'animate-slide-in',
    'pulse': 'animate-pulse-glow',
    'none': ''
  }[theme.animationType] || 'animate-fade-in';

  return (
    <>
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-in {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 0 20px ${theme.primaryColor}40;
          }
          50% { 
            box-shadow: 0 0 40px ${theme.primaryColor}60, 0 0 60px ${theme.secondaryColor}30;
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.6s ease-out;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        .dynamic-gradient-bg {
          background: linear-gradient(135deg, ${theme.gradientStart} 0%, ${theme.gradientEnd} 100%);
        }
        
        .dynamic-text-primary {
          color: ${theme.primaryColor};
          text-shadow: 0 0 10px ${theme.primaryColor}60;
        }
        
        .dynamic-text-secondary {
          color: ${theme.secondaryColor};
          text-shadow: 0 0 8px ${theme.secondaryColor}50;
        }
        
        .dynamic-border {
          border: 1px solid ${theme.primaryColor}50;
        }
        
        .dynamic-border-secondary {
          border: 1px solid ${theme.secondaryColor}30;
        }
        
        .dynamic-bg-card {
          background: linear-gradient(135deg, 
            ${theme.gradientStart}95 0%, 
            ${theme.gradientEnd}90 50%, 
            ${theme.gradientStart}95 100%);
          backdrop-filter: blur(10px);
        }
        
        .dynamic-glow {
          box-shadow: 0 0 25px ${theme.primaryColor}40;
        }
        
        .dynamic-glow-secondary {
          box-shadow: 0 0 20px ${theme.secondaryColor}30;
        }
        
        .dynamic-overlay {
          background: linear-gradient(135deg, 
            ${theme.gradientStart}${Math.round(theme.overlayOpacity * 100).toString(16)} 0%, 
            ${theme.gradientEnd}${Math.round(theme.overlayOpacity * 85).toString(16)} 50%, 
            ${theme.gradientStart}${Math.round(theme.overlayOpacity * 100).toString(16)} 100%);
        }
      `}</style>
      
      <div 
        className={`${className} ${animationClass} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
        style={{ ...dynamicStyles, ...backgroundStyle, ...glowStyle }}
      >
        {/* Efectos de fondo decorativos */}
        {theme.glowEffect && (
          <>
            <div 
              className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
              style={{ 
                background: `radial-gradient(circle, ${theme.primaryColor} 0%, transparent 70%)`,
                animation: 'float 6s ease-in-out infinite'
              }}
            />
            <div 
              className="absolute bottom-0 right-0 w-40 h-40 rounded-full opacity-15 blur-3xl"
              style={{ 
                background: `radial-gradient(circle, ${theme.secondaryColor} 0%, transparent 70%)`,
                animation: 'float 8s ease-in-out infinite reverse'
              }}
            />
          </>
        )}
        
        {/* Overlay con gradiente dinámico */}
        <div className="absolute inset-0 dynamic-overlay" />
        
        {/* Contenido */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
      `}</style>
    </>
  );
}

// Componente para aplicar estilos dinámicos a elementos específicos
export function DynamicText({ theme, variant = 'primary', children, className = "", glow = false }) {
  if (!theme) return <span className={className}>{children}</span>;
  
  const color = variant === 'primary' ? theme.primaryColor : theme.secondaryColor;
  const glowStyle = glow ? { textShadow: `0 0 10px ${color}60` } : {};
  
  return (
    <span 
      className={className}
      style={{ color, ...glowStyle }}
    >
      {children}
    </span>
  );
}

// Componente para botones con tema dinámico
export function DynamicButton({ theme, children, onClick, className = "", variant = 'primary' }) {
  if (!theme) {
    return (
      <button onClick={onClick} className={`${className} bg-cyan-500 hover:bg-cyan-600 text-white`}>
        {children}
      </button>
    );
  }
  
  const isPrimary = variant === 'primary';
  const bgColor = isPrimary ? theme.primaryColor : theme.secondaryColor;
  const hoverColor = isPrimary ? theme.accentColor : theme.primaryColor;
  
  return (
    <button
      onClick={onClick}
      className={`${className} transition-all duration-300 transform hover:scale-105`}
      style={{
        backgroundColor: bgColor,
        color: theme.textColor,
        boxShadow: `0 4px 15px ${bgColor}40`,
        border: `1px solid ${bgColor}60`
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = hoverColor;
        e.target.style.boxShadow = `0 6px 20px ${hoverColor}50`;
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = bgColor;
        e.target.style.boxShadow = `0 4px 15px ${bgColor}40`;
      }}
    >
      {children}
    </button>
  );
}

// Componente para cards con tema dinámico
export function DynamicCard({ theme, children, className = "", glow = false }) {
  if (!theme) {
    return <div className={`${className} bg-gray-800 border border-gray-700`}>{children}</div>;
  }
  
  const cardStyle = {
    background: `linear-gradient(135deg, 
      ${theme.gradientStart}95 0%, 
      ${theme.gradientEnd}90 50%, 
      ${theme.gradientStart}95 100%)`,
    backdropFilter: 'blur(10px)',
    border: `1px solid ${theme.primaryColor}30`,
    boxShadow: glow ? `0 0 25px ${theme.primaryColor}20` : 'none'
  };
  
  return (
    <div className={`${className} transition-all duration-300`} style={cardStyle}>
      {children}
    </div>
  );
}
