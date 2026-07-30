import { BarcodeScanner } from "@/components/BarcodeScanner";

export default function ScanPage() {
  return (
    <div>
      <h1 className="mb-5 text-2xl font-semibold">Scan barcode</h1>
      <BarcodeScanner />
    </div>
  );
}
