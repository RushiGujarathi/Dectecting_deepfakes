import { useState, useRef, useCallback, useEffect } from "react";
import { gsap } from "gsap";
import { analyzeFile } from "../utils/api";

const SCAN_LOGS = [
  { text: "Initializing DeepShield forensics engine...", type: "" },
  { text: "Loading EfficientNet-B4 weights [OK]",         type: "" },
  { text: "Loading Xception detector [OK]",               type: "" },
  { text: "Preprocessing media file...",                   type: "" },
  { text: "Running frequency domain analysis...",          type: "" },
  { text: "Computing DCT coefficients...",                 type: "" },
  { text: "Running neural ensemble inference...",          type: "" },
  { text: "Applying Grad-CAM explainability...",           type: "" },
  { text: "Aggregating model scores...",                   type: "" },
  { text: "Computing confidence intervals...",             type: "" },
  { text: "Writing audit record to MongoDB...",            type: "" },
  { text: "Analysis complete.",                            type: "success" },
];

export default function UploadPage({ onResult }) {
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Hero entrance animation
  const heroRef   = useRef(null);
  const dropRef   = useRef(null);
  const capsRef   = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-eyebrow", { opacity: 0, x: -20, duration: 0.5 })
        .from(".hero-title",   { opacity: 0, y: 40,  duration: 0.7 }, "-=0.2")
        .from(".hero-sub",     { opacity: 0, y: 20,  duration: 0.5 }, "-=0.3")
        .from(dropRef.current, { opacity: 0, y: 30,  duration: 0.6, scale: 0.98 }, "-=0.2")
        .from(".scan-corner",  { opacity: 0, scale: 0, stagger: 0.08, duration: 0.4 }, "-=0.3")
        .from(".cap-card",     { opacity: 0, y: 24, stagger: 0.1, duration: 0.5 }, "-=0.2");
    });
    return () => ctx.revert();
  }, []);

  const runAnalysis = useCallback(async (file) => {
    setAnalyzing(true);
    setLogs([]);
    setError("");

    let step = 0;
    const interval = setInterval(() => {
      if (step < SCAN_LOGS.length - 1) {
        setLogs(prev => [...prev, SCAN_LOGS[step]]);
        step++;
      }
    }, 320);

    try {
      const result = await analyzeFile(file);
      clearInterval(interval);
      setLogs(prev => [...prev, SCAN_LOGS[SCAN_LOGS.length - 1]]);
      setTimeout(() => onResult(result), 700);
    } catch (err) {
      clearInterval(interval);
      setError(err.message || "Backend unreachable. Start FastAPI on port 8000.");
      setAnalyzing(false);
    }
  }, [onResult]);

  const handleFile = (file) => { if (file) runAnalysis(file); };

  if (analyzing) {
    return (
      <div className="analyzing-wrap">
        <div className="scanner-visual">
          <div className="scanner-ring r1" />
          <div className="scanner-ring r2" />
          <div className="scanner-ring r3" />
          <div className="scanner-ring r4" />
          <div className="scanner-cross" />
          <div className="scanner-sweep" />
          <div className="scan-ping" />
          <div className="scanner-center">SCAN</div>
        </div>

        <div className="scan-title">ANALYZING</div>
        <div className="scan-subtitle">MULTI-MODEL DEEPFAKE DETECTION PIPELINE</div>

        <div className="scan-terminal">
          <div className="terminal-bar">
            <div className="t-dot r" /><div className="t-dot y" /><div className="t-dot g" />
            <span className="terminal-title">deepshield.forensics</span>
          </div>
          <div className="terminal-body">
            {logs.map((l, i) => (
              <div key={i} className={`t-line ${l.type}`}>
                <span className="prompt">$</span>
                <span className="text">{l.text}</span>
              </div>
            ))}
            <div className="t-line">
              <span className="prompt">$</span>
              <span className="t-cursor" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hero" ref={heroRef}>
        {/* Corner decoration SVG */}
        <div className="hero-corner">
          <svg viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="90" cy="90" r="88" stroke="rgba(0,210,150,0.15)" strokeWidth="1"/>
            <circle cx="90" cy="90" r="70" stroke="rgba(0,210,150,0.10)" strokeWidth="1"/>
            <circle cx="90" cy="90" r="50" stroke="rgba(0,210,150,0.08)" strokeWidth="1"/>
            <line x1="2" y1="90" x2="178" y2="90" stroke="rgba(0,210,150,0.1)" strokeWidth="1"/>
            <line x1="90" y1="2" x2="90" y2="178" stroke="rgba(0,210,150,0.1)" strokeWidth="1"/>
            <circle cx="90" cy="90" r="4" fill="rgba(0,210,150,0.4)"/>
          </svg>
        </div>

        <div className="hero-eyebrow">DEEPSHIELD FORENSICS v2.0 — MULTI-MODAL AI</div>
        <h1 className="hero-title">
          DETECT<br/>
          <span className="accent">FAKES.</span><br/>
          <span className="dim">INSTANTLY.</span>
        </h1>
        <p className="hero-sub">
          Military-grade ensemble AI detects deepfakes across images, video,
          and audio with explainable confidence scores and full audit trails.
        </p>
      </div>

      {error && (
        <div className="err-box">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="drop-wrap">
        <div
          ref={dropRef}
          className={`drop-zone ${dragging ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
        >
          <div className="scan-corner tl" />
          <div className="scan-corner tr" />
          <div className="scan-corner bl" />
          <div className="scan-corner br" />
          <span className="dz-icon">⬡</span>
          <div className="dz-title">DROP FILE TO ANALYZE</div>
          <div className="dz-sub">Drag & drop or click to browse — image, video, or audio</div>
          <div className="dz-formats">
            {["JPG","PNG","WEBP","GIF","MP4","AVI","MOV","WEBM","MP3","WAV","OGG"].map(f => (
              <span key={f} className="fmt">{f}</span>
            ))}
          </div>
          <input
            ref={inputRef} type="file" accept="image/*,video/*,audio/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      </div>

      <div className="cap-grid">
        {[
          {
            num: "01", icon: "🖼", title: "Image Analysis",
            desc: "EfficientNet-B4 + Xception + Error Level Analysis + Frequency domain GAN artifact detection"
          },
          {
            num: "02", icon: "🎬", title: "Video Analysis",
            desc: "Frame-level CNN + temporal consistency + face-swap boundary detection + lip-sync verification"
          },
          {
            num: "03", icon: "🎧", title: "Audio Analysis",
            desc: "RawNet2 anti-spoofing + MFCC classification + prosody analysis + vocoder spectral artifacts"
          },
        ].map(c => (
          <div key={c.num} className="cap-card">
            <div className="cap-num">{c.num}</div>
            <span className="cap-icon">{c.icon}</span>
            <div className="cap-title">{c.title}</div>
            <div className="cap-desc">{c.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}
