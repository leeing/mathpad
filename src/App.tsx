import { useRef } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { Toolbar } from './components/Toolbar';
import { FunctionPanel } from './components/FunctionPanel';
import { VerifyPanel } from './components/VerifyPanel';
import { ViewPanel } from './components/ViewPanel';
import { PropertyPanel } from './components/PropertyPanel';
import { StatusBar } from './components/StatusBar';
import { ConicPanel } from './components/ConicPanel';
import { TemplatePanel } from './components/TemplatePanel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useViewStore } from './store/viewStore';
import { clsx } from 'clsx';
import Konva from 'konva';

function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const darkTheme = useViewStore((state) => state.darkTheme);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className={clsx(
      "h-screen w-screen relative pb-8",
      darkTheme ? "dark bg-gray-900" : "bg-gray-50"
    )}>
      <CanvasStage ref={stageRef} />
      <Toolbar />
      <FunctionPanel />
      <ConicPanel />
      <TemplatePanel />
      <VerifyPanel />
      <ViewPanel stageRef={stageRef} />
      <PropertyPanel />
      <StatusBar />

      <div className={clsx(
        "absolute top-4 left-16 p-4 rounded shadow-lg pointer-events-none opacity-80 z-10",
        darkTheme ? "bg-gray-800" : "bg-white"
      )}>
        <h1 className={clsx("text-xl font-bold", darkTheme ? "text-gray-100" : "text-gray-800")}>MathPad</h1>
        <p className={clsx("text-sm", darkTheme ? "text-gray-400" : "text-gray-500")}>v0.13.0 - Plane Geometry</p>
      </div>
    </div>
  );
}

export default App;



