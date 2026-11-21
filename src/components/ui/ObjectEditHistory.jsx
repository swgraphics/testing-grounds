import { useHistoryStore } from "../../systems/history/historyStore";

export default function ObjectEditHistory() {
  const canUndo = useHistoryStore(state => state.undoStack.length > 0);
  const canRedo = useHistoryStore(state => state.redoStack.length > 0);
  return <div className="tg-panel-actions" aria-label="Object edit history">
    <button className="tg-ui-button" data-object-undo disabled={!canUndo} onClick={() => useHistoryStore.getState().undo()}>UNDO</button>
    <button className="tg-ui-button" data-object-redo disabled={!canRedo} onClick={() => useHistoryStore.getState().redo()}>REDO</button>
  </div>;
}
