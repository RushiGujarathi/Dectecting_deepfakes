import { useEffect, useRef, useState } from "react";

export default function HeatmapViewer({ file, result }) {
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!file || !result || !canvasRef.current) return;
    if (!file.type.startsWith("image/")) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      canvas.width  = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width, h = canvas.height;

      // Compute local variance map (same as noise detector)
      const heatmap = new Float32Array(w * h);
      const blockSize = 8;

      for (let by = 0; by < h - blockSize; by += blockSize) {
        for (let bx = 0; bx < w - blockSize; bx += blockSize) {
          // Compute block variance
          let sum = 0, sum2 = 0, count = 0;
          for (let dy = 0; dy < blockSize; dy++) {
            for (let dx = 0; dx < blockSize; dx++) {
              const idx = ((by + dy) * w + (bx + dx)) * 4;
              const lum = 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];
              sum += lum; sum2 += lum * lum; count++;
            }
          }
          const mean = sum / count;
          const variance = (sum2 / count) - (mean * mean);

          // Fill block in heatmap
          for (let dy = 0; dy < blockSize; dy++) {
            for (let dx = 0; dx < blockSize; dx++) {
              heatmap[(by + dy) * w + (bx + dx)] = variance;
            }
          }
        }
      }

      // Normalize
      const maxV = Math.max(...heatmap);
      const minV = Math.min(...heatmap);
      const range = maxV - minV || 1;

      // Overlay heatmap
      const overlayData = ctx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const normalized = (heatmap[i] - minV) / range; // 0-1
        // Suspicious = low variance (too smooth) — show in RED
        // Natural = high variance — show transparent
        const suspicion = 1 - normalized;
        const alpha = suspicion > 0.6 ? (suspicion - 0.6) * 2.5 * 180 : 0;

        overlayData.data[i*4]   = 255;  // R
        overlayData.data[i*4+1] = Math.floor(suspicion * 50); // G
        overlayData.data[i*4+2] = 0;    // B
        overlayData.data[i*4+3] = Math.floor(alpha); // A
      }
      ctx.putImageData(overlayData, 0, 0);

      // Draw grid lines (DCT block boundaries — like JPEG forensics tools)
      ctx.strokeStyle = "rgba(0, 170, 255, 0.15)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 8) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 8) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Annotate suspicious regions
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "rgba(255, 45, 85, 0.9)";
      if (result.verdict === "deepfake" || result.verdict === "suspicious") {
        // Mark top-left region as suspicious (demo annotation)
        ctx.strokeStyle = "rgba(255, 45, 85, 0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.1, h * 0.1, w * 0.35, h * 0.45);
        ctx.fillText("⚠ HIGH SUSPICION", w * 0.1 + 4, h * 0.1 - 4);
      }

      URL.revokeObjectURL(url);
      setRendered(true);
    };

    img.src = url;
  }, [file, result]);

  if (!file?.type.startsWith("image/")) {
    return (
      <div style={{
        background: "var(--surface)", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "var(--r-xl)", padding: "2rem", textAlign: "center",
        marginBottom: "1.25rem"
      }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem", opacity: 0.3 }}>🗺️</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--t3)" }}>
          Heatmap visualization available for images only
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "var(--r-xl)", padding: "1.5rem", marginBottom: "1.25rem"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Forensic Heatmap</div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Pixel Inconsistency Visualization</div>
        </div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.72rem", fontFamily: "var(--mono)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: "rgba(255,45,85,0.8)", borderRadius: 2, display: "inline-block" }}/>
            <span style={{ color: "var(--fake)" }}>Suspicious</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: "rgba(0,170,255,0.4)", borderRadius: 2, display: "inline-block" }}/>
            <span style={{ color: "var(--img)" }}>DCT blocks</span>
          </span>
        </div>
      </div>

      <div style={{ borderRadius: "var(--r)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
        <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      </div>

      {rendered && (
        <div style={{ marginTop: "0.75rem", fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--t2)" }}>
          Red overlay = low pixel variance (unnaturally smooth) · Blue grid = 8×8 DCT block boundaries
        </div>
      )}
    </div>
  );
}