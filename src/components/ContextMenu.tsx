import React from 'react';
import { EyeOff, Trash2, Settings } from 'lucide-react';
import { useGeoStore } from '../store/geoStore';
import { useToolStore } from '../store/toolStore';

interface ContextMenuProps {
    x: number;
    y: number;
    elementId: string;
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, elementId, onClose }) => {
    const updateElement = useGeoStore((state) => state.updateElement);
    const removeElement = useGeoStore((state) => state.removeElement);
    const getElementById = useGeoStore((state) => state.getElementById);
    const setSelectedId = useToolStore((state) => state.setSelectedId);

    const element = getElementById(elementId);
    if (!element) return null;

    const handleHide = () => {
        updateElement(elementId, { visible: false });
        onClose();
    };

    const handleDelete = () => {
        removeElement(elementId);
        onClose();
    };

    const handleProperties = () => {
        setSelectedId(elementId);
        useGeoStore.getState().setSelection([elementId]);
        onClose();
    };

    // Prevent context menu from appearing outside viewport
    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        left: Math.min(x, window.innerWidth - 160),
        top: Math.min(y, window.innerHeight - 140),
        zIndex: 1000,
    };

    return (
        <>
            {/* Backdrop to close menu */}
            <div
                className="fixed inset-0 z-50"
                onClick={onClose}
                onContextMenu={(e) => { e.preventDefault(); onClose(); }}
            />
            {/* Menu */}
            <div
                className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[140px]"
                style={menuStyle}
            >
                <button
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    onClick={handleHide}
                >
                    <EyeOff size={14} />
                    隐藏
                </button>
                <button
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    onClick={handleDelete}
                >
                    <Trash2 size={14} />
                    删除
                </button>
                <div className="border-t border-gray-200 my-1" />
                <button
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    onClick={handleProperties}
                >
                    <Settings size={14} />
                    属性...
                </button>
            </div>
        </>
    );
};
