const fs = require('fs');
let code = fs.readFileSync('src/pages/EventEditorPage.tsx', 'utf8');

const importTarget = `import { ArrowLeft, Save, Plus, MessageSquare, Trash2, Loader2, Check } from 'lucide-react';`;
const importReplace = `import { ArrowLeft, Save, Plus, MessageSquare, Trash2, Loader2, Check, Play } from 'lucide-react';
import { PORTRAITS } from '../data/portraits';`;
code = code.replace(importTarget, importReplace);

const stateTarget = `  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);`;
const stateReplace = `  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<CustomEvent | null>(null);
  const [previewNodeIndex, setPreviewNodeIndex] = useState(0);`;
code = code.replace(stateTarget, stateReplace);

const playPreviewMethods = `
  const playEvent = (event: CustomEvent) => {
    if (event.nodes.length === 0) return;
    setPreviewEvent(event);
    setPreviewNodeIndex(0);
  };

  const nextPreviewNode = () => {
    if (!previewEvent) return;
    if (previewNodeIndex < previewEvent.nodes.length - 1) {
      setPreviewNodeIndex(previewNodeIndex + 1);
    } else {
      setPreviewEvent(null);
    }
  };
`;

const loadDataTarget = `  useEffect(() => {
    fetchCustomEventsFromFirestore().then(fetched => {`;
code = code.replace(loadDataTarget, playPreviewMethods + loadDataTarget);

const buttonsTarget = `                  <button
                    onClick={() => removeEvent(eventIndex)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="イベント削除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>`;
const buttonsReplace = `                  <button
                    onClick={() => playEvent(event)}
                    className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="プレビュー再生"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => removeEvent(eventIndex)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="イベント削除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>`;
code = code.replace(buttonsTarget, buttonsReplace);

const overlayTarget = `    </div>
  );
}`;
const overlayReplace = `      {/* プレビューオーバーレイ */}
      {previewEvent && previewEvent.nodes[previewNodeIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={nextPreviewNode}>
          <div className="w-full max-w-2xl bg-black/80 border-t-4 border-indigo-500 p-6 flex gap-6 cursor-pointer shadow-2xl rounded-lg">
            <div className="flex-shrink-0 w-24 h-24 bg-slate-800 border-2 border-indigo-400 rounded-lg overflow-hidden flex items-center justify-center">
              {PORTRAITS[previewEvent.nodes[previewNodeIndex].portraitId || 'none'] ? (
                <img src={PORTRAITS[previewEvent.nodes[previewNodeIndex].portraitId || 'none']} alt="portrait" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-500 text-xs text-center">No Image</div>
              )}
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="font-bold text-indigo-300 text-lg mb-2 truncate">
                {previewEvent.nodes[previewNodeIndex].speakerName}
              </div>
              <div className="text-white text-xl leading-relaxed break-words overflow-y-auto">
                {previewEvent.nodes[previewNodeIndex].message}
              </div>
              <div className="mt-auto self-end text-sm text-indigo-400 animate-pulse mt-4">
                ▼ クリックして進む
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;
code = code.replace(overlayTarget, overlayReplace);

fs.writeFileSync('src/pages/EventEditorPage.tsx', code);
console.log('patched event editor with play');
