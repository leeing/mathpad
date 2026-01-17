import React, { useState } from 'react';
import { useGeoStore } from '../store/geoStore';
import { useViewStore } from '../store/viewStore';
import { generateId } from '../utils/id';
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

export const FunctionPanel: React.FC = () => {
  const [expression, setExpression] = useState('x^2');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const addElement = useGeoStore((state) => state.addElement);
  const elements = useGeoStore((state) => state.elements);
  const removeElement = useGeoStore((state) => state.removeElement);
  const darkTheme = useViewStore((state) => state.darkTheme);

  const handleAddFunction = () => {
    addElement({
      id: generateId(),
      type: 'function_graph',
      name: `f(x) = ${expression}`,
      visible: true,
      style: { stroke: '#ef4444', strokeWidth: 1.5 },
      dependencies: [],
      definition: { type: 'function_expression', expression },
      expression: expression
    } as any);
    setIsCollapsed(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddFunction();
    }
  };

  const functions = Object.values(elements).filter(e => e.type === 'function_graph');

  return (
    <div className={clsx(
      "absolute left-4 bottom-14 rounded-lg shadow-lg w-64 z-10",
      darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
    )}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={clsx(
          "w-full flex items-center justify-between p-3 rounded-lg",
          darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-50"
        )}
      >
        <span className="font-bold text-sm">函数图像</span>
        {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {!isCollapsed && (
        <div className="p-3 pt-0">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="如 x^2, sin(x)"
              className={clsx(
                "border rounded px-2 py-1 w-full text-sm",
                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
              )}
            />
            <button
              onClick={handleAddFunction}
              className="bg-blue-500 text-white rounded p-1 hover:bg-blue-600"
            >
              <Plus size={16} />
            </button>
          </div>

          {functions.length > 0 && (
            <div className="flex flex-col gap-2">
              {functions.map((func: any) => (
                <div key={func.id} className={clsx(
                  "flex justify-between items-center p-2 rounded text-sm",
                  darkTheme ? "bg-gray-700" : "bg-gray-50"
                )}>
                  <span className="truncate" title={func.name}>{func.name}</span>
                  <button
                    onClick={() => removeElement(func.id)}
                    className={clsx(
                      "hover:text-red-500",
                      darkTheme ? "text-gray-400" : "text-gray-400"
                    )}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

