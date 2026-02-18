import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut } from "lucide-react";

interface AvatarEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onSave: (croppedImage: Blob) => void;
}

export const AvatarEditorDialog = ({ open, onOpenChange, imageUrl, onSave }: AvatarEditorDialogProps) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = useCallback(async () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to the desired output size (square)
    const size = 300;
    canvas.width = size;
    canvas.height = size;

    // Calculate the crop area
    const containerRect = containerRef.current.getBoundingClientRect();
    const img = imageRef.current;
    
    // Calculate scale factors
    const scaleX = img.naturalWidth / (img.width * zoom);
    const scaleY = img.naturalHeight / (img.height * zoom);
    
    // Calculate source coordinates (what part of the original image to crop)
    const sourceX = Math.max(0, -position.x * scaleX);
    const sourceY = Math.max(0, -position.y * scaleY);
    const sourceWidth = Math.min(img.naturalWidth, containerRect.width * scaleX);
    const sourceHeight = Math.min(img.naturalHeight, containerRect.height * scaleY);

    // Draw the cropped image
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, size, size
    );

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/jpeg', 0.9);
  }, [zoom, position, onSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Profile Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div
            ref={containerRef}
            className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Preview"
              className="absolute select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'top left',
              }}
              draggable={false}
            />
            
            {/* Circle overlay to show the crop area */}
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full">
                <defs>
                  <mask id="circleMask">
                    <rect width="100%" height="100%" fill="white" opacity="0.5" />
                    <circle 
                      cx="50%" 
                      cy="50%" 
                      r="40%" 
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect 
                  width="100%" 
                  height="100%" 
                  fill="black" 
                  opacity="0.5"
                  mask="url(#circleMask)"
                />
                <circle 
                  cx="50%" 
                  cy="50%" 
                  r="40%" 
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="5,5"
                />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Drag to reposition • Slide to zoom
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
