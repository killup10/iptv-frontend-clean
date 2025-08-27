import React from "react";
import { Link } from "react-router-dom";

export const Dashboard = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Bienvenido a TeamG-Play 🎬</h1>
      <div className="flex flex-col space-y-4">
        <Link
          to="/catalogo"
          className="p-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Ver Películas y Series
        </Link>
      </div>
    </div>
  );
};
