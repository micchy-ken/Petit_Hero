import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import GamePage from './pages/GamePage';
import MapEditorPage from './pages/MapEditorPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/editor/map" element={<MapEditorPage />} />
      </Routes>
    </HashRouter>
  );
}

