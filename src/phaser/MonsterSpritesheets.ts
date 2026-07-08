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

export function generateDemonKingSpritesheet(scene: Phaser.Scene, mode: 'normal' | 'grayscale' = 'normal'): string {
  const isGray = mode === 'grayscale';
  const textureKey = isGray ? 'demon_king_spritesheet_gray' : 'demon_king_spritesheet';

  if (scene.textures.exists(textureKey)) {
    return textureKey;
  }

  const frameWidth = 128;
  const frameHeight = 128;
  const cols = 4;
  const rows = 4;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * cols;
  canvas.height = frameHeight * rows;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;

  // Colors
  const cBodyGradStart = isGray ? '#555555' : '#1e1b4b'; // 深い紺
  const cBodyGradEnd = isGray ? '#1e1e1e' : '#090514';
  const cCapeStart = isGray ? '#444444' : '#4c1d95'; // 紫マント
  const cCapeEnd = isGray ? '#1a1a1a' : '#1e0a3b';
  const cCapeInnerStart = isGray ? '#333333' : '#991b1b'; // 内側の赤
  const cCapeInnerEnd = isGray ? '#111111' : '#2d0606';
  const cSkinStart = isGray ? '#cbd5e1' : '#cbd5e1'; // 威厳ある青白い肌
  const cSkinEnd = isGray ? '#64748b' : '#64748b';
  const cCrownStart = isGray ? '#e2e8f0' : '#fbbf24'; // ゴールド
  const cCrownEnd = isGray ? '#94a3b8' : '#d97706';
  const cEye = isGray ? '#ffffff' : '#ef4444'; // 赤い目
  const cEyeGlow = isGray ? 'rgba(255,255,255,0.4)' : 'rgba(239,68,68,0.5)';

  for (let dir = 0; dir < rows; dir++) {
    for (let frame = 0; frame < cols; frame++) {
      const ox = frame * frameWidth;
      const oy = dir * frameHeight;

      ctx.save();
      ctx.translate(ox, oy);

      const isStep1 = frame === 1;
      const isStep2 = frame === 3;
      const bobY = (isStep1 || isStep2) ? -4 : 0;
      const legOffset = isStep1 ? 4 : (isStep2 ? -4 : 0);

      ctx.translate(0, bobY);

      // 床の影 (巨大ぼかし)
      const shadowGrad = ctx.createRadialGradient(64, 112, 5, 64, 112, 36);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(64, 112, 36, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      const getGradY = (y1: number, y2: number, c1: string, c2: string) => {
        const grad = ctx.createLinearGradient(0, y1, 0, y2);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        return grad;
      };

      if (dir === 0) { // DOWN (正面)
        // 1. ツノ
        ctx.fillStyle = getGradY(16, 48, isGray ? '#777777' : '#312e81', isGray ? '#222222' : '#0f172a');
        ctx.beginPath();
        ctx.moveTo(36, 24);
        ctx.bezierCurveTo(28, 16, 24, 12, 28, 6);
        ctx.bezierCurveTo(34, 10, 38, 18, 42, 26);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(92, 24);
        ctx.bezierCurveTo(100, 16, 104, 12, 100, 6);
        ctx.bezierCurveTo(94, 10, 90, 18, 86, 26);
        ctx.closePath();
        ctx.fill();

        // 2. マント
        ctx.fillStyle = getGradY(50, 110, cCapeStart, cCapeEnd);
        ctx.beginPath();
        ctx.moveTo(32, 52);
        ctx.bezierCurveTo(20, 60, 16, 80, 16, 104);
        ctx.bezierCurveTo(30, 108, 50, 100, 64, 100);
        ctx.bezierCurveTo(78, 100, 98, 108, 112, 104);
        ctx.bezierCurveTo(112, 80, 108, 60, 96, 52);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = getGradY(52, 100, cCapeInnerStart, cCapeInnerEnd);
        ctx.beginPath();
        ctx.moveTo(38, 52);
        ctx.lineTo(64, 96);
        ctx.lineTo(90, 52);
        ctx.closePath();
        ctx.fill();

        // 3. 体 / 鎧
        ctx.fillStyle = getGradY(50, 102, cBodyGradStart, cBodyGradEnd);
        ctx.beginPath();
        ctx.roundRect(40, 50, 48, 52, [10, 10, 4, 4]);
        ctx.fill();

        // 4. 肩当 (真鍮ゴールド)
        ctx.fillStyle = getGradY(50, 64, cCrownStart, cCrownEnd);
        ctx.beginPath();
        ctx.roundRect(32, 48, 14, 14, 4);
        ctx.roundRect(82, 48, 14, 14, 4);
        ctx.fill();

        // 5. 頭部・顔
        ctx.fillStyle = getGradY(26, 52, cSkinStart, cSkinEnd);
        ctx.beginPath();
        ctx.roundRect(44, 26, 40, 26, [14, 14, 8, 8]);
        ctx.fill();

        // 6. 王冠
        ctx.fillStyle = getGradY(12, 28, cCrownStart, cCrownEnd);
        ctx.beginPath();
        ctx.moveTo(48, 26);
        ctx.lineTo(48, 14);
        ctx.lineTo(54, 20);
        ctx.lineTo(64, 10);
        ctx.lineTo(74, 20);
        ctx.lineTo(80, 14);
        ctx.lineTo(80, 26);
        ctx.closePath();
        ctx.fill();

        // 王冠の宝石
        ctx.fillStyle = isGray ? '#ffffff' : '#ef4444';
        ctx.beginPath();
        ctx.arc(64, 20, 3, 0, Math.PI * 2);
        ctx.fill();

        // 7. 髪
        ctx.fillStyle = isGray ? '#222222' : '#0f172a';
        ctx.beginPath();
        ctx.roundRect(42, 38, 4, 16, 2);
        ctx.roundRect(82, 38, 4, 16, 2);
        ctx.fill();

        // 8. 輝く赤目
        ctx.fillStyle = cEye;
        ctx.beginPath();
        ctx.arc(54, 38, 3.5, 0, Math.PI * 2);
        ctx.arc(74, 38, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(55, 37, 1, 0, Math.PI * 2);
        ctx.arc(75, 37, 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cEyeGlow;
        ctx.beginPath();
        ctx.arc(54, 38, 7, 0, Math.PI * 2);
        ctx.arc(74, 38, 7, 0, Math.PI * 2);
        ctx.fill();

        // 口
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(60, 46);
        ctx.lineTo(68, 46);
        ctx.stroke();

        // 9. 足
        ctx.fillStyle = isGray ? '#444444' : '#1e293b';
        ctx.beginPath();
        ctx.roundRect(48, 100 + legOffset, 10, 12, 3);
        ctx.roundRect(70, 100 - legOffset, 10, 12, 3);
        ctx.fill();

        // 10. 巨大な魔法の杖
        const staffY = 32 + (isStep2 ? -4 : 0);
        ctx.fillStyle = getGradY(staffY, staffY + 70, isGray ? '#888888' : '#78350f', isGray ? '#333333' : '#451a03');
        ctx.beginPath();
        ctx.roundRect(96, staffY, 6, 76, 3);
        ctx.fill();

        ctx.fillStyle = getGradY(staffY - 14, staffY, cCrownStart, cCrownEnd);
        ctx.beginPath();
        ctx.arc(99, staffY - 2, 9, 0, Math.PI * 2);
        ctx.fill();

        const coreGrad = ctx.createRadialGradient(99, staffY - 14, 1, 99, staffY - 14, 12);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, '#ef4444');
        coreGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(99, staffY - 14, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = getGradY(staffY + 36, staffY + 46, cSkinStart, cSkinEnd);
        ctx.beginPath();
        ctx.roundRect(92, staffY + 32, 10, 10, 3);
        ctx.fill();

      } else if (dir === 1) { // UP (後ろ姿)
        ctx.fillStyle = getGradY(16, 48, isGray ? '#666666' : '#2d1e54', isGray ? '#1e1a3a' : '#08051a');
        ctx.beginPath();
        ctx.moveTo(36, 24);
        ctx.bezierCurveTo(28, 16, 24, 12, 28, 6);
        ctx.bezierCurveTo(34, 10, 38, 18, 42, 26);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(92, 24);
        ctx.bezierCurveTo(100, 16, 104, 12, 100, 6);
        ctx.bezierCurveTo(94, 10, 90, 18, 86, 26);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = getGradY(48, 108, cCapeStart, cCapeEnd);
        ctx.beginPath();
        ctx.moveTo(30, 48);
        ctx.bezierCurveTo(14, 56, 12, 80, 12, 104);
        ctx.bezierCurveTo(30, 108, 50, 102, 64, 102);
        ctx.bezierCurveTo(78, 102, 98, 108, 116, 104);
        ctx.bezierCurveTo(116, 80, 114, 56, 98, 48);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = isGray ? '#111111' : '#090d16';
        ctx.beginPath();
        ctx.roundRect(44, 26, 40, 24, [10, 10, 2, 2]);
        ctx.fill();

        ctx.fillStyle = getGradY(14, 28, cCrownEnd, '#5b21b6');
        ctx.beginPath();
        ctx.moveTo(48, 26);
        ctx.lineTo(48, 16);
        ctx.lineTo(54, 22);
        ctx.lineTo(64, 14);
        ctx.lineTo(74, 22);
        ctx.lineTo(80, 16);
        ctx.lineTo(80, 26);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = isGray ? '#222222' : '#0f172a';
        ctx.beginPath();
        ctx.roundRect(48, 102 - legOffset, 10, 10, 2);
        ctx.roundRect(70, 102 + legOffset, 10, 10, 2);
        ctx.fill();

      } else if (dir === 2) { // LEFT
        ctx.fillStyle = getGradY(16, 48, isGray ? '#777777' : '#312e81', isGray ? '#222222' : '#0f172a');
        ctx.beginPath();
        ctx.moveTo(44, 24);
        ctx.bezierCurveTo(34, 16, 28, 12, 34, 6);
        ctx.bezierCurveTo(40, 10, 46, 18, 50, 26);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = getGradY(50, 110, cCapeStart, cCapeEnd);
        ctx.beginPath();
        ctx.moveTo(52, 50);
        ctx.bezierCurveTo(34, 58, 28, 80, 28, 104);
        ctx.bezierCurveTo(45, 108, 65, 100, 80, 100);
        ctx.bezierCurveTo(86, 80, 88, 60, 80, 50);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = getGradY(50, 102, cBodyGradStart, cBodyGradEnd);
        ctx.beginPath();
        ctx.roundRect(44, 50, 36, 52, [8, 8, 4, 4]);
        ctx.fill();

        ctx.fillStyle = getGradY(26, 52, cSkinStart, cSkinEnd);
        ctx.beginPath();
        ctx.roundRect(40, 26, 36, 26, [14, 14, 8, 8]);
        ctx.fill();

        ctx.fillStyle = isGray ? '#222222' : '#0f172a';
        ctx.beginPath();
        ctx.roundRect(66, 28, 10, 24, 4);
        ctx.fill();

        ctx.fillStyle = getGradY(12, 28, cCrownStart, cCrownEnd);
        ctx.beginPath();
        ctx.moveTo(44, 26);
        ctx.lineTo(44, 14);
        ctx.lineTo(52, 20);
        ctx.lineTo(60, 10);
        ctx.lineTo(68, 22);
        ctx.lineTo(68, 26);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = cEye;
        ctx.beginPath();
        ctx.arc(48, 38, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cEyeGlow;
        ctx.beginPath();
        ctx.arc(48, 38, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isGray ? '#444444' : '#1e293b';
        ctx.beginPath();
        ctx.roundRect(48, 100 + legOffset, 10, 12, 3);
        ctx.roundRect(62, 100 - legOffset, 10, 12, 3);
        ctx.fill();

        const staffY = 32 + (isStep1 ? -4 : 0);
        ctx.fillStyle = getGradY(staffY, staffY + 70, isGray ? '#888888' : '#78350f', isGray ? '#333333' : '#451a03');
        ctx.beginPath();
        ctx.roundRect(24, staffY, 6, 76, 3);
        ctx.fill();

        ctx.fillStyle = getGradY(staffY - 14, staffY, cCrownStart, cCrownEnd);
        ctx.beginPath();
        ctx.arc(27, staffY - 2, 9, 0, Math.PI * 2);
        ctx.fill();

        const coreGrad = ctx.createRadialGradient(27, staffY - 14, 1, 27, staffY - 14, 12);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, '#ef4444');
        coreGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(27, staffY - 14, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = getGradY(staffY + 36, staffY + 46, cSkinStart, cSkinEnd);
        ctx.beginPath();
        ctx.roundRect(26, staffY + 32, 10, 10, 3);
        ctx.fill();

      } else if (dir === 3) { // RIGHT
        ctx.fillStyle = getGradY(16, 48, isGray ? '#777777' : '#312e81', isGray ? '#222222' : '#0f172a');
        ctx.beginPath();
        ctx.moveTo(84, 24);
        ctx.bezierCurveTo(94, 16, 100, 12, 94, 6);
        ctx.bezierCurveTo(88, 10, 82, 18, 78, 26);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = getGradY(50, 110, cCapeStart, cCapeEnd);
        ctx.beginPath();
        ctx.moveTo(48, 50);
        ctx.bezierCurveTo(42, 60, 40, 80, 48, 104);
        ctx.bezierCurveTo(63, 108, 83, 100, 100, 104);
        ctx.bezierCurveTo(100, 80, 94, 58, 76, 50);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = getGradY(50, 102, cBodyGradStart, cBodyGradEnd);
        ctx.beginPath();
        ctx.roundRect(48, 50, 36, 52, [8, 8, 4, 4]);
        ctx.fill();

        ctx.fillStyle = getGradY(26, 52, cSkinStart, cSkinEnd);
        ctx.beginPath();
        ctx.roundRect(52, 26, 36, 26, [14, 14, 8, 8]);
        ctx.fill();

        ctx.fillStyle = isGray ? '#222222' : '#0f172a';
        ctx.beginPath();
        ctx.roundRect(52, 28, 10, 24, 4);
        ctx.fill();

        ctx.fillStyle = getGradY(12, 28, cCrownStart, cCrownEnd);
        ctx.beginPath();
        ctx.moveTo(60, 26);
        ctx.lineTo(60, 22);
        ctx.lineTo(68, 10);
        ctx.lineTo(76, 20);
        ctx.lineTo(84, 14);
        ctx.lineTo(84, 26);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = cEye;
        ctx.beginPath();
        ctx.arc(80, 38, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cEyeGlow;
        ctx.beginPath();
        ctx.arc(80, 38, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isGray ? '#444444' : '#1e293b';
        ctx.beginPath();
        ctx.roundRect(56, 100 - legOffset, 10, 12, 3);
        ctx.roundRect(70, 100 + legOffset, 10, 12, 3);
        ctx.fill();

        const staffY = 32 + (isStep2 ? -4 : 0);
        ctx.fillStyle = getGradY(staffY, staffY + 70, isGray ? '#888888' : '#78350f', isGray ? '#333333' : '#451a03');
        ctx.beginPath();
        ctx.roundRect(98, staffY, 6, 76, 3);
        ctx.fill();

        ctx.fillStyle = getGradY(staffY - 14, staffY, cCrownStart, cCrownEnd);
        ctx.beginPath();
        ctx.arc(101, staffY - 2, 9, 0, Math.PI * 2);
        ctx.fill();

        const coreGrad = ctx.createRadialGradient(101, staffY - 14, 1, 101, staffY - 14, 12);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, '#ef4444');
        coreGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(101, staffY - 14, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = getGradY(staffY + 36, staffY + 46, cSkinStart, cSkinEnd);
        ctx.beginPath();
        ctx.roundRect(92, staffY + 32, 10, 10, 3);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  scene.textures.addSpriteSheet(textureKey, canvas as unknown as HTMLImageElement, {
    frameWidth,
    frameHeight
  });

  return textureKey;
}

export function generateDragonSpritesheet(scene: Phaser.Scene): string {
  const textureKey = 'dragon_spritesheet';

  if (scene.textures.exists(textureKey)) {
    return textureKey;
  }

  const frameWidth = 128;
  const frameHeight = 128;
  const cols = 4;
  const rows = 4;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * cols;
  canvas.height = frameHeight * rows;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;

  // Colors
  const cBody = '#dc2626'; // 赤
  const cBodyDark = '#7f1d1d'; // 深赤
  const cChestStart = '#fbbf24'; // 金色のお腹
  const cChestEnd = '#d97706';
  const cWingStart = '#7f1d1d'; // 暗い赤の翼
  const cWingEnd = '#450a0a';
  const cWingHi = '#b91c1c'; // 翼の骨格
  const cHorn = '#f3f4f6'; // 白い角
  const cEye = '#10b981'; // 緑目
  const cEyeGlow = 'rgba(16, 185, 129, 0.4)';

  for (let dir = 0; dir < rows; dir++) {
    for (let frame = 0; frame < cols; frame++) {
      const ox = frame * frameWidth;
      const oy = dir * frameHeight;

      ctx.save();
      ctx.translate(ox, oy);

      const isStep1 = frame === 1;
      const isStep2 = frame === 3;
      const bobY = (isStep1 || isStep2) ? -4 : 0;
      const wingFlap = (isStep1 || isStep2) ? -8 : 0; // 羽ばたき
      const legOffset = isStep1 ? 4 : (isStep2 ? -4 : 0);

      ctx.translate(0, bobY);

      // 床の影 (巨大ぼかし)
      const shadowGrad = ctx.createRadialGradient(64, 112, 5, 64, 112, 40);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(64, 112, 40, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      const getGradY = (y1: number, y2: number, c1: string, c2: string) => {
        const grad = ctx.createLinearGradient(0, y1, 0, y2);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        return grad;
      };

      if (dir === 0) { // DOWN (正面)
        // 1. 巨大な翼 (はためき)
        ctx.fillStyle = getGradY(32 + wingFlap, 80 + wingFlap, cWingStart, cWingEnd);
        ctx.beginPath();
        ctx.moveTo(48, 52);
        ctx.bezierCurveTo(24, 28 + wingFlap, 8, 32 + wingFlap, 8, 68 + wingFlap);
        ctx.bezierCurveTo(24, 76 + wingFlap, 36, 68 + wingFlap, 48, 64);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = cWingHi;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(48, 52);
        ctx.lineTo(12, 36 + wingFlap);
        ctx.lineTo(8, 68 + wingFlap);
        ctx.stroke();

        ctx.fillStyle = getGradY(32 + wingFlap, 80 + wingFlap, cWingStart, cWingEnd);
        ctx.beginPath();
        ctx.moveTo(80, 52);
        ctx.bezierCurveTo(104, 28 + wingFlap, 120, 32 + wingFlap, 120, 68 + wingFlap);
        ctx.bezierCurveTo(104, 76 + wingFlap, 92, 68 + wingFlap, 80, 64);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = cWingHi;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, 52);
        ctx.lineTo(116, 36 + wingFlap);
        ctx.lineTo(120, 68 + wingFlap);
        ctx.stroke();

        // 2. ドラゴンの体
        ctx.fillStyle = getGradY(52, 104, cBody, cBodyDark);
        ctx.beginPath();
        ctx.roundRect(40, 52, 48, 48, [24, 24, 12, 12]);
        ctx.fill();

        // 3. 黄金のお腹
        ctx.fillStyle = getGradY(60, 96, cChestStart, cChestEnd);
        ctx.beginPath();
        ctx.roundRect(48, 60, 32, 34, 10);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 2;
        for (let lY = 68; lY <= 88; lY += 6) {
          ctx.beginPath();
          ctx.moveTo(52, lY);
          ctx.lineTo(76, lY);
          ctx.stroke();
        }

        // 4. 首と頭
        ctx.fillStyle = getGradY(20, 56, cBody, cBodyDark);
        ctx.beginPath();
        ctx.roundRect(44, 20, 40, 36, [14, 14, 8, 8]);
        ctx.fill();

        // 5. 白い角
        ctx.fillStyle = cHorn;
        ctx.beginPath();
        ctx.moveTo(48, 20);
        ctx.bezierCurveTo(36, 8, 32, 4, 36, 0);
        ctx.bezierCurveTo(42, 4, 46, 12, 52, 20);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(80, 20);
        ctx.bezierCurveTo(92, 8, 96, 4, 92, 0);
        ctx.bezierCurveTo(86, 4, 82, 12, 76, 20);
        ctx.closePath();
        ctx.fill();

        // 6. 緑の目
        ctx.fillStyle = cEye;
        ctx.beginPath();
        ctx.arc(54, 32, 4, 0, Math.PI * 2);
        ctx.arc(74, 32, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(55, 31, 1.2, 0, Math.PI * 2);
        ctx.arc(75, 31, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cEyeGlow;
        ctx.beginPath();
        ctx.arc(54, 32, 8, 0, Math.PI * 2);
        ctx.arc(74, 32, 8, 0, Math.PI * 2);
        ctx.fill();

        // 牙
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(52, 46); ctx.lineTo(55, 52); ctx.lineTo(58, 46);
        ctx.moveTo(70, 46); ctx.lineTo(73, 52); ctx.lineTo(76, 46);
        ctx.closePath();
        ctx.fill();

        // 7. 足
        ctx.fillStyle = getGradY(92, 106, cBody, cBodyDark);
        ctx.beginPath();
        ctx.roundRect(36, 92 + legOffset, 14, 16, 4);
        ctx.roundRect(78, 92 - legOffset, 14, 16, 4);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(40, 108 + legOffset); ctx.lineTo(43, 112 + legOffset); ctx.lineTo(46, 108 + legOffset);
        ctx.moveTo(82, 108 - legOffset); ctx.lineTo(85, 112 - legOffset); ctx.lineTo(88, 108 - legOffset);
        ctx.fill();

      } else if (dir === 1) { // UP
        ctx.fillStyle = getGradY(32 + wingFlap, 80 + wingFlap, cWingStart, cWingEnd);
        ctx.beginPath();
        ctx.moveTo(48, 52); ctx.bezierCurveTo(24, 28 + wingFlap, 8, 32 + wingFlap, 8, 68 + wingFlap); ctx.bezierCurveTo(24, 76 + wingFlap, 36, 68 + wingFlap, 48, 64); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(80, 52); ctx.bezierCurveTo(104, 28 + wingFlap, 120, 32 + wingFlap, 120, 68 + wingFlap); ctx.bezierCurveTo(104, 76 + wingFlap, 92, 68 + wingFlap, 80, 64); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = cWingHi; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(48, 52); ctx.lineTo(12, 36 + wingFlap); ctx.lineTo(8, 68 + wingFlap); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(80, 52); ctx.lineTo(116, 36 + wingFlap); ctx.lineTo(120, 68 + wingFlap); ctx.stroke();

        ctx.fillStyle = getGradY(52, 104, cBodyDark, '#581c1c');
        ctx.beginPath();
        ctx.roundRect(40, 52, 48, 48, [24, 24, 12, 12]);
        ctx.fill();

        ctx.fillStyle = getGradY(92, 112, cBodyDark, '#450a0a');
        ctx.beginPath();
        ctx.moveTo(60, 100);
        ctx.bezierCurveTo(64, 116, 76, 120, 84, 116);
        ctx.lineTo(84, 110);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = getGradY(20, 56, cBodyDark, '#581c1c');
        ctx.beginPath();
        ctx.roundRect(44, 20, 40, 36, [14, 14, 4, 4]);
        ctx.fill();

        ctx.fillStyle = cHorn;
        ctx.beginPath();
        ctx.moveTo(48, 20); ctx.bezierCurveTo(36, 8, 32, 4, 36, 0); ctx.bezierCurveTo(42, 4, 46, 12, 52, 20); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(80, 20); ctx.bezierCurveTo(92, 8, 96, 4, 92, 0); ctx.bezierCurveTo(86, 4, 82, 12, 76, 20); ctx.closePath(); ctx.fill();

        ctx.fillStyle = getGradY(92, 106, cBodyDark, '#450a0a');
        ctx.beginPath();
        ctx.roundRect(36, 92 - legOffset, 14, 14, 4);
        ctx.roundRect(78, 92 + legOffset, 14, 14, 4);
        ctx.fill();

      } else if (dir === 2) { // LEFT
        ctx.fillStyle = getGradY(32 + wingFlap, 80 + wingFlap, cWingStart, cWingEnd);
        ctx.beginPath();
        ctx.moveTo(76, 52);
        ctx.bezierCurveTo(96, 24 + wingFlap, 112, 28 + wingFlap, 112, 64 + wingFlap);
        ctx.bezierCurveTo(96, 72 + wingFlap, 86, 64 + wingFlap, 76, 60);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = cWingHi; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(76, 52); ctx.lineTo(108, 32 + wingFlap); ctx.lineTo(112, 64 + wingFlap); ctx.stroke();

        ctx.fillStyle = getGradY(52, 104, cBody, cBodyDark);
        ctx.beginPath();
        ctx.roundRect(44, 52, 44, 48, [20, 20, 10, 10]);
        ctx.fill();

        ctx.fillStyle = getGradY(60, 96, cChestStart, cChestEnd);
        ctx.beginPath();
        ctx.roundRect(44, 60, 12, 34, [8, 0, 0, 8]);
        ctx.fill();

        ctx.fillStyle = getGradY(20, 56, cBody, cBodyDark);
        ctx.beginPath();
        ctx.roundRect(28, 20, 44, 36, [14, 14, 8, 8]);
        ctx.fill();

        ctx.fillStyle = cHorn;
        ctx.beginPath();
        ctx.moveTo(56, 20);
        ctx.bezierCurveTo(48, 8, 44, 4, 48, 0);
        ctx.bezierCurveTo(54, 4, 58, 12, 64, 20);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = cEye;
        ctx.beginPath();
        ctx.arc(38, 32, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cEyeGlow;
        ctx.beginPath();
        ctx.arc(38, 32, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(32, 46); ctx.lineTo(34, 52); ctx.lineTo(38, 46); ctx.fill();

        ctx.fillStyle = getGradY(92, 106, cBody, cBodyDark);
        ctx.beginPath();
        ctx.roundRect(40, 92 + legOffset, 14, 16, 4);
        ctx.roundRect(64, 92 - legOffset, 14, 16, 4);
        ctx.fill();

      } else if (dir === 3) { // RIGHT
        ctx.fillStyle = getGradY(32 + wingFlap, 80 + wingFlap, cWingStart, cWingEnd);
        ctx.beginPath();
        ctx.moveTo(52, 52);
        ctx.bezierCurveTo(32, 24 + wingFlap, 16, 28 + wingFlap, 16, 64 + wingFlap);
        ctx.bezierCurveTo(32, 72 + wingFlap, 42, 64 + wingFlap, 52, 60);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = cWingHi; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(52, 52); ctx.lineTo(20, 32 + wingFlap); ctx.lineTo(16, 64 + wingFlap); ctx.stroke();

        ctx.fillStyle = getGradY(52, 104, cBody, cBodyDark);
        ctx.beginPath();
        ctx.roundRect(40, 52, 44, 48, [20, 20, 10, 10]);
        ctx.fill();

        ctx.fillStyle = getGradY(60, 96, cChestStart, cChestEnd);
        ctx.beginPath();
        ctx.roundRect(72, 60, 12, 34, [0, 8, 8, 0]);
        ctx.fill();

        ctx.fillStyle = getGradY(20, 56, cBody, cBodyDark);
        ctx.beginPath();
        ctx.roundRect(56, 20, 44, 36, [14, 14, 8, 8]);
        ctx.fill();

        ctx.fillStyle = cHorn;
        ctx.beginPath();
        ctx.moveTo(72, 20);
        ctx.bezierCurveTo(80, 8, 84, 4, 80, 0);
        ctx.bezierCurveTo(74, 4, 70, 12, 64, 20);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = cEye;
        ctx.beginPath();
        ctx.arc(90, 32, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cEyeGlow;
        ctx.beginPath();
        ctx.arc(90, 32, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(96, 46); ctx.lineTo(94, 52); ctx.lineTo(90, 46); ctx.fill();

        ctx.fillStyle = getGradY(92, 106, cBody, cBodyDark);
        ctx.beginPath();
        ctx.roundRect(50, 92 - legOffset, 14, 16, 4);
        ctx.roundRect(74, 92 + legOffset, 14, 16, 4);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  scene.textures.addSpriteSheet(textureKey, canvas as unknown as HTMLImageElement, {
    frameWidth,
    frameHeight
  });

  return textureKey;
}
