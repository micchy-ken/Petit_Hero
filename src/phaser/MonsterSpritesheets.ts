import Phaser from 'phaser';

export function generateSlimeSpritesheet(scene: Phaser.Scene, mode: 'normal' | 'green' | 'red' | 'text' | 'grayscale' | boolean = 'normal'): string {
  const resolvedMode = mode === true ? 'text' : (mode === false ? 'normal' : mode);
  let textureKey = 'slime_spritesheet';
  if (resolvedMode === 'text') textureKey = 'slime_spritesheet_text';
  else if (resolvedMode === 'grayscale') textureKey = 'slime_spritesheet_gray';
  else if (resolvedMode === 'green') textureKey = 'slime_spritesheet_green';
  else if (resolvedMode === 'red') textureKey = 'slime_spritesheet_red';

  if (scene.textures.exists(textureKey)) {
    return textureKey;
  }

  const frameWidth = 64;
  const frameHeight = 64;
  const frames = 4; // 0: 待機, 1: 縮む(ぷるぷる前), 2: 伸びる(ぷるぷる), 3: ジャンプ/移動

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * frames;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = false;

  if (resolvedMode === 'grayscale') {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 32;
    tempCanvas.height = 32;
    const tCtx = tempCanvas.getContext('2d')!;
    tCtx.imageSmoothingEnabled = false;

    const gp = (x: number, y: number, w: number, h: number, color: string) => {
      tCtx.fillStyle = color;
      tCtx.fillRect(x, y, w, h);
    };

    for (let frame = 0; frame < frames; frame++) {
      const ox = frame * frameWidth;

      tCtx.clearRect(0, 0, 32, 32);

      tCtx.save();
      
      let scaleX = 1;
      let scaleY = 1;
      let offsetY = 0;

      if (frame === 1) { // 縮む
        scaleX = 1.2;
        scaleY = 0.8;
        offsetY = 3;
      } else if (frame === 2) { // 伸びる
        scaleX = 0.8;
        scaleY = 1.2;
        offsetY = -1;
      } else if (frame === 3) { // ジャンプ
        scaleX = 0.9;
        scaleY = 1.1;
        offsetY = -4;
      }

      tCtx.translate(16, 26); // Base of slime
      tCtx.scale(scaleX, scaleY);
      tCtx.translate(-16, -26 + offsetY);

      // Shadow on floor
      if (frame !== 3) {
        tCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        tCtx.beginPath();
        tCtx.ellipse(16, 27, 8, 2, 0, 0, Math.PI * 2);
        tCtx.fill();
      } else {
        tCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        tCtx.beginPath();
        tCtx.ellipse(16, 29, 5, 1, 0, 0, Math.PI * 2);
        tCtx.fill();
      }

      // Slime Body Outline
      gp(12, 14, 8, 12, '#444444');
      gp(10, 16, 12, 10, '#444444');
      gp(8, 19, 16, 7, '#444444');

      // Inner body
      gp(13, 15, 6, 10, '#888888');
      gp(11, 17, 10, 8, '#888888');
      gp(9, 20, 14, 5, '#888888');

      gp(14, 16, 4, 8, '#dddddd');
      gp(12, 18, 8, 6, '#dddddd');
      gp(10, 21, 12, 3, '#dddddd');

      // Eyes
      gp(12, 19, 1, 2, '#000000');
      gp(19, 19, 1, 2, '#000000');
      gp(12, 19, 1, 1, '#ffffff'); // sparkle
      gp(19, 19, 1, 1, '#ffffff');

      // Mouth
      gp(15, 22, 2, 1, '#000000');

      tCtx.restore();

      // Upscale 2x
      ctx.drawImage(tempCanvas, 0, 0, 32, 32, ox, 0, 64, 64);
    }
  } else if (resolvedMode === 'text') {
    ctx.fillStyle = '#ffffff'; // 白文字で「敵」
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px "Inter", sans-serif';

    for (let frame = 0; frame < frames; frame++) {
      const ox = frame * frameWidth + frameWidth / 2;
      const oy = frameHeight / 2;
      ctx.fillText('敵', ox, oy);
    }
  } else {

  const palette = {
    highlight: '#a5f3fc',
    bodyHi: '#38bdf8',
    body: '#0284c7',
    bodyDark: '#0369a1',
    shadow: '#0c4a6e',
    eye: '#ffffff',
    pupil: '#0f172a',
    mouth: '#0f172a'
  };

  if (resolvedMode === 'green') {
    palette.highlight = '#bbf7d0';
    palette.bodyHi = '#4ade80';
    palette.body = '#22c55e';
    palette.bodyDark = '#16a34a';
    palette.shadow = '#14532d';
  } else if (resolvedMode === 'red') {
    palette.highlight = '#fecdd3';
    palette.bodyHi = '#fb7185';
    palette.body = '#f43f5e';
    palette.bodyDark = '#e11d48';
    palette.shadow = '#881337';
  }

  const p = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  };

  // 各フレームの描画
  for (let frame = 0; frame < frames; frame++) {
    const ox = frame * frameWidth;
    
    ctx.save();
    ctx.translate(ox, 0);

    // フレームごとの変形 (スケーリングとY軸オフセット)
    let scaleX = 1;
    let scaleY = 1;
    let offsetY = 0;

    if (frame === 1) { // 縮む
      scaleX = 1.2;
      scaleY = 0.8;
      offsetY = 10;
    } else if (frame === 2) { // 伸びる
      scaleX = 0.8;
      scaleY = 1.2;
      offsetY = -4;
    } else if (frame === 3) { // ジャンプ
      scaleX = 0.9;
      scaleY = 1.1;
      offsetY = -12;
    }

    ctx.translate(32, 50); // スライムの底辺中央を基準にする
    ctx.scale(scaleX, scaleY);
    ctx.translate(-32, -50 + offsetY);

    // 影
    if (frame !== 3) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.beginPath();
      ctx.ellipse(32, 52, 16, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // ジャンプ中の影は小さく薄く
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.beginPath();
      ctx.ellipse(32, 60, 10, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // スライム本体 (玉ねぎ型)
    // ダークライン/アウトライン寄り
    p(24, 28, 16, 24, palette.shadow);
    p(20, 32, 24, 18, palette.shadow);
    p(16, 36, 32, 12, palette.shadow);
    
    // メインボディ
    p(25, 29, 14, 22, palette.bodyDark);
    p(21, 33, 22, 16, palette.bodyDark);
    p(17, 37, 30, 10, palette.bodyDark);

    p(26, 30, 12, 18, palette.body);
    p(22, 32, 18, 14, palette.body);
    p(19, 36, 26, 8, palette.body);

    p(27, 31, 8, 12, palette.bodyHi);
    p(24, 34, 12, 8, palette.bodyHi);
    
    // テカり (ハイライト)
    p(26, 33, 4, 4, palette.highlight);
    p(31, 32, 2, 2, palette.highlight);
    p(22, 38, 2, 4, palette.highlight);

    // 目 (左)
    p(22, 38, 4, 6, palette.eye);
    p(24, 40, 2, 4, palette.pupil);

    // 目 (右)
    p(38, 38, 4, 6, palette.eye);
    p(38, 40, 2, 4, palette.pupil);

    // 口
    p(30, 44, 4, 2, palette.mouth);

    ctx.restore();
  }
  } // <--- Added closing brace for else block

  scene.textures.addSpriteSheet(textureKey, canvas as unknown as HTMLImageElement, {
    frameWidth: frameWidth,
    frameHeight: frameHeight
  });

  return textureKey;
}

export function generateBatSpritesheet(scene: Phaser.Scene, mode: 'normal' | 'text' | 'grayscale' | boolean = 'normal'): string {
  const resolvedMode = mode === true ? 'text' : (mode === false ? 'normal' : mode);
  const textureKey = resolvedMode === 'text'
    ? 'bat_spritesheet_text'
    : (resolvedMode === 'grayscale' ? 'bat_spritesheet_gray' : 'bat_spritesheet');

  if (scene.textures.exists(textureKey)) {
    return textureKey;
  }

  const frameWidth = 64;
  const frameHeight = 64;
  const frames = 4;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * frames;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (resolvedMode === 'text') {
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px "Inter", sans-serif';
    for (let frame = 0; frame < frames; frame++) {
      ctx.fillText('蝙', frame * frameWidth + 32, 32);
    }
  } else {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 32;
    tempCanvas.height = 32;
    const tCtx = tempCanvas.getContext('2d')!;
    tCtx.imageSmoothingEnabled = false;

    const gp = (x: number, y: number, w: number, h: number, color: string) => {
      tCtx.fillStyle = color;
      tCtx.fillRect(x, y, w, h);
    };

    const isGray = resolvedMode === 'grayscale';
    const cBody = isGray ? '#666666' : '#2e1065';
    const cWing = isGray ? '#444444' : '#4c1d95';
    const cWingDark = isGray ? '#222222' : '#1e1b4b';
    const cEye = isGray ? '#ffffff' : '#f43f5e';
    const cMouth = '#ffffff';

    for (let frame = 0; frame < frames; frame++) {
      const ox = frame * frameWidth;
      tCtx.clearRect(0, 0, 32, 32);
      tCtx.save();

      // バウンド（上下浮遊）
      const bounceY = Math.sin((frame / frames) * Math.PI * 2) * 2;
      tCtx.translate(0, bounceY);

      // 床の影 (浮遊コウモリなので影は小さくて薄い)
      tCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      tCtx.beginPath();
      tCtx.ellipse(16, 28, 5 - Math.abs(bounceY) * 0.3, 1.5, 0, 0, Math.PI * 2);
      tCtx.fill();

      // コウモリの体 (16, 14 を中心とする)
      // 耳
      gp(13, 9, 2, 3, cBody);
      gp(17, 9, 2, 3, cBody);
      // 頭/体
      gp(12, 11, 8, 8, cBody);
      gp(13, 19, 6, 2, cBody);

      // 翼の描画 (フレーム別)
      if (frame === 0) {
        // 大きく広げた翼
        gp(5, 11, 7, 3, cWing);
        gp(20, 11, 7, 3, cWing);
        gp(3, 13, 9, 2, cWingDark);
        gp(20, 13, 9, 2, cWingDark);
        gp(2, 15, 6, 2, cWingDark);
        gp(24, 15, 6, 2, cWingDark);
      } else if (frame === 1 || frame === 3) {
        // 斜め上
        gp(6, 8, 6, 3, cWing);
        gp(20, 8, 6, 3, cWing);
        gp(8, 11, 4, 4, cWingDark);
        gp(20, 11, 4, 4, cWingDark);
        gp(10, 15, 2, 3, cWingDark);
        gp(20, 15, 2, 3, cWingDark);
      } else if (frame === 2) {
        // 閉じた翼 (下向き)
        gp(10, 13, 2, 7, cWing);
        gp(20, 13, 2, 7, cWing);
        gp(9, 14, 1, 5, cWingDark);
        gp(22, 14, 1, 5, cWingDark);
      }

      // 目
      gp(14, 13, 1, 2, cEye);
      gp(17, 13, 1, 2, cEye);

      // キバ (口)
      gp(15, 16, 2, 1, cBody);
      gp(15, 17, 1, 1, cMouth);
      gp(16, 17, 1, 1, cMouth);

      tCtx.restore();

      ctx.drawImage(tempCanvas, 0, 0, 32, 32, ox, 0, 64, 64);
    }
  }

  scene.textures.addSpriteSheet(textureKey, canvas as unknown as HTMLImageElement, {
    frameWidth: frameWidth,
    frameHeight: frameHeight
  });

  return textureKey;
}

export function generateGoblinSpritesheet(scene: Phaser.Scene, mode: 'normal' | 'text' | 'grayscale' | boolean = 'normal'): string {
  const resolvedMode = mode === true ? 'text' : (mode === false ? 'normal' : mode);
  const textureKey = resolvedMode === 'text'
    ? 'goblin_spritesheet_text'
    : (resolvedMode === 'grayscale' ? 'goblin_spritesheet_gray' : 'goblin_spritesheet');

  if (scene.textures.exists(textureKey)) {
    return textureKey;
  }

  const frameWidth = 64;
  const frameHeight = 64;
  const cols = 4;
  const rows = 4;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * cols;
  canvas.height = frameHeight * rows;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (resolvedMode === 'text') {
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px "Inter", sans-serif';
    const chars = ['ゴ', 'ゴ', 'ゴ', 'ゴ'];
    for (let dir = 0; dir < rows; dir++) {
      for (let frame = 0; frame < cols; frame++) {
        ctx.fillText(chars[dir], frame * frameWidth + 32, dir * frameHeight + 32);
      }
    }
  } else {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 32;
    tempCanvas.height = 32;
    const tCtx = tempCanvas.getContext('2d')!;
    tCtx.imageSmoothingEnabled = false;

    const gp = (x: number, y: number, w: number, h: number, color: string) => {
      tCtx.fillStyle = color;
      tCtx.fillRect(x, y, w, h);
    };

    const isGray = resolvedMode === 'grayscale';
    const cSkin = isGray ? '#777777' : '#16a34a'; // 緑
    const cSkinDark = isGray ? '#444444' : '#14532d'; // 濃い緑
    const cCloth = isGray ? '#555555' : '#854d0e'; // ボロ布 (黄色がかった茶)
    const cClothDark = isGray ? '#333333' : '#451a03';
    const cWeapon = isGray ? '#888888' : '#71717a'; // こん棒
    const cEye = isGray ? '#ffffff' : '#facc15'; // 黄色い目
    const cHair = isGray ? '#666666' : '#27272a'; // モヒカン風の黒髪

    for (let dir = 0; dir < rows; dir++) {
      for (let frame = 0; frame < cols; frame++) {
        const ox = frame * frameWidth;
        const oy = dir * frameHeight;

        tCtx.clearRect(0, 0, 32, 32);
        tCtx.save();

        const isStep1 = frame === 1;
        const isStep2 = frame === 3;
        const bobY = (isStep1 || isStep2) ? -1 : 0;
        const legOffset = isStep1 ? 1 : (isStep2 ? -1 : 0);

        tCtx.translate(0, bobY);

        // 床の影
        tCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        tCtx.beginPath();
        tCtx.ellipse(16, 28, 6, 2, 0, 0, Math.PI * 2);
        tCtx.fill();

        if (dir === 0) { // DOWN (Front)
          // 尖った耳 (左右)
          gp(7, 13, 3, 2, cSkinDark);
          gp(22, 13, 3, 2, cSkinDark);
          
          // 頭/顔
          gp(10, 10, 12, 9, cSkin);
          gp(11, 9, 10, 1, cHair); // モヒカン
          gp(14, 7, 4, 2, cHair);
          
          // ギョロ目
          gp(12, 13, 2, 2, cEye);
          gp(18, 13, 2, 2, cEye);
          gp(13, 14, 1, 1, '#000000');
          gp(18, 14, 1, 1, '#000000');
          
          // 牙/口
          gp(14, 16, 4, 1, cSkinDark);
          gp(14, 17, 1, 1, '#ffffff'); // 牙
          gp(17, 17, 1, 1, '#ffffff');

          // 体/服
          gp(10, 19, 12, 6, cCloth);
          gp(12, 25, 8, 2, cClothDark);

          // 手足
          gp(11, 25 + (legOffset > 0 ? -1 : 0), 2, 4, cSkin);
          gp(19, 25 + (legOffset < 0 ? -1 : 0), 2, 4, cSkin);
          
          // 武器 (こん棒)
          const wpY = 17 + (isStep2 ? -1 : 0);
          gp(23, wpY, 2, 6, cWeapon);
          gp(22, wpY - 2, 4, 3, cWeapon); // こん棒の頭
          gp(21, wpY + 4, 2, 2, cClothDark); // 手
          
        } else if (dir === 1) { // UP (Back)
          // 尖った耳 (左右)
          gp(7, 13, 3, 2, cSkinDark);
          gp(22, 13, 3, 2, cSkinDark);
          
          // 頭
          gp(10, 10, 12, 9, cSkinDark);
          gp(13, 6, 6, 4, cHair); // 後ろモヒカン

          // 体/服
          gp(10, 19, 12, 7, cClothDark);

          // 手足
          gp(11, 26 + (legOffset < 0 ? -1 : 0), 2, 3, cSkinDark);
          gp(19, 26 + (legOffset > 0 ? -1 : 0), 2, 3, cSkinDark);
          
        } else if (dir === 2) { // LEFT
          // 耳
          gp(21, 13, 3, 2, cSkinDark);

          // 頭
          gp(12, 10, 10, 9, cSkin);
          gp(16, 7, 3, 3, cHair); // モヒカン
          
          // 目 (左向き)
          gp(13, 13, 2, 2, cEye);
          gp(13, 14, 1, 1, '#000000');
          gp(11, 15, 2, 1, cSkinDark); // 鼻の突起

          // 体/服
          gp(12, 19, 9, 7, cCloth);

          // 足
          gp(13, 26 + (legOffset > 0 ? -1 : 0), 2, 3, cSkin);
          gp(17, 26 + (legOffset < 0 ? -1 : 0), 2, 3, cSkinDark);

          // 武器
          const wpY = 18 + (isStep1 ? -1 : 0);
          gp(8, wpY, 3, 2, cWeapon);
          gp(5, wpY - 1, 3, 4, cWeapon);
          gp(10, wpY, 2, 2, cSkin); // 手
          
        } else if (dir === 3) { // RIGHT
          // 耳
          gp(8, 13, 3, 2, cSkinDark);

          // 頭
          gp(10, 10, 10, 9, cSkin);
          gp(13, 7, 3, 3, cHair); // モヒカン
          
          // 目 (右向き)
          gp(17, 13, 2, 2, cEye);
          gp(18, 14, 1, 1, '#000000');
          gp(19, 15, 2, 1, cSkinDark); // 鼻の突起

          // 体/服
          gp(11, 19, 9, 7, cCloth);

          // 足
          gp(13, 26 + (legOffset < 0 ? -1 : 0), 2, 3, cSkinDark);
          gp(17, 26 + (legOffset > 0 ? -1 : 0), 2, 3, cSkin);

          // 武器
          const wpY = 18 + (isStep2 ? -1 : 0);
          gp(21, wpY, 3, 2, cWeapon);
          gp(24, wpY - 1, 3, 4, cWeapon);
          gp(20, wpY, 2, 2, cSkin); // 手
        }

        tCtx.restore();

        ctx.drawImage(tempCanvas, 0, 0, 32, 32, ox, oy, 64, 64);
      }
    }
  }

  scene.textures.addSpriteSheet(textureKey, canvas as unknown as HTMLImageElement, {
    frameWidth: frameWidth,
    frameHeight: frameHeight
  });

  return textureKey;
}
