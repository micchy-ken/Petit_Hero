import Phaser from 'phaser';

export function generateObstacleTextures(scene: Phaser.Scene) {
  const types = ['pillar', 'rock', 'peg', 'wall'];
  
  types.forEach(type => {
    const normalKey = `obstacle_${type}`;
    const grayKey = `obstacle_${type}_gray`;
    
    if (scene.textures.exists(normalKey)) return;
    
    // Create Normal Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    
    const gp = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * 4, y * 4, w * 4, h * 4);
    };
    
    if (type === 'pillar') {
      // Shaded stone pillar pixel art (16x16 grid, scaled by 4)
      
      // Shadow / Ground Ring
      gp(3, 14, 10, 2, '#1e293b');
      
      // Outer outline
      gp(3, 2, 10, 13, '#111827');
      
      // Pedestal Base (y=12, 13)
      gp(4, 12, 8, 2, '#374151');
      gp(5, 12, 6, 1, '#6b7280');
      gp(6, 12, 4, 1, '#9ca3af');
      gp(4, 13, 8, 1, '#1f2937');
      
      // Shaft columns (y=4 to 11)
      for (let y = 4; y <= 11; y++) {
        gp(4, y, 8, 1, '#374151'); // base dark
        gp(5, y, 1, 1, '#1f2937'); // fluting line 1
        gp(6, y, 2, 1, '#4b5563'); // column 1
        gp(8, y, 1, 1, '#374151'); // fluting line 2
        gp(9, y, 2, 1, '#9ca3af'); // column 2 highlight
        gp(11, y, 1, 1, '#f3f4f6'); // bright edge highlight
      }
      
      // Capital Top (y=2, 3)
      gp(4, 2, 8, 2, '#4b5563');
      gp(4, 2, 8, 1, '#9ca3af');
      gp(5, 2, 6, 1, '#f3f4f6');
      gp(3, 3, 10, 1, '#1f2937');
      
    } else if (type === 'rock') {
      // Jagged high-definition granite rock pixel art
      
      // Base shadow
      gp(2, 13, 12, 3, '#0f172a');
      
      // General outline
      gp(4, 2, 8, 1, '#1e293b'); // top
      gp(3, 3, 10, 1, '#1e293b');
      gp(2, 4, 12, 10, '#1e293b'); // middle
      gp(1, 14, 14, 1, '#1e293b'); // bottom
      
      // Fills & Shading (top-left light source)
      gp(5, 3, 4, 2, '#cbd5e1');
      gp(4, 4, 3, 3, '#cbd5e1');
      gp(3, 5, 2, 4, '#cbd5e1');
      gp(5, 5, 3, 3, '#94a3b8'); // mid-light
      
      gp(9, 3, 3, 2, '#64748b');
      gp(10, 5, 3, 4, '#475569');
      
      gp(2, 9, 5, 5, '#64748b');
      gp(3, 7, 3, 2, '#94a3b8');
      
      gp(7, 8, 7, 6, '#334155');
      gp(9, 9, 5, 5, '#1e293b');
      
      // Sharp highlights on ridges
      gp(5, 2, 1, 1, '#f1f5f9');
      gp(4, 3, 1, 1, '#f1f5f9');
      gp(3, 4, 1, 1, '#f1f5f9');
      gp(2, 9, 1, 1, '#cbd5e1');
      gp(7, 5, 1, 3, '#cbd5e1');
      
    } else if (type === 'peg') {
      // Wooden stake/peg driven into ground with rope wrap
      
      // Outline of wood post
      gp(4, 3, 8, 12, '#1c1917');
      
      // Base wood texture
      gp(5, 4, 6, 11, '#78350f'); // Dark brown base
      
      // Wood shading & grain highlight
      for (let y = 4; y <= 14; y++) {
        gp(7, y, 2, 1, '#b45309'); // Mid brown
        gp(9, y, 1, 1, '#d97706'); // Light brown
        gp(10, y, 1, 1, '#f59e0b'); // Golden highlight on right
      }
      
      // Pointy top tip
      gp(5, 3, 6, 1, '#1c1917');
      gp(7, 3, 2, 1, '#b45309');
      
      // Rope wrapping (Row 1 at y=6,7, Row 2 at y=11,12)
      const drawRope = (ry: number) => {
        gp(4, ry, 8, 2, '#292524'); // Rope outline
        gp(5, ry, 6, 1, '#a8a29e');  // Rope shadow
        gp(5, ry + 1, 6, 1, '#e7e5e4'); // Rope highlight
        // Rope coils/threads
        gp(5, ry, 1, 2, '#44403c');
        gp(7, ry, 1, 2, '#44403c');
        gp(9, ry, 1, 2, '#44403c');
      };
      
      drawRope(6);
      drawRope(11);
      
      // Soil/Ground mound at base
      gp(3, 14, 10, 2, '#451a03'); // Dark soil outline
      gp(4, 15, 8, 1, '#78350f');  // Soil
      gp(6, 15, 4, 1, '#a16207');  // Sand highlight
      
    } else if (type === 'wall') {
      // Masonry brick wall tile
      
      // Solid dark base outline/mortar lines
      gp(0, 0, 16, 16, '#1a0505');
      
      // Row 1: y=1 to 3
      gp(1, 1, 6, 2, '#991b1b');
      gp(1, 1, 6, 1, '#ef4444'); // Highlight top
      gp(6, 2, 1, 1, '#7f1d1d'); // Shadow bottom-right
      
      gp(9, 1, 6, 2, '#991b1b');
      gp(9, 1, 6, 1, '#ef4444');
      gp(14, 2, 1, 1, '#7f1d1d');
      
      // Row 2: y=5 to 7 (Offset)
      gp(1, 5, 2, 2, '#7f1d1d');
      gp(1, 5, 2, 1, '#ef4444');
      
      gp(5, 5, 6, 2, '#991b1b');
      gp(5, 5, 6, 1, '#ef4444');
      gp(10, 6, 1, 1, '#7f1d1d');
      
      gp(13, 5, 2, 2, '#7f1d1d');
      gp(13, 5, 2, 1, '#ef4444');
      
      // Row 3: y=9 to 11
      gp(1, 9, 7, 2, '#991b1b');
      gp(1, 9, 7, 1, '#f87171'); // brighter accent
      gp(7, 10, 1, 1, '#7f1d1d');
      
      gp(10, 9, 5, 2, '#7f1d1d');
      gp(10, 9, 5, 1, '#b91c1c');
      
      // Row 4: y=13 to 15
      gp(1, 13, 4, 2, '#991b1b');
      gp(1, 13, 4, 1, '#ef4444');
      gp(4, 14, 1, 1, '#7f1d1d');
      
      gp(7, 13, 8, 2, '#991b1b');
      gp(7, 13, 8, 1, '#ef4444');
      gp(14, 14, 1, 1, '#7f1d1d');
    }
    
    scene.textures.addCanvas(normalKey, canvas);
    
    // Create Grayscale Canvas
    const grayCanvas = document.createElement('canvas');
    grayCanvas.width = 64;
    grayCanvas.height = 64;
    const grayCtx = grayCanvas.getContext('2d')!;
    grayCtx.imageSmoothingEnabled = false;
    
    // Draw the colored canvas on it
    grayCtx.drawImage(canvas, 0, 0);
    
    // Convert to grayscale
    try {
      const imgData = grayCtx.getImageData(0, 0, 64, 64);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = avg;     // R
        data[i + 1] = avg; // G
        data[i + 2] = avg; // B
      }
      grayCtx.putImageData(imgData, 0, 0);
    } catch (err) {
      console.error("Error creating grayscale obstacle texture", err);
    }
    
    scene.textures.addCanvas(grayKey, grayCanvas);
  });
}
