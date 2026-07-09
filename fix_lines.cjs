const fs = require('fs');
let code = fs.readFileSync('src/pages/MapEditorPage.tsx', 'utf-8');
let lines = code.split('\n');

const correctLines = `                      placeMode === 'event' ? 'bg-indigo-600 border border-indigo-500 shadow-inner text-white' : 'hover:bg-slate-600/50 text-slate-300'
                    }\`}
                  >
                    <Zap className="w-4 h-4" />
                    イベント配置
                  </button>
                  <button 
                    onClick={() => setPlaceMode('item')}
                    className={\`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all \${
                      placeMode === 'item' ? 'bg-indigo-600 border border-indigo-500 shadow-inner text-white' : 'hover:bg-slate-600/50 text-slate-300'
                    }\`}
                  >
                    <Gem className="w-4 h-4" />
                    アイテム配置
                  </button>
                  <button 
                    onClick={() => setPlaceMode('obstacle')}
                    className={\`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all \${
                      placeMode === 'obstacle' ? 'bg-indigo-600 border border-indigo-500 shadow-inner text-white' : 'hover:bg-slate-600/50 text-slate-300'
                    }\`}
                  >
                    <Box className="w-4 h-4" />
                    障害配置
                  </button>
                </div>
              </div>

              {/* アイテム設定詳細 */}
              {placeMode === 'item' && (
                <div className="flex flex-col gap-3 border-t border-slate-600 pt-4">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider pb-1">
                    Item Properties
                  </h2>
                  <div className="flex flex-col gap-3">
                    {/* 1. 宝箱の見た目の種類 (マップエディタ) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">1. 宝箱の見た目の種類 (マップエディタ)</label>
                      <select
                        value={newItemParams.graphic || '📦'}
                        onChange={(e) => {
                          const nextGraphic = e.target.value;
                          let nextItemId = newItemParams.itemId;
                          if (nextGraphic === '🔮') {
                            const firstMagic = magics.find(m => m.acquisitionType === 'item');
                            if (firstMagic) nextItemId = firstMagic.id;
                          } else if (nextGraphic === '📦' || nextGraphic === '🏺' || nextGraphic === '💀') {
                            if (customItems.length > 0 && (!nextItemId || nextItemId.startsWith('artifact_'))) {
                              nextItemId = customItems[0].id;
                            }
                          } else if (nextGraphic === '🎁' || nextGraphic === '💎' || nextGraphic === '⭐') {
                            if (!nextItemId || !nextItemId.startsWith('artifact_')) {
                              nextItemId = 'artifact_weapon_lvl1_3';
                            }
                          }
                          setNewItemParams({ ...newItemParams, graphic: nextGraphic, itemId: nextItemId });
                        }}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400 font-bold"
                      >
                        <option value="📦">📦 木の宝箱 (ノーマル)</option>
                        <option value="🎁">🎁 赤の宝箱 (レア/プレゼント)</option>
                        <option value="💎">💎 青の宝箱 (ジュエル)</option>
                        <option value="⭐">⭐ 金の宝箱 (スター)</option>
                        <option value="🏺">🏺 古びた壷</option>
                        <option value="💀">💀 謎の骸骨</option>
                        <option value="🔮">🔮 魔法の水晶</option>
                      </select>
                    </div>

                    {/* 2. 中身のアイテム (アイテムエディタ) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">
                        {newItemParams.graphic === '🔮' ? '2. 中身の魔法 (マジックエディタ)' : '2. 中身のアイテム (アイテムエディタ)'}
                      </label>
                      <select 
                        value={newItemParams.itemId}
                        onChange={(e) => setNewItemParams({ ...newItemParams, itemId: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400 font-bold"
                      >
                        {newItemParams.graphic === '🔮' ? (
                          <optgroup label="🔮 「アイテム入手」で保存された魔法">
                            {magics.filter(m => m.acquisitionType === 'item').length > 0 ? (
                              magics.filter(m => m.acquisitionType === 'item').map((magic) => (
                                <option key={magic.id} value={magic.id}>
                                  🔮 {magic.name} (攻撃力:{magic.power} / 属性:{magic.attribute})
                                </option>
                              ))
                            ) : (
                              <option value="">アイテム習得の魔法がありません</option>
                            )}
                          </optgroup>
                        ) : (
                          <>
                            {bgMode === 'text-black' && <option value="treasure_text">宝 (Text)</option>}
                            
                            {(newItemParams.graphic === '🎁' || newItemParams.graphic === '💎' || newItemParams.graphic === '⭐') && (
                              <optgroup label="✨ アーティファクト (ランダム生成)">
                                <option value="artifact_weapon_lvl1_3">⚔️ 武器: 大剣 [Lv1-3]</option>
                                <option value="artifact_armor_lvl1_3">🛡️ 防具: 全身鎧 [Lv1-3]</option>
                                <option value="artifact_accessory_lvl1_3">💍 装飾: 指輪 [Lv1-3]</option>
                                
                                <option value="artifact_weapon_lvl4_6">⚔️ 武器: 勇者の剣 [Lv4-6]</option>
                                <option value="artifact_armor_lvl4_6">🛡️ 防具: 勇者の鎧 [Lv4-6]</option>
                                <option value="artifact_accessory_lvl4_6">💍 装飾: 勇者のネックレス [Lv4-6]</option>
                                
                                <option value="artifact_weapon_lvl7_9">⚔️ 武器: 伝説の剣 [Lv7-9]</option>
                                <option value="artifact_armor_lvl7_9">🛡️ 防具: 伝説の鎧 [Lv7-9]</option>
                                <option value="artifact_accessory_lvl7_9">💍 装飾: 伝説 of ネックレス [Lv7-9]</option>
                                
                                <option value="artifact_weapon_lvl10">⚔️ 武器: オリハルコンソード [Lv10]</option>
                                <option value="artifact_armor_lvl10">🛡️ 防具: オリハルコンアーマー [Lv10]</option>
                                <option value="artifact_accessory_lvl10">💍 装飾: ゴッドオーブ [Lv10]</option>
                              </optgroup>
                            )}

                            {(newItemParams.graphic === '📦' || newItemParams.graphic === '🏺' || newItemParams.graphic === '💀') && (
                              <optgroup label="📦 通常登録アイテム">
                                {customItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {getEquipmentIcon(item)} {item.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        )}
                      </select>
                    </div>`;

// 1618行目から、1744行目までを置換
lines.splice(1617, 1744 - 1617 + 1, correctLines);

fs.writeFileSync('src/pages/MapEditorPage.tsx', lines.join('\n'));
console.log("Fixed by line numbers!");
