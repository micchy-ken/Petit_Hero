import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Ghost, Loader2 } from 'lucide-react';
import { EnemyAssets as initialEnemyAssets, BossAssets as initialBossAssets, EnemyAsset } from '../data/EnemyAssets';
import { fetchEnemyAssetsFromFirestore, saveEnemyAssetsToFirestore } from '../lib/dbService';
import { usePopup } from '../components/CustomPopupProvider';

type BgMode = 'text-black' | 'stone-gray' | 'color';

function EnemyGraphicPreview({ bgMode, enemyId }: { bgMode: BgMode, enemyId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = true;
    
    let frame = 0;
    const frames = 4;
    
    // ボス判定
    const isBoss = ['color_demon_king', 'gray_boss', 'color_dragon', 'text_boss'].includes(enemyId);
    const frameWidth = isBoss ? 128 : 64;
    const frameHeight = isBoss ? 128 : 64;
    
    // Canvasの解像度を動的に更新
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    
    let animationId: number;
    let lastTime = 0;
    
    const draw = (time: number) => {
      if (time - lastTime > 150) { // アニメーション速度
        frame = (frame + 1) % frames;
        lastTime = time;
        
        ctx.clearRect(0, 0, frameWidth, frameHeight);
        
        // 1. テキストモード
        if (bgMode === 'text-black') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, frameWidth, frameHeight);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          let char = '敵';
          if (enemyId === 'color_bat') char = '蝙';
          else if (enemyId === 'color_goblin') char = 'ゴ';
          else if (enemyId === 'color_demon_king' || enemyId === 'gray_boss' || enemyId === 'text_boss') char = '魔';
          else if (enemyId === 'color_dragon') char = '竜';
          else if (enemyId === 'color_golem') char = '剛';
          else if (enemyId === 'color_lizardman') char = '蜥';
          else if (enemyId === 'color_skeleton') char = '骨';
          else if (enemyId === 'color_swordsman') char = '剣';
          else if (enemyId === 'color_griffon') char = '鷲';
          else if (enemyId === 'text_teki') char = '敵';
          
          ctx.font = isBoss ? 'bold 64px "Inter", sans-serif' : 'bold 32px "Inter", sans-serif';
          ctx.fillText(char, frameWidth / 2, frameHeight / 2);
        } else {
          // 2. グラフィックモード (カラー or グレイスケール)
          const isGray = bgMode === 'stone-gray';
          ctx.fillStyle = isGray ? '#f1f5f9' : '#ecfdf5';
          ctx.fillRect(0, 0, frameWidth, frameHeight);
          
          if (enemyId === 'color_demon_king' || enemyId === 'gray_boss') {
            // ----------------- 魔王 128x128 -----------------
            ctx.save();
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

            const forceGray = enemyId === 'gray_boss' || isGray;
            const cBodyGradStart = forceGray ? '#555555' : '#1e1b4b'; 
            const cBodyGradEnd = forceGray ? '#1e1e1e' : '#090514';
            const cCapeStart = forceGray ? '#444444' : '#4c1d95'; 
            const cCapeEnd = forceGray ? '#1a1a1a' : '#1e0a3b';
            const cCapeInnerStart = forceGray ? '#333333' : '#991b1b'; 
            const cCapeInnerEnd = forceGray ? '#111111' : '#2d0606';
            const cSkinStart = forceGray ? '#cbd5e1' : '#cbd5e1'; 
            const cSkinEnd = forceGray ? '#64748b' : '#64748b';
            const cCrownStart = forceGray ? '#e2e8f0' : '#fbbf24'; 
            const cCrownEnd = forceGray ? '#94a3b8' : '#d97706';
            const cEye = forceGray ? '#ffffff' : '#ef4444'; 
            const cEyeGlow = forceGray ? 'rgba(255,255,255,0.4)' : 'rgba(239,68,68,0.5)';

            // 1. ツノ
            ctx.fillStyle = getGradY(16, 48, forceGray ? '#777777' : '#312e81', forceGray ? '#222222' : '#0f172a');
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

            // 4. 肩当
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

            // 宝石
            ctx.fillStyle = forceGray ? '#ffffff' : '#ef4444';
            ctx.beginPath();
            ctx.arc(64, 20, 3, 0, Math.PI * 2);
            ctx.fill();

            // 7. 髪
            ctx.fillStyle = forceGray ? '#222222' : '#0f172a';
            ctx.beginPath();
            ctx.roundRect(42, 38, 4, 16, 2);
            ctx.roundRect(82, 38, 4, 16, 2);
            ctx.fill();

            // 8. 赤目
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
            ctx.fillStyle = forceGray ? '#444444' : '#1e293b';
            ctx.beginPath();
            ctx.roundRect(48, 100 + legOffset, 10, 12, 3);
            ctx.roundRect(70, 100 - legOffset, 10, 12, 3);
            ctx.fill();

            // 10. 杖
            const staffY = 32 + (isStep2 ? -4 : 0);
            ctx.fillStyle = getGradY(staffY, staffY + 70, forceGray ? '#888888' : '#78350f', forceGray ? '#333333' : '#451a03');
            ctx.beginPath();
            ctx.roundRect(96, staffY, 6, 76, 3);
            ctx.fill();

            ctx.fillStyle = getGradY(staffY - 14, staffY, cCrownStart, cCrownEnd);
            ctx.beginPath();
            ctx.arc(99, staffY - 2, 9, 0, Math.PI * 2);
            ctx.fill();

            const coreGrad = ctx.createRadialGradient(99, staffY - 14, 1, 99, staffY - 14, 12);
            coreGrad.addColorStop(0, '#ffffff');
            coreGrad.addColorStop(0.3, forceGray ? '#ffffff' : '#ef4444');
            coreGrad.addColorStop(1, forceGray ? 'rgba(255, 255, 255, 0)' : 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(99, staffY - 14, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = getGradY(staffY + 36, staffY + 46, cSkinStart, cSkinEnd);
            ctx.beginPath();
            ctx.roundRect(92, staffY + 32, 10, 10, 3);
            ctx.fill();

            ctx.restore();

          } else if (enemyId === 'color_dragon') {
            // ----------------- ドラゴン 128x128 -----------------
            ctx.save();
            const isStep1 = frame === 1;
            const isStep2 = frame === 3;
            const bobY = (isStep1 || isStep2) ? -4 : 0;
            const wingFlap = (isStep1 || isStep2) ? -8 : 0;
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

            const forceGray = isGray;
            const cBody = forceGray ? '#888888' : '#dc2626'; 
            const cBodyDark = forceGray ? '#444444' : '#7f1d1d'; 
            const cChestStart = forceGray ? '#dddddd' : '#fbbf24'; 
            const cChestEnd = forceGray ? '#999999' : '#d97706';
            const cWingStart = forceGray ? '#555555' : '#7f1d1d'; 
            const cWingEnd = forceGray ? '#333333' : '#450a0a';
            const cWingHi = forceGray ? '#777777' : '#b91c1c'; 
            const cHorn = '#f3f4f6'; 
            const cEye = forceGray ? '#ffffff' : '#10b981'; 
            const cEyeGlow = forceGray ? 'rgba(255, 255, 255, 0.3)' : 'rgba(16, 185, 129, 0.4)';

            // 1. 巨大な翼
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

            // 3. お腹
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

            // 6. 目
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

            ctx.restore();

          } else {
            // ----------------- 一般 64x64 グラフィック -----------------
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 32;
            tempCanvas.height = 32;
            const tCtx = tempCanvas.getContext('2d')!;
            tCtx.imageSmoothingEnabled = false;
            
            const gp = (x: number, y: number, w: number, h: number, color: string) => {
              tCtx.fillStyle = color;
              tCtx.fillRect(x, y, w, h);
            };
            
            // ----------------- コウモリ -----------------
            if (enemyId === 'color_bat') {
              const cBody = isGray ? '#666666' : '#2e1065';
              const cWing = isGray ? '#444444' : '#4c1d95';
              const cWingDark = isGray ? '#222222' : '#1e1b4b';
              const cEye = isGray ? '#ffffff' : '#f43f5e';
              const cMouth = '#ffffff';

              tCtx.save();
              const bounceY = Math.sin((frame / frames) * Math.PI * 2) * 2;
              tCtx.translate(0, bounceY);

              // 影
              tCtx.fillStyle = isGray ? 'rgba(0, 0, 0, 0.2)' : 'rgba(15, 23, 42, 0.15)';
              tCtx.beginPath();
              tCtx.ellipse(16, 28, 5 - Math.abs(bounceY) * 0.3, 1.5, 0, 0, Math.PI * 2);
              tCtx.fill();

              // 耳
              gp(13, 9, 2, 3, cBody);
              gp(17, 9, 2, 3, cBody);
              // 頭/体
              gp(12, 11, 8, 8, cBody);
              gp(13, 19, 6, 2, cBody);

              // 翼 (羽ばたき)
              if (frame === 0) {
                gp(5, 11, 7, 3, cWing); gp(20, 11, 7, 3, cWing);
                gp(3, 13, 9, 2, cWingDark); gp(20, 13, 9, 2, cWingDark);
                gp(2, 15, 6, 2, cWingDark); gp(24, 15, 6, 2, cWingDark);
              } else if (frame === 1 || frame === 3) {
                gp(6, 8, 6, 3, cWing); gp(20, 8, 6, 3, cWing);
                gp(8, 11, 4, 4, cWingDark); gp(20, 11, 4, 4, cWingDark);
                gp(10, 15, 2, 3, cWingDark); gp(20, 15, 2, 3, cWingDark);
              } else if (frame === 2) {
                gp(10, 13, 2, 7, cWing); gp(20, 13, 2, 7, cWing);
                gp(9, 14, 1, 5, cWingDark); gp(22, 14, 1, 5, cWingDark);
              }

              // 目 / キバ
              gp(14, 13, 1, 2, cEye); gp(17, 13, 1, 2, cEye);
              gp(15, 16, 2, 1, cBody);
              gp(15, 17, 1, 1, cMouth); gp(16, 17, 1, 1, cMouth);

              tCtx.restore();

            // ----------------- ゴブリン -----------------
            } else if (enemyId === 'color_goblin') {
              const cSkin = isGray ? '#777777' : '#16a34a';
              const cSkinDark = isGray ? '#444444' : '#14532d';
              const cCloth = isGray ? '#555555' : '#854d0e';
              const cClothDark = isGray ? '#333333' : '#451a03';
              const cWeapon = isGray ? '#888888' : '#71717a';
              const cEye = isGray ? '#ffffff' : '#facc15';
              const cHair = isGray ? '#666666' : '#27272a';

              tCtx.save();
              const isStep1 = frame === 1;
              const isStep2 = frame === 3;
              const bobY = (isStep1 || isStep2) ? -1 : 0;
              const legOffset = isStep1 ? 1 : (isStep2 ? -1 : 0);

              tCtx.translate(0, bobY);

              // 影
              tCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
              tCtx.beginPath();
              tCtx.ellipse(16, 28, 6, 2, 0, 0, Math.PI * 2);
              tCtx.fill();

              // 正面向き
              gp(7, 13, 3, 2, cSkinDark); gp(22, 13, 3, 2, cSkinDark);
              gp(10, 10, 12, 9, cSkin);
              gp(11, 9, 10, 1, cHair); gp(14, 7, 4, 2, cHair);
              gp(12, 13, 2, 2, cEye); gp(18, 13, 2, 2, cEye);
              gp(13, 14, 1, 1, '#000000'); gp(18, 14, 1, 1, '#000000');
              gp(14, 16, 4, 1, cSkinDark); gp(14, 17, 1, 1, '#ffffff'); gp(17, 17, 1, 1, '#ffffff');
              gp(10, 19, 12, 6, cCloth); gp(12, 25, 8, 2, cClothDark);
              gp(11, 25 + (legOffset > 0 ? -1 : 0), 2, 4, cSkin); gp(19, 25 + (legOffset < 0 ? -1 : 0), 2, 4, cSkin);

              const wpY = 17 + (isStep2 ? -1 : 0);
              gp(23, wpY, 2, 6, cWeapon); gp(22, wpY - 2, 4, 3, cWeapon); gp(21, wpY + 4, 2, 2, cClothDark);

              tCtx.restore();

            // ----------------- ゴーレム -----------------
            } else if (enemyId === 'color_golem') {
              const cStone = isGray ? '#64748b' : '#78716c';
              const cStoneDark = isGray ? '#334155' : '#44403c';
              const cRune = isGray ? '#e2e8f0' : '#38bdf8';
              tCtx.save();
              const isStep = frame === 1 || frame === 3;
              const bobY = isStep ? -1 : 0;
              tCtx.translate(0, bobY);
              // 影
              tCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
              tCtx.beginPath(); tCtx.ellipse(16, 28, 9, 2.5, 0, 0, Math.PI * 2); tCtx.fill();
              // 本体
              gp(8, 8, 16, 18, cStoneDark);
              gp(9, 9, 14, 16, cStone);
              // 肩
              gp(6, 11, 4, 4, cStoneDark); gp(6, 12, 3, 3, cStone);
              gp(22, 11, 4, 4, cStoneDark); gp(23, 12, 3, 3, cStone);
              // 顔
              gp(11, 12, 10, 4, cStoneDark);
              gp(13, 13, 2, 2, cRune); gp(17, 13, 2, 2, cRune);
              // ルーン
              gp(15, 18, 2, 4, cRune); gp(13, 19, 6, 2, cRune);
              // 足
              gp(9, 25, 4, 4, cStoneDark); gp(19, 25, 4, 4, cStoneDark);
              tCtx.restore();

            // ----------------- リザードマン -----------------
            } else if (enemyId === 'color_lizardman') {
              const cScale = isGray ? '#475569' : '#15803d';
              const cScaleDark = isGray ? '#1e293b' : '#14532d';
              const cBelly = isGray ? '#94a3b8' : '#86efac';
              const cShield = isGray ? '#64748b' : '#b45309';
              const cSword = isGray ? '#cbd5e1' : '#94a3b8';
              const cEye = isGray ? '#ffffff' : '#facc15';
              tCtx.save();
              const isStep1 = frame === 1;
              const isStep2 = frame === 3;
              const bobY = (isStep1 || isStep2) ? -1 : 0;
              const legOffset = isStep1 ? 1 : (isStep2 ? -1 : 0);
              tCtx.translate(0, bobY);
              // 影
              tCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
              tCtx.beginPath(); tCtx.ellipse(16, 28, 6, 2, 0, 0, Math.PI * 2); tCtx.fill();
              // 頭
              gp(11, 9, 10, 8, cScaleDark); gp(12, 10, 8, 6, cScale);
              gp(10, 11, 2, 2, cScaleDark); gp(16, 12, 2, 2, cEye); gp(17, 13, 1, 1, '#000000');
              // 体
              gp(11, 17, 10, 9, cScaleDark); gp(13, 17, 6, 8, cBelly);
              // 足
              gp(11, 26 + (legOffset > 0 ? -1 : 0), 2, 3, cScale);
              gp(19, 26 + (legOffset < 0 ? -1 : 0), 2, 3, cScale);
              // 手
              gp(22, 16, 4, 6, cShield); gp(23, 15, 2, 8, cShield);
              gp(7, 17, 4, 2, cScale); gp(6, 11, 2, 9, cSword); gp(5, 20, 4, 1, cShield);
              tCtx.restore();

            // ----------------- ガイコツ -----------------
            } else if (enemyId === 'color_skeleton') {
              const cBone = isGray ? '#e2e8f0' : '#f8fafc';
              const cBoneDark = isGray ? '#94a3b8' : '#cbd5e1';
              const cEye = isGray ? '#ffffff' : '#ef4444';
              const cSword = isGray ? '#64748b' : '#71717a';
              tCtx.save();
              const isStep1 = frame === 1;
              const isStep2 = frame === 3;
              const bobY = (isStep1 || isStep2) ? -1 : 0;
              const legOffset = isStep1 ? 1 : (isStep2 ? -1 : 0);
              tCtx.translate(0, bobY);
              // 影
              tCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
              tCtx.beginPath(); tCtx.ellipse(16, 28, 5, 1.5, 0, 0, Math.PI * 2); tCtx.fill();
              // 頭
              gp(11, 9, 10, 8, cBoneDark); gp(12, 9, 8, 7, cBone);
              gp(13, 13, 2, 2, '#000000'); gp(17, 13, 2, 2, '#000000');
              gp(14, 14, 1, 1, cEye); gp(18, 14, 1, 1, cEye); gp(14, 16, 4, 1, '#000000');
              // 肋骨・背骨
              gp(15, 17, 2, 8, cBoneDark); gp(12, 18, 8, 1, cBone); gp(11, 20, 10, 1, cBone); gp(13, 22, 6, 1, cBone);
              // 腕・足
              gp(9, 18, 1, 5, cBone); gp(22, 18, 1, 5, cBone);
              gp(12, 24 + (legOffset > 0 ? -1 : 0), 1, 4, cBone); gp(18, 24 + (legOffset < 0 ? -1 : 0), 1, 4, cBone);
              // 剣
              gp(23, 14, 2, 9, cSword); gp(22, 21, 4, 1, '#b45309');
              tCtx.restore();

            // ----------------- 剣士 -----------------
            } else if (enemyId === 'color_swordsman') {
              const cArmor = isGray ? '#94a3b8' : '#cbd5e1';
              const cArmorDark = isGray ? '#475569' : '#64748b';
              const cCloth = isGray ? '#334155' : '#1d4ed8';
              const cGold = isGray ? '#cbd5e1' : '#fbbf24';
              const cSword = isGray ? '#e2e8f0' : '#f1f5f9';
              tCtx.save();
              const isStep1 = frame === 1;
              const isStep2 = frame === 3;
              const bobY = (isStep1 || isStep2) ? -1 : 0;
              const legOffset = isStep1 ? 1 : (isStep2 ? -1 : 0);
              tCtx.translate(0, bobY);
              // 影
              tCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
              tCtx.beginPath(); tCtx.ellipse(16, 28, 6, 2, 0, 0, Math.PI * 2); tCtx.fill();
              // 兜
              gp(10, 8, 12, 10, cArmorDark); gp(11, 9, 10, 8, cArmor);
              gp(10, 8, 12, 2, cCloth); gp(15, 6, 2, 3, cCloth);
              gp(12, 13, 8, 2, '#1e293b'); gp(14, 13, 1, 1, '#ef4444'); gp(17, 13, 1, 1, '#ef4444');
              // 鎧
              gp(10, 18, 12, 8, cArmorDark); gp(11, 18, 10, 7, cArmor); gp(14, 20, 4, 4, cGold);
              gp(8, 18, 3, 3, cArmorDark); gp(21, 18, 3, 3, cArmorDark);
              // 脚・剣
              gp(11, 26 + (legOffset > 0 ? -1 : 0), 3, 3, cArmorDark); gp(18, 26 + (legOffset < 0 ? -1 : 0), 3, 3, cArmorDark);
              gp(6, 17, 2, 2, cArmorDark); gp(6, 8, 2, 10, cSword); gp(4, 16, 6, 1, cGold);
              tCtx.restore();

            // ----------------- グリフォン -----------------
            } else if (enemyId === 'color_griffon') {
              const cFeather = isGray ? '#94a3b8' : '#d97706';
              const cFeatherDark = isGray ? '#475569' : '#78350f';
              const cBeak = isGray ? '#cbd5e1' : '#facc15';
              const cWing = isGray ? '#cbd5e1' : '#f8fafc';
              tCtx.save();
              const bounceY = Math.sin((frame / frames) * Math.PI * 2) * 2;
              tCtx.translate(0, bounceY);
              // 影
              tCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
              tCtx.beginPath(); tCtx.ellipse(16, 28, 7 - Math.abs(bounceY) * 0.4, 1.8, 0, 0, Math.PI * 2); tCtx.fill();
              // 頭
              gp(11, 8, 9, 8, cFeatherDark); gp(12, 9, 7, 6, '#f8fafc');
              gp(9, 11, 3, 3, cBeak); gp(15, 11, 1.5, 1.5, '#ef4444');
              // 胴体・翼
               gp(10, 16, 12, 9, cFeatherDark); gp(11, 17, 10, 7, cFeather);
               const flap = (frame === 1 || frame === 3) ? -2 : (frame === 2 ? 1 : -1);
               gp(20, 12 + flap, 7, 5, cWing); gp(19, 14 + flap, 4, 4, cFeatherDark);
               // 脚
               gp(11, 25, 2, 3, cBeak); gp(18, 25, 3, 3, cFeatherDark);
               tCtx.restore();

            // ----------------- スライム系 -----------------
            } else {
              const palette = {
                highlight: '#a5f3fc', bodyHi: '#38bdf8', body: '#0284c7', bodyDark: '#0369a1',
                shadow: '#0c4a6e', eye: '#ffffff', pupil: '#0f172a', mouth: '#0f172a'
              };

              if (isGray) {
                palette.highlight = '#dddddd'; palette.bodyHi = '#aaaaaa'; palette.body = '#888888';
                palette.bodyDark = '#666666'; palette.shadow = '#444444';
              } else if (enemyId === 'color_slime_green') {
                palette.highlight = '#bbf7d0'; palette.bodyHi = '#4ade80'; palette.body = '#22c55e';
                palette.bodyDark = '#16a34a'; palette.shadow = '#14532d';
              } else if (enemyId === 'color_slime_red') {
                palette.highlight = '#fecdd3'; palette.bodyHi = '#fb7185'; palette.body = '#f43f5e';
                palette.bodyDark = '#e11d48'; palette.shadow = '#881337';
              }

              tCtx.save();
              let scaleX = 1; let scaleY = 1; let offsetY = 0;
              if (frame === 1) { scaleX = 1.2; scaleY = 0.8; offsetY = 3; }
              else if (frame === 2) { scaleX = 0.8; scaleY = 1.2; offsetY = -1; }
              else if (frame === 3) { scaleX = 0.9; scaleY = 1.1; offsetY = -4; }

              tCtx.translate(16, 26);
              tCtx.scale(scaleX, scaleY);
              tCtx.translate(-16, -26 + offsetY);

              // 影
              if (frame !== 3) {
                tCtx.fillStyle = 'rgba(15, 23, 42, 0.4)';
                tCtx.beginPath(); tCtx.ellipse(16, 27, 8, 2, 0, 0, Math.PI * 2); tCtx.fill();
              } else {
                tCtx.fillStyle = 'rgba(15, 23, 42, 0.2)';
                tCtx.beginPath(); tCtx.ellipse(16, 29, 5, 1, 0, 0, Math.PI * 2); tCtx.fill();
              }

              gp(12, 14, 8, 12, palette.shadow); gp(10, 16, 12, 10, palette.shadow); gp(8, 19, 16, 7, palette.shadow);
              gp(13, 15, 6, 10, palette.bodyDark); gp(11, 17, 10, 8, palette.bodyDark); gp(9, 20, 14, 5, palette.bodyDark);
              gp(14, 16, 4, 8, palette.body); gp(12, 18, 8, 6, palette.body); gp(10, 21, 12, 3, palette.body);
              gp(15, 17, 2, 4, palette.bodyHi); gp(13, 19, 4, 2, palette.bodyHi);
              gp(13, 17, 1, 2, palette.highlight); gp(11, 20, 1, 1, palette.highlight);
              gp(11, 20, 2, 3, palette.eye); gp(12, 21, 1, 2, palette.pupil);
              gp(19, 20, 2, 3, palette.eye); gp(19, 21, 1, 2, palette.pupil);
              gp(15, 23, 2, 1, palette.mouth);

              tCtx.restore();
            }
            
            ctx.drawImage(tempCanvas, 0, 0, 32, 32, 0, 0, 64, 64);
          }
        }
      }
      animationId = requestAnimationFrame(draw);
    };
    animationId = requestAnimationFrame(draw);
    
    return () => cancelAnimationFrame(animationId);
  }, [bgMode, enemyId]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
      <canvas ref={canvasRef} width={64} height={64} className="w-32 h-32 image-rendering-pixelated rounded-lg shadow-sm" />
      <span className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-widest">プレビュー</span>
    </div>
  );
}

