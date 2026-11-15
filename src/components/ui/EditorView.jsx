import { useEffect } from "react";
import { useEditorStore, panelLayoutStyle } from "../../systems/editor/editorStore";
import { useTerrainExportStore } from "../../systems/terrain/terrainExportStore";
import { DirectionalPanelLayout } from "./DirectionalPanels";
import { ActiveToolFeedback } from "./EditorPanelControls";
import TerrainExportPanel from "./TerrainExportPanel";
import "./DirectionalPanels.css";

export default function EditorView(hosts) {
  const viewMode = useEditorStore(state => state.viewMode);
  const visiblePanels = useEditorStore(state => state.visiblePanels);
  const exportOpen = useTerrainExportStore(state => state.open);
  const editor = viewMode === "editor";
  useEffect(() => {
    document.body.classList.toggle("tg-editor-active", editor);
    return () => document.body.classList.remove("tg-editor-active");
  }, [editor]);
  return <>
    <ActiveToolFeedback style={panelLayoutStyle(visiblePanels)} />
    <DirectionalPanelLayout viewMode={viewMode} visiblePanels={visiblePanels} {...hosts} />
    {exportOpen && <TerrainExportPanel />}
  </>;
}
