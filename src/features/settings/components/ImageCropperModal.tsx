import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X } from "lucide-react";
import { Button } from "../../../components/ui/Button";

// Utility function to create a canvas and extract the cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    // Provide crossOrigin so that drawn image doesn't taint canvas
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // set canvas size to match the bounding box
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // draw image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return canvas.toDataURL("image/jpeg");
}

interface ImageCropperModalProps {
  imageSrc: string;
  onSave: (croppedBase64: string) => void;
  onCancel: () => void;
}

type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function ImageCropperModal({
  imageSrc,
  onSave,
  onCancel,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback(
    (_croppedArea: PixelCrop, currentCroppedAreaPixels: PixelCrop) => {
      setCroppedAreaPixels(currentCroppedAreaPixels);
    },
    [],
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onSave(croppedImage);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal Card */}
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col items-center relative z-10 animate-in zoom-in-95 duration-200 border border-border">
        <div className="w-full flex justify-between items-center p-4 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground">
            Crop Profile Image
          </h3>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full h-[300px] sm:h-[400px] bg-black/20">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="w-full p-4 space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Zoom</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Save Selection"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
