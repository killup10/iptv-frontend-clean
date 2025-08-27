import React from "react";
import { Link } from "react-router-dom";

export const Movies = () => {
  // Simulación de pelis
  const movies = [
    { id: "1", title: "Ejemplo Película 4K" },
    { id: "2", title: "Otra Película 4K" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

        :root {
          --background: 254 50% 5%;
          --foreground: 210 40% 98%;
          --primary: 190 100% 50%;
          --primary-foreground: 254 50% 5%;
          --secondary: 315 100% 60%;
          --secondary-foreground: 210 40% 98%;
          --muted-foreground: 190 30% 80%;
          --card-background: 254 50% 8%;
          --input-background: 254 50% 12%;
          --input-border: 315 100% 25%;
          --footer-text: 210 40% 70%;
        }

        body {
          font-family: 'Inter', sans-serif;
        }

        .text-glow-primary {
          text-shadow: 0 0 5px hsl(var(--primary) / 0.8), 0 0 10px hsl(var(--primary) / 0.6);
        }
        .text-glow-secondary {
          text-shadow: 0 0 5px hsl(var(--secondary) / 0.8), 0 0 10px hsl(var(--secondary) / 0.6);
        }
        .shadow-glow-primary {
          box-shadow: 0 0 25px hsl(var(--primary) / 0.8);
        }
        .drop-shadow-glow-logo {
          filter: drop-shadow(0 0 25px hsl(var(--secondary) / 0.6)) drop-shadow(0 0 15px hsl(var(--primary) / 0.5));
        }
      `}</style>
      <div 
        className="text-white min-h-screen"
        style={{
          backgroundImage: "url('/fondo.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-glow-primary">Películas Disponibles</h1>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {movies.map((movie) => (
              <Link
                key={movie.id}
                to={`/player/${movie.id}`}
                className="rounded-xl shadow-lg hover:shadow-glow-primary transition-all duration-300 overflow-hidden flex flex-col transform hover:scale-105"
                style={{
                  backgroundColor: 'hsl(var(--card-background) / 0.8)',
                  border: '1px solid hsl(var(--input-border) / 0.3)'
                }}
              >
                <div className="w-full aspect-[2/3] bg-gradient-to-br from-purple-900 to-blue-900"></div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2 text-white">{movie.title}</h3>
                  <p className="text-xs text-gray-300 mt-1">Haz clic para reproducir</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
