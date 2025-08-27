import React from 'react';
import TestVideoPlayer from '../components/TestVideoPlayer';

export default function TestPlayer() {
  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          Test de Reproductor Android
        </h1>
        <TestVideoPlayer />
      </div>
    </div>
  );
}
