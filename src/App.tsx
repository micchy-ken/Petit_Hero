import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GamePage from './pages/GamePage';
import MapEditorPage from './pages/MapEditorPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/editor/map" element={<MapEditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

