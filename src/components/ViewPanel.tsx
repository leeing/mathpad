import { useState, useRef } from 'react';
import { Grid3X3, Axis3d, Download, ChevronDown, FolderOpen, Trash2, FileJson, Image, Moon, Sun } from 'lucide-react';
import { useViewStore } from '../store/viewStore';
import { useGeoStore } from '../store/geoStore';
import { clsx } from 'clsx';
import Konva from 'konva';

interface ViewPanelProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

const pngPresets = [
  { label: '原始尺寸', width: 0 },
  { label: '单栏 (300px)', width: 300 },
  { label: '双栏 (150px)', width: 150 },
  { label: '全宽 (600px)', width: 600 },
];

export const ViewPanel: React.FC<ViewPanelProps> = ({ stageRef }) => {
  const { showGrid, showAxes, setShowGrid, setShowAxes, darkTheme, toggleDarkTheme } = useViewStore();
  const { elements, clearAll, loadElements } = useGeoStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPngOptions, setShowPngOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTimestamp = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  };

  const handleExportJson = () => {
    const data = JSON.stringify({ version: '0.13.0', elements }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `几何图形-${getTimestamp()}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportPng = (presetWidth: number) => {
    if (stageRef.current) {
      let pixelRatio = 2;
      if (presetWidth > 0) {
        const stageWidth = stageRef.current.width();
        pixelRatio = presetWidth / stageWidth;
      }

      const uri = stageRef.current.toDataURL({ pixelRatio });
      const link = document.createElement('a');
      link.download = `几何图形-${getTimestamp()}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setShowExportMenu(false);
    setShowPngOptions(false);
  };

  const handleOpenProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.elements) {
          loadElements(data.elements);
        }
      } catch (err) {
        alert('无法读取文件，请确保是有效的 JSON 格式');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    clearAll();
    setShowClearConfirm(false);
  };

  return (
    <>
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={clsx(
            "p-6 rounded-lg shadow-xl max-w-sm",
            darkTheme ? "bg-gray-800 text-white" : "bg-white text-gray-800"
          )}>
            <h3 className="text-lg font-bold mb-4">确认清空画布</h3>
            <p className="mb-6 text-sm opacity-80">此操作不可撤销，所有图形将被删除。</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className={clsx(
                  "px-4 py-2 rounded",
                  darkTheme ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
                )}
              >
                取消
              </button>
              <button
                onClick={confirmClearAll}
                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={clsx(
        "absolute top-4 right-4 p-2 rounded shadow-lg flex gap-2 z-10",
        darkTheme ? "bg-gray-800" : "bg-white"
      )}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleOpenProject}
          className="hidden"
        />
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={clsx(
            "p-2 rounded hover:bg-gray-100",
            showGrid ? "bg-blue-100 text-blue-600" : "text-gray-600"
          )}
          title="网格"
        >
          <Grid3X3 size={20} />
        </button>
        <button
          onClick={() => setShowAxes(!showAxes)}
          className={clsx(
            "p-2 rounded hover:bg-gray-100",
            showAxes ? "bg-blue-100 text-blue-600" : "text-gray-600"
          )}
          title="坐标轴"
        >
          <Axis3d size={20} />
        </button>
        <div className="w-px bg-gray-200 mx-1"></div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="打开文件"
        >
          <FolderOpen size={20} />
        </button>
        <div className="relative">
          <button
            onClick={() => {
              setShowExportMenu(!showExportMenu);
              setShowPngOptions(false);
            }}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 flex items-center gap-1"
            title="导出"
          >
            <Download size={20} />
            <ChevronDown size={14} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded shadow-lg border py-1 min-w-[160px]">
              <button
                onClick={handleExportJson}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <FileJson size={16} />
                导出为 JSON
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowPngOptions(!showPngOptions)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Image size={16} />
                    导出为 PNG
                  </span>
                  <ChevronDown size={14} className={showPngOptions ? 'rotate-180' : ''} />
                </button>
                {showPngOptions && (
                  <div className="border-t mt-1 pt-1">
                    {pngPresets.map((preset, i) => (
                      <button
                        key={i}
                        onClick={() => handleExportPng(preset.width)}
                        className="w-full text-left px-6 py-1.5 text-sm hover:bg-gray-100"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1"></div>
        <button
          onClick={toggleDarkTheme}
          className={clsx(
            "p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
            darkTheme ? "text-yellow-500" : "text-gray-600"
          )}
          title={darkTheme ? "亮色主题" : "暗色主题"}
        >
          {darkTheme ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={handleClearAll}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
          title="清空"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </>
  );
};
