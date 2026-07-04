const fs = require('fs');
let code = fs.readFileSync('src/pages/MapEditorPage.tsx', 'utf8');

const target = `                     {hasEvent && hasEvent.type === 'monologue' && (
                        <div className="w-full h-full bg-emerald-500/50 flex items-center justify-center text-xs font-bold text-emerald-100" title={\`モノローグ\\n\${hasEvent.data?.text || ''}\`}>
                          M
                        </div>
                     )}`;

const replace = `                     {hasEvent && hasEvent.type === 'monologue' && (
                        <div className="w-full h-full bg-emerald-500/50 flex items-center justify-center text-xs font-bold text-emerald-100" title={\`モノローグ\\n\${hasEvent.data?.text || ''}\`}>
                          M
                        </div>
                     )}
                     {hasEvent && hasEvent.type === 'custom_event' && (
                        <div className="w-full h-full bg-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-100" title={\`カスタムイベント: \${hasEvent.data?.eventId || ''}\`}>
                          C
                        </div>
                     )}`;

code = code.replace(target, replace);
fs.writeFileSync('src/pages/MapEditorPage.tsx', code);
console.log('patched map editor');
