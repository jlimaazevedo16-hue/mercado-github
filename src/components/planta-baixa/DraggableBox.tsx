import { useState, useRef, useEffect } from "react";
import { Tables } from "@/integrations/supabase/types";

interface DraggableBoxProps {
  box: Tables<"boxes"> & { pos_x?: number | null; pos_y?: number | null };
  statusColors: Record<string, { bg: string; text: string; glow: string }>;
  isEditMode: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onPositionChange: (boxId: string, x: number, y: number) => void;
  onClick: (box: Tables<"boxes">) => void;
  zoom: number;
}

export const DraggableBox = ({
  box,
  statusColors,
  isEditMode,
  containerRef,
  onPositionChange,
  onClick,
  zoom,
}: DraggableBoxProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({
    x: box.pos_x ?? 0,
    y: box.pos_y ?? 0,
  });
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setPosition({
      x: box.pos_x ?? 0,
      y: box.pos_y ?? 0,
    });
  }, [box.pos_x, box.pos_y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...position };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !isEditMode) return;

    const deltaX = (e.clientX - dragStartPos.current.x) / zoom;
    const deltaY = (e.clientY - dragStartPos.current.y) / zoom;

    const newX = Math.max(0, initialPos.current.x + deltaX);
    const newY = Math.max(0, initialPos.current.y + deltaY);

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (isDragging && isEditMode) {
      setIsDragging(false);
      onPositionChange(box.id, position.x, position.y);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, position]);

  const colors = statusColors[box.status] || statusColors.DISPONIVEL;

  return (
    <div
      ref={boxRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (!isDragging && !isEditMode) {
          e.stopPropagation();
          onClick(box);
        }
      }}
      className={`absolute w-20 h-20 rounded-lg ${colors.bg} shadow-lg ${colors.glow} flex flex-col items-center justify-center transition-all ${
        isEditMode ? "cursor-move hover:ring-2 hover:ring-white" : "cursor-pointer hover:scale-105"
      } ${isDragging ? "opacity-80 ring-2 ring-white" : ""}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: isDragging ? 50 : 10,
      }}
    >
      <span className={`text-xs font-bold ${colors.text}`}>{box.codigo}</span>
      <span className={`text-[10px] ${colors.text} opacity-80 truncate max-w-full px-1`}>
        {box.boxe}
      </span>
    </div>
  );
};