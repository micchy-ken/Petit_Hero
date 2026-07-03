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
      console.log("Received POST request to /api/save-map");
      const mapData = req.body;
      console.log("Received map data ID:", mapData ? mapData.id : "null");
      console.log("Received full map data:", JSON.stringify(mapData));
      if (!mapData || !mapData.id) {
        console.error("Invalid map data received");
        return res.status(400).json({ error: "Invalid map data" });
      }

      // Convert id (e.g. map_beginning) to CamelCase (e.g. BeginningMap) for export name
      let exportName = mapData.id
        .split('_')
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      
      if (mapData.id === 'map_beginning') {
        exportName = 'BeginningMap';
      }
      
      const content = `import { MapData } from '../../types/MapData';

export const ${exportName}: MapData = ${JSON.stringify(mapData, null, 2)};
`;
      const fileName = `${exportName}.ts`;
      const filePath = path.join(process.cwd(), "src", "data", "maps", fileName);
      
      console.log(`Attempting to write to: ${filePath}`);
      fs.writeFileSync(filePath, content);
      console.log(`Successfully wrote file to: ${filePath}`);

      // Automatically update src/data/maps/index.ts
      const mapsDir = path.join(process.cwd(), "src", "data", "maps");
      const files = fs.readdirSync(mapsDir);
      const mapFiles = files.filter(f => f.endsWith(".ts") && f !== "index.ts");
      
      const imports = mapFiles.map(f => {
        const name = f.replace(".ts", "");
        return `import { ${name} } from './${name}';`;
      }).join("\n");
      
      const exports = mapFiles.map(f => f.replace(".ts", "")).join(",\n  ");
      
      const indexContent = `import { MapData } from '../../types/MapData';
${imports}

export const allMaps: MapData[] = [
  ${exports}
];
`;
      fs.writeFileSync(path.join(mapsDir, "index.ts"), indexContent);
      console.log(`Updated maps index.ts`);

      res.json({ success: true, filePath });
    } catch (e: any) {
      console.error("Error in /api/save-map:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/save-enemies", (req, res) => {
    try {
      const { enemyAssets, bossAssets } = req.body;
      if (!enemyAssets || !bossAssets) {
        return res.status(400).json({ error: "Invalid enemy data" });
      }

      const content = `export interface EnemyAsset {
  id: string;
  name: string;
  image?: string;
  hp: number;
  attack: number;
  speed: number;
  behavior: string;
}

export const EnemyAssets: Record<string, EnemyAsset[]> = ${JSON.stringify(enemyAssets, null, 2)};

export const BossAssets: Record<string, EnemyAsset[]> = ${JSON.stringify(bossAssets, null, 2)};

export const getAvailableEnemies = (bgMode: string) => {
  if (bgMode === 'text-black') return EnemyAssets['text-black'];
  if (bgMode === 'stone-gray') return EnemyAssets['stone-gray'];
  return EnemyAssets['color'];
};

export const getAvailableBosses = (bgMode: string) => {
  if (bgMode === 'text-black') return BossAssets['text-black'];
  if (bgMode === 'stone-gray') return BossAssets['stone-gray'];
  return BossAssets['color'];
};

export const getEnemyAssetById = (id: string): EnemyAsset | undefined => {
  for (const bgMode in EnemyAssets) {
    const found = EnemyAssets[bgMode].find(e => e.id === id);
    if (found) return found;
  }
  for (const bgMode in BossAssets) {
    const found = BossAssets[bgMode].find(e => e.id === id);
    if (found) return found;
  }
  return undefined;
};
`;
      const filePath = path.join(process.cwd(), "src", "data", "EnemyAssets.ts");
      fs.writeFileSync(filePath, content);
      res.json({ success: true, filePath });
    } catch (e: any) {
      console.error("Error in /api/save-enemies:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/maps", (req, res) => {
    try {
      const mapsDir = path.join(process.cwd(), "src", "data", "maps");
      const files = fs.readdirSync(mapsDir);
      const maps = [];
      for (const file of files) {
        if (file.endsWith(".ts") && file !== "index.ts") {
          const filePath = path.join(mapsDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          // Extract JSON using a highly flexible regex that supports trailing semicolons or not, arbitrary whitespace, etc.
          const match = content.match(/export const \w+\s*:\s*MapData\s*=\s*(\{[\s\S]*?\})\s*;?\s*$/) || 
                        content.match(/export const \w+\s*:\s*MapData\s*=\s*(\{[\s\S]*\})/);
          if (match && match[1]) {
            try {
              maps.push(JSON.parse(match[1]));
            } catch (err) {
              try {
                // Fallback: evaluate the object literal safely as standard JS object
                const parsedObject = new Function(`return ${match[1]}`)();
                maps.push(parsedObject);
              } catch (evalErr: any) {
                console.error("Failed to parse or evaluate JSON for file", file, evalErr.message);
              }
            }
          } else {
            console.warn(`Flexible regex did not match content of file: ${file}`);
          }
        }
      }
      console.log(`Loaded ${maps.length} maps from disk:`, maps.map(m => m.id));
      res.json(maps);
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