export default function EnemyEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert, showConfirm } = usePopup();
  const queryParams = new URLSearchParams(location.search);
  const currentScenarioId = queryParams.get('scenarioId') || 'scenario_test';
  const returnTo = queryParams.get('returnTo');

  const handleExit = () => {
    if (returnTo === 'settings') {
      navigate(`/?settings=true&resumeScenarioId=${currentScenarioId}`);
    } else {
      navigate('/');
    }
  };
  const [enemyAssets, setEnemyAssets] = useState(initialEnemyAssets);
  const [bossAssets, setBossAssets] = useState(initialBossAssets);

  const [selectedType, setSelectedType] = useState<'enemy' | 'boss'>('enemy');
  const [selectedBgMode, setSelectedBgMode] = useState<BgMode>('color');
  const [selectedEnemyId, setSelectedEnemyId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load enemy assets from Firestore on mount
  useEffect(() => {
    async function loadAssets() {
      try {
        const assets = await fetchEnemyAssetsFromFirestore();
        if (assets) {
          setEnemyAssets(assets.enemyAssets);
          setBossAssets(assets.bossAssets);
        }
      } catch (e) {
        console.error('Failed to load assets from Firestore:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadAssets();
  }, []);

  // Initialize selected enemy
  useEffect(() => {
    const assets = selectedType === 'enemy' ? enemyAssets : bossAssets;
    const list = assets[selectedBgMode];
    if (list && list.length > 0) {
      if (!list.find(e => e.id === selectedEnemyId)) {
        setSelectedEnemyId(list[0].id);
      }
    } else {
      setSelectedEnemyId('');
    }
  }, [selectedType, selectedBgMode, enemyAssets, bossAssets, selectedEnemyId]);

  const currentList = selectedType === 'enemy' ? enemyAssets[selectedBgMode] : bossAssets[selectedBgMode];
  const currentEnemy = currentList?.find(e => e.id === selectedEnemyId);

  const handleUpdate = (updates: Partial<EnemyAsset>) => {
    if (!currentEnemy) return;
    
    const setAssets = selectedType === 'enemy' ? setEnemyAssets : setBossAssets;
    
    setAssets(prev => {
      const newList = prev[selectedBgMode].map(e => 
        e.id === currentEnemy.id ? { ...e, ...updates } : e
      );
      return { ...prev, [selectedBgMode]: newList };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveEnemyAssetsToFirestore(enemyAssets, bossAssets);
      setSaveMessage('保存しました');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e: any) {
      console.error(e);
      await showAlert('保存に失敗しました: ' + e.message, '保存エラー');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-slate-500">データを読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleExit()}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Ghost className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-lg text-slate-900">エネミーエディター</h1>
            </div>
          </div>
          
          {saveMessage && (
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              キャラクタータイプ
            </label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as 'enemy' | 'boss')}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="enemy">通常モンスター</option>
              <option value="boss">ボス</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              対応マップ
            </label>
            <select
              value={selectedBgMode}
              onChange={e => setSelectedBgMode(e.target.value as BgMode)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="text-black">テキストモード</option>
              <option value="stone-gray">石ころモード</option>
              <option value="color">カラー(通常)</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              キャラクター選択
            </label>
            <select
              value={selectedEnemyId}
              onChange={e => setSelectedEnemyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {currentList?.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>

        {currentEnemy ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-8">
            <div className="flex-shrink-0">
              <EnemyGraphicPreview bgMode={selectedBgMode} enemyId={selectedEnemyId} />
            </div>
            <div className="flex-1 flex flex-col gap-5">
              <h2 className="font-bold text-xl text-slate-800 border-b border-slate-100 pb-3 mb-2">
                ステータス編集
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">名前</label>
                <input
                  type="text"
                  value={currentEnemy.name}
                  onChange={e => handleUpdate({ name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">画像設定 (今後の実装)</label>
                <input
                  type="text"
                  value={currentEnemy.image || ''}
                  onChange={e => handleUpdate({ image: e.target.value })}
                  placeholder="未設定"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">HP (体力)</label>
                <input
                  type="number"
                  min="1"
                  value={currentEnemy.hp}
                  onChange={e => handleUpdate({ hp: parseInt(e.target.value) || 1 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">攻撃力</label>
                <input
                  type="number"
                  min="0"
                  value={currentEnemy.attack}
                  onChange={e => handleUpdate({ attack: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">防御力</label>
                <input
                  type="number"
                  min="0"
                  value={currentEnemy.defense !== undefined ? currentEnemy.defense : 0}
                  onChange={e => handleUpdate({ defense: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">獲得経験値</label>
                <input
                  type="number"
                  min="0"
                  value={currentEnemy.exp !== undefined ? currentEnemy.exp : 0}
                  onChange={e => handleUpdate({ exp: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">移動スピード (ms/grid)</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={currentEnemy.speed}
                  onChange={e => handleUpdate({ speed: parseInt(e.target.value) || 500 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">値が小さいほど高速に動きます。</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">行動パターン</label>
                <select
                  value={currentEnemy.behavior}
                  onChange={e => handleUpdate({ behavior: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="seek">勇者を追尾する</option>
                  <option value="random">ランダムに徘徊する</option>
                  <option value="rarely">あまり動かない (徘徊)</option>
                  <option value="idle">待機 (動かない)</option>
                </select>
              </div>

              <div className="sm:col-span-2 mt-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex flex-wrap sm:flex-nowrap items-end gap-2">
                <div className="flex-1 min-w-[80px]">
                  <label className="block text-[11px] font-bold text-indigo-700 mb-1">攻撃属性</label>
                  <select
                    value={currentEnemy.attackElement || ''}
                    onChange={e => handleUpdate({ attackElement: e.target.value })}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  >
                    <option value="">無 (None)</option>
                    <option value="fire">火 (Fire)</option>
                    <option value="water">水 (Water)</option>
                    <option value="wind">風 (Wind)</option>
                    <option value="earth">地 (Earth)</option>
                    <option value="light">光 (Light)</option>
                    <option value="dark">闇 (Dark)</option>
                  </select>
                </div>
                
                <div className="w-20 min-w-[60px]">
                  <label className="block text-[11px] font-bold text-indigo-700 mb-1" title="攻撃属性付与ボーナス">付与攻</label>
                  <input
                    type="number"
                    min="0"
                    value={currentEnemy.attackElementEnchantValue !== undefined ? currentEnemy.attackElementEnchantValue : 0}
                    onChange={e => handleUpdate({ attackElementEnchantValue: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={!currentEnemy.attackElement}
                  />
                </div>

                <div className="flex-1 min-w-[80px]">
                  <label className="block text-[11px] font-bold text-indigo-700 mb-1">防御属性</label>
                  <select
                    value={currentEnemy.defenseElement || ''}
                    onChange={e => handleUpdate({ defenseElement: e.target.value })}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  >
                    <option value="">無 (None)</option>
                    <option value="fire">火 (Fire)</option>
                    <option value="water">水 (Water)</option>
                    <option value="wind">風 (Wind)</option>
                    <option value="earth">地 (Earth)</option>
                    <option value="light">光 (Light)</option>
                    <option value="dark">闇 (Dark)</option>
                  </select>
                </div>

                <div className="w-20 min-w-[60px]">
                  <label className="block text-[11px] font-bold text-indigo-700 mb-1" title="防御属性付与ボーナス">付与防</label>
                  <input
                    type="number"
                    min="0"
                    value={currentEnemy.defenseElementEnchantValue !== undefined ? currentEnemy.defenseElementEnchantValue : 0}
                    onChange={e => handleUpdate({ defenseElementEnchantValue: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={!currentEnemy.defenseElement}
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-8 rounded-2xl text-center text-slate-400 border border-slate-200 border-dashed">
            キャラクターが見つかりません
          </div>
        )}
      </main>
    </div>
  );
}
