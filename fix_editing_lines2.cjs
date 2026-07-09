const fs = require('fs');
let code = fs.readFileSync('src/pages/MapEditorPage.tsx', 'utf-8');
let lines = code.split('\n');

const correctLines = `                  ) : (
                    <>
                      {bgMode === 'text-black' && <option value="treasure_text">宝 (Text)</option>}
                      
                      {(editingItem.graphic === '🎁' || editingItem.graphic === '💎' || editingItem.graphic === '⭐') && (
                        <optgroup label="✨ アーティファクト (ランダム生成)">
                          <option value="artifact_weapon_lvl1_3">⚔️ 武器: 大剣 [Lv1-3]</option>
                          <option value="artifact_armor_lvl1_3">🛡️ 防具: 全身鎧 [Lv1-3]</option>
                          <option value="artifact_accessory_lvl1_3">💍 装飾: 指輪 [Lv1-3]</option>
                          
                          <option value="artifact_weapon_lvl4_6">⚔️ 武器: 勇者の剣 [Lv4-6]</option>
                          <option value="artifact_armor_lvl4_6">🛡️ 防具: 勇者の鎧 [Lv4-6]</option>
                          <option value="artifact_accessory_lvl4_6">💍 装飾: 勇者のネックレス [Lv4-6]</option>
                          
                          <option value="artifact_weapon_lvl7_9">⚔️ 武器: 伝説の剣 [Lv7-9]</option>
                          <option value="artifact_armor_lvl7_9">🛡️ 防具: 伝説の鎧 [Lv7-9]</option>
                          <option value="artifact_accessory_lvl7_9">💍 装飾: 伝説のアンクレット [Lv7-9]</option>
                          
                          <option value="artifact_weapon_lvl10">⚔️ 武器: オリハルコンソード [Lv10]</option>
                          <option value="artifact_armor_lvl10">🛡️ 防具: オリハルコンアーマー [Lv10]</option>
                          <option value="artifact_accessory_lvl10">💍 装飾: ゴッドオーブ [Lv10]</option>
                        </optgroup>
                      )}

                      {(editingItem.graphic === '📦' || editingItem.graphic === '🏺' || editingItem.graphic === '💀') && (
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

// 2642行目 `                  ) : (` から 2673行目 `                    </>` までを置換
// 現在のファイルでは 2673行目が `                    </>`
lines.splice(2641, 2673 - 2641 + 1, correctLines);

fs.writeFileSync('src/pages/MapEditorPage.tsx', lines.join('\n'));
console.log("Fixed editing modal by line numbers 2!");
