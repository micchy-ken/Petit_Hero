const fs = require('fs');

function patchFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');

  const target = `{PORTRAITS[activeEvent.nodes[activeNodeIndex].portraitId || 'none'] ? (
                      <img src={PORTRAITS[activeEvent.nodes[activeNodeIndex].portraitId || 'none']} alt="portrait" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-500 text-xs text-center">No Image</div>
                    )}`;
                    
  const replace = `{PORTRAITS[activeEvent.nodes[activeNodeIndex].portraitId || 'none'] ? (
                      <img 
                        src={PORTRAITS[activeEvent.nodes[activeNodeIndex].portraitId || 'none']} 
                        alt="portrait" 
                        className={\`w-full h-full \${activeEvent.nodes[activeNodeIndex].portraitId === 'hero' ? 'object-cover' : 'object-contain'} \`}
                        style={{ imageRendering: activeEvent.nodes[activeNodeIndex].portraitId !== 'hero' ? 'pixelated' : 'auto' }}
                      />
                    ) : (
                      <div className="text-slate-500 text-xs text-center">No Image</div>
                    )}`;
  code = code.replace(target, replace);
  fs.writeFileSync(filepath, code);
}

patchFile('src/components/PhaserGameContainer.tsx');

function patchFile2(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');

  const target = `{PORTRAITS[previewEvent.nodes[previewNodeIndex].portraitId || 'none'] ? (
                <img src={PORTRAITS[previewEvent.nodes[previewNodeIndex].portraitId || 'none']} alt="portrait" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-500 text-xs text-center">No Image</div>
              )}`;
                    
  const replace = `{PORTRAITS[previewEvent.nodes[previewNodeIndex].portraitId || 'none'] ? (
                <img 
                  src={PORTRAITS[previewEvent.nodes[previewNodeIndex].portraitId || 'none']} 
                  alt="portrait" 
                  className={\`w-full h-full \${previewEvent.nodes[previewNodeIndex].portraitId === 'hero' ? 'object-cover' : 'object-contain'} \`}
                  style={{ imageRendering: previewEvent.nodes[previewNodeIndex].portraitId !== 'hero' ? 'pixelated' : 'auto' }}
                />
              ) : (
                <div className="text-slate-500 text-xs text-center">No Image</div>
              )}`;
  code = code.replace(target, replace);
  fs.writeFileSync(filepath, code);
}
patchFile2('src/pages/EventEditorPage.tsx');

console.log('patched portrait rendering');
