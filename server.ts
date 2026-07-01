import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/save-map", (req, res) => {
    try {
      const mapData = req.body;
      if (!mapData || !mapData.id) {
        return res.status(400).json({ error: "Invalid map data" });
      }

      // Convert id (e.g. map_beginning) to CamelCase (e.g. BeginningMap) for export name
      const exportName = mapData.id
        .split('_')
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      
      const content = `import { MapData } from '../../types/MapData';

export const ${exportName}: MapData = ${JSON.stringify(mapData, null, 2)};
`;
      const fileName = `${exportName}.ts`;
      const filePath = path.join(process.cwd(), "src", "data", "maps", fileName);
      
      fs.writeFileSync(filePath, content);
      console.log(`Saved map to ${filePath}`);
      res.json({ success: true, filePath });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
