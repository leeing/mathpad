import React, { useEffect, useState } from 'react';
import { useGeoStore } from '../store/geoStore';
import { useToolStore } from '../store/toolStore';
import type { PointElement } from '../types/geoElements';

export const VerifyPanel: React.FC = () => {
  const activeTool = useToolStore((state) => state.activeTool);
  const tempIds = useToolStore((state) => state.tempIds);
  const getElementById = useGeoStore((state) => state.getElementById);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (activeTool !== 'verify_triangle') {
      setResult(null);
      return;
    }

    if (tempIds.length === 3) {
        // Assume 3 points form a triangle.
        // Or maybe we want to select 2 triangles (6 points)? Or 3 lines?
        // Let's implement a simple "Select 3 points to analyze triangle" first.
        
        const p1 = getElementById(tempIds[0]) as PointElement;
        const p2 = getElementById(tempIds[1]) as PointElement;
        const p3 = getElementById(tempIds[2]) as PointElement;

        if (p1 && p2 && p3) {
            const d12 = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
            const d23 = Math.sqrt((p2.x - p3.x)**2 + (p2.y - p3.y)**2);
            const d31 = Math.sqrt((p3.x - p1.x)**2 + (p3.y - p1.y)**2);
            
            const sides = [d12, d23, d31].sort((a, b) => a - b);
            const [a, b, c] = sides;
            
            // Pythagoras check (with some tolerance)
            const isRight = Math.abs(a*a + b*b - c*c) < 1; 
            
            setResult(`Triangle Sides: ${d12.toFixed(1)}, ${d23.toFixed(1)}, ${d31.toFixed(1)}
            ${isRight ? '✅ Right Angled (Pythagoras holds!)' : 'Not Right Angled'}`);
        }
    } else {
        setResult('Select 3 points to verify triangle properties');
    }
  }, [activeTool, tempIds, getElementById]);

  if (activeTool !== 'verify_triangle') return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white p-4 rounded shadow-lg z-10">
      <h3 className="font-bold mb-2">Triangle Verification</h3>
      <p className="text-sm text-gray-600 whitespace-pre-line">{result}</p>
    </div>
  );
};
