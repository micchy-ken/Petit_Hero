const fs = require('fs');
let code = fs.readFileSync('src/pages/MapEditorPage.tsx', 'utf8');

const saveTarget = `        if (eventType === 'start_point') {
          const targetFromMap = startPointFromMap || null;
          // 元マップ(fromMap)ごとに初期値は1つしか置けないようにする
          const sameFromMapIndex = newEvents.findIndex(
            e => e.type === 'start_point' && (e.data?.fromMap || null) === targetFromMap
          );
          if (sameFromMapIndex >= 0) {
            newEvents.splice(sameFromMapIndex, 1);
          }
          data = { fromMap: targetFromMap };
        } else if (eventType === 'teleport') {
          if (!teleportTargetMap) return;
          data = { targetMap: teleportTargetMap };
        } else if (eventType === 'monologue') {
          data = { text: monologueText };
        } else if (eventType === 'custom_event') {
          data = { eventId: customEventId };
        }`;

const saveReplace = `        if (eventType === 'start_point') {
          const targetFromMap = startPointFromMap || null;
          // 元マップ(fromMap)ごとに初期値は1つしか置けないようにする
          const sameFromMapIndex = newEvents.findIndex(
            e => e.type === 'start_point' && (e.data?.fromMap || null) === targetFromMap
          );
          if (sameFromMapIndex >= 0) {
            newEvents.splice(sameFromMapIndex, 1);
          }
          data = { fromMap: targetFromMap, eventId: customEventId || undefined };
        } else if (eventType === 'teleport') {
          if (!teleportTargetMap) return;
          data = { targetMap: teleportTargetMap, eventId: customEventId || undefined };
        } else if (eventType === 'monologue') {
          data = { text: monologueText };
        } else if (eventType === 'custom_event') {
          data = { eventId: customEventId };
        }`;

code = code.replace(saveTarget, saveReplace);

const editTarget = `    let data: any = {};
    if (editingEvent.type === 'start_point') {
      data.fromMap = editingEvent.fromMap || null;
    } else if (editingEvent.type === 'teleport') {
      if (!editingEvent.targetMap) {
        alert('移動先マップを選択してください');
        return;
      }
      data.targetMap = editingEvent.targetMap;
    } else if (editingEvent.type === 'monologue') {
      data.text = editingEvent.text || '';
    } else if (editingEvent.type === 'custom_event') {
      data.eventId = editingEvent.eventId || '';
    }`;

const editReplace = `    let data: any = {};
    if (editingEvent.type === 'start_point') {
      data.fromMap = editingEvent.fromMap || null;
      data.eventId = editingEvent.eventId || undefined;
    } else if (editingEvent.type === 'teleport') {
      if (!editingEvent.targetMap) {
        alert('移動先マップを選択してください');
        return;
      }
      data.targetMap = editingEvent.targetMap;
      data.eventId = editingEvent.eventId || undefined;
    } else if (editingEvent.type === 'monologue') {
      data.text = editingEvent.text || '';
    } else if (editingEvent.type === 'custom_event') {
      data.eventId = editingEvent.eventId || '';
    }`;
    
code = code.replace(editTarget, editReplace);

// We should also change the UI to show eventId for start_point and teleport.
const uiTarget = `                {eventType === 'custom_event' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">イベント選択</label>`;
                    
const uiReplace = `                {(eventType === 'custom_event' || eventType === 'start_point' || eventType === 'teleport') && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">連動イベント (任意)</label>`;
                    
code = code.replace(uiTarget, uiReplace);

const editUiTarget = `              {editingEvent.type === 'custom_event' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300 font-bold uppercase">イベント選択</label>`;
                  
const editUiReplace = `              {(editingEvent.type === 'custom_event' || editingEvent.type === 'start_point' || editingEvent.type === 'teleport') && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300 font-bold uppercase">連動イベント (任意)</label>`;
                  
code = code.replace(editUiTarget, editUiReplace);

fs.writeFileSync('src/pages/MapEditorPage.tsx', code);
console.log('patched map editor events');
