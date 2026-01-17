import { useRef } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { Toolbar } from './components/Toolbar';
import { FormulaInputBar } from './components/FormulaInputBar';
import { ViewPanel } from './components/ViewPanel';
import { RightSidebar } from './components/RightSidebar';
import { FloatingPropertyPanel } from './components/FloatingPropertyPanel';
import { StatusBar } from './components/StatusBar';
import { ConicPanel } from './components/ConicPanel';
import { TriangleTransformPanel } from './components/TriangleTransformPanel';
import { QuickToolbar } from './components/QuickToolbar';
import { ContextMenu } from './components/ContextMenu';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useViewStore } from './store/viewStore';
import { clsx } from 'clsx';
import Konva from 'konva';

function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const darkTheme = useViewStore((state) => state.darkTheme);
  const contextMenu = useViewStore((state) => state.contextMenu);
  const closeContextMenu = useViewStore((state) => state.closeContextMenu);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className={clsx(
      "h-screen w-screen relative pb-8",
      darkTheme ? "dark bg-gray-900" : "bg-gray-50"
    )}>
      <CanvasStage ref={stageRef} />
      <Toolbar />
      <FormulaInputBar />
      <ConicPanel />
      <TriangleTransformPanel />
      <ViewPanel stageRef={stageRef} />
      <RightSidebar />
      <FloatingPropertyPanel />
      <QuickToolbar />
      <StatusBar />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          elementId={contextMenu.elementId}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

export default App;


