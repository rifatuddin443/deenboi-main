import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  scanning: boolean;
}

const BarcodeScanner = ({ onScan, scanning }: BarcodeScannerProps) => {
  const [isActive, setIsActive] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("barcode-scanner");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.6,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {}
      );
      setIsActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      setManualMode(true);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {});
    }
    setIsActive(false);
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
    }
  };

  if (!scanning) return null;

  return (
    <div className="space-y-4">
      {!manualMode ? (
        <>
          <div
            id="barcode-scanner"
            className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-muted min-h-[200px]"
          />
          <div className="flex gap-2 justify-center">
            {!isActive ? (
              <Button onClick={startScanner} className="gap-2">
                <Camera className="h-4 w-4" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopScanner} variant="secondary" className="gap-2">
                <CameraOff className="h-4 w-4" />
                Stop Camera
              </Button>
            )}
            <Button variant="outline" onClick={() => { stopScanner(); setManualMode(true); }} className="gap-2">
              <Keyboard className="h-4 w-4" />
              Type Manually
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3 max-w-md mx-auto">
          <div className="flex gap-2">
            <Input
              placeholder="Enter ISBN / barcode..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              autoFocus
            />
            <Button onClick={handleManualSubmit}>Go</Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setManualMode(false)} className="gap-2">
            <Camera className="h-4 w-4" />
            Use Camera
          </Button>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
