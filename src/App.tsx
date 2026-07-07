import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import GamePage from './pages/GamePage';
import MapEditorPage from './pages/MapEditorPage';
import EnemyEditorPage from './pages/EnemyEditorPage';
import HeroEditorPage from './pages/HeroEditorPage';
import EventEditorPage from './pages/EventEditorPage';
import ItemEditorPage from './pages/ItemEditorPage';
import MagicEditorPage from './pages/MagicEditorPage';
import { CustomPopupProvider } from './components/CustomPopupProvider';

export default function App() {
  return (
    <CustomPopupProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/editor/map" element={<MapEditorPage />} />
          <Route path="/editor/enemy" element={<EnemyEditorPage />} />
          <Route path="/editor/hero" element={<HeroEditorPage />} />
          <Route path="/editor/event" element={<EventEditorPage />} />
          <Route path="/editor/item" element={<ItemEditorPage />} />
          <Route path="/editor/magic" element={<MagicEditorPage />} />
        </Routes>
      </HashRouter>
    </CustomPopupProvider>
  );
}


