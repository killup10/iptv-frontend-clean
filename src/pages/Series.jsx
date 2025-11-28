import React, { useState } from "react";
import { Link } from "react-router-dom";
import fondoImg from '../../assets/fondo.png';

export const Series = () => {
  const [activeSection, setActiveSection] = useState("todas");

  // Simulación de series por categorías
  const series = {
    todas: [
      { id: "1", title: "Serie 1", category: "general" },
      { id: "2", title: "Serie Infantil 1", category: "kids" },
    ],
    kids: [
      { id: "2", title: "Serie Infantil 1", category: "kids" },
      { id: "3", title: "Serie Infantil 2", category: "kids" },
    ]
  };

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
          backgroundImage: `url(${fondoImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-glow-primary">Series</h1>
          
          {/* Tabs de categorías */}
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => setActiveSection("todas")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                activeSection === "todas"
                  ? "text-white shadow-glow-primary"
                  : "text-gray-300 hover:text-white"
              }`}
              style={{
                backgroundColor: activeSection === "todas" 
                  ? 'hsl(var(--primary))' 
                  : 'hsl(var(--card-background) / 0.6)',
                border: '1px solid hsl(var(--input-border) / 0.3)'
              }}
            >
              Todas las Series
            </button>
            <button
              onClick={() => setActiveSection("kids")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                activeSection === "kids"
                  ? "text-white shadow-glow-primary"
                  : "text-gray-300 hover:text-white"
              }`}
              style={{
                backgroundColor: activeSection === "kids" 
                  ? 'hsl(var(--primary))' 
                  : 'hsl(var(--card-background) / 0.6)',
                border: '1px solid hsl(var(--input-border) / 0.3)'
              }}
            >
              ZONA KIDS
            </button>
          </div>

          {/* Lista de series */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {series[activeSection]?.map((serie) => (
              <Link
                key={serie.id}
                to={`/series/${serie.id}`}
                className="p-6 rounded-xl shadow-lg hover:shadow-glow-primary transition-all duration-300 flex items-center transform hover:scale-105"
                style={{
                  backgroundColor: 'hsl(var(--card-background) / 0.8)',
                  border: '1px solid hsl(var(--input-border) / 0.3)'
                }}
              >
                <div className="w-16 h-24 bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg mr-4"></div>
                <div>
                  <h3 className="font-semibold text-white text-lg">{serie.title}</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    {serie.category === "kids" ? "ZONA KIDS" : "Serie General"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};