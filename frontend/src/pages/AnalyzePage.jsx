import { useState, useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { analyzeFile } from "../utils/api";

const TYPES = [
  {
    id: "image",
    icon: "🖼",
    label: "IMAGE",
    desc: "Detect AI-generated or manipulated photos and graphics",
    models: ["ELA", "Frequency", "Metadata", "Noise Analysis"],
    formats: ["JPG", "PNG", "WEBP", "GIF", "BMP"],
    accept: "image/*",
    color: "img",
    dropClass: "img-drop",
    scanClass: "scan-img",
    btnClass: "img-btn",
  },
  {
    id: "video",
    icon: "🎬",
    label: "VIDEO",
    desc: "Identify face-swap deepfakes in recordings and live streams",
    models: ["Container Forensics", "Entropy", "Signature", "Bitrate"],
    formats: ["MP4", "AVI", "MOV", "WEBM", "MKV"],
    accept: "video/*",
    color: "vid",
    dropClass: "vid-drop",
    scanClass: "scan-vid",
    btnClass: "vid-btn",
  },
  {
    id: "audio",
    icon: "🎧",
    label: "AUDIO",
    desc: "Detect synthetic or cloned voice recordings from TTS engines",
    models: ["TTS Signature", "Entropy", "Silence Pattern", "Spectral"],
    formats: ["MP3", "WAV", "OGG", "M4A", "FLAC"],
    accept: "audio/*",
    color: "aud",
    dropClass: "aud-drop",
    scanClass: "scan-aud",
    btnClass: "aud-btn",
  },
];

const LOGS = {
  image: [
    "Loading ELA detection module...",
    "Scanning frequency domain for GAN artifacts...",
    "Checking EXIF metadata for AI signatures...",
    "Analyzing noise pattern uniformity...",
    "Running ensemble score fusion...",
    "Generating forensic indicators...",
    "Saving result to MongoDB...",
  ],
  video: [
    "Parsing MP4 container structure...",
    "Checking container integrity...",
    "Scanning for editing tool signatures...",
    "Computing byte entropy profile...",
    "Analyzing bitrate consistency...",
    "Running temporal analysis...",
    "Saving result to MongoDB...",
  ],
  audio: [
    "Parsing WAV/audio header...",
    "Scanning for TTS engine signatures...",
    "Computing audio entropy profile...",
    "Analyzing silence ratio patterns...",
    "Measuring spectral flatness...",
    "Running ensemble score fusion...",
    "Saving result to MongoDB...",
  ],
};

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export default function AnalyzePage({ onResult }) {
  const [selected, setSelected] = useState("image");
  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs]         = useState([]);
  const [error, setError]       = useState("");
  const inputRef = useRef(null);

  const type = TYPES.find(t => t.id === selected);

  const selectType = (id) => {
    if (id === selected) return;
    setFile(null);
    setError("");
    setSelected(id);
  };

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setError("");
  }, []);

  const startScan = async () => {
    if (!file) return;
    setScanning(true);
    setLogs([]);
    setError("");

    const steps = LOGS[selected];
    let i = 0;
    const iv = setInterval(() => {
      if (i < steps.length) { setLogs(p => [...p, { text: steps[i], type: "" }]); i++; }
    }, 380);

    try {
      const result = await analyzeFile(file);
      clearInterval(iv);
      setLogs(p => [...p, { text: "✓ Analysis complete!", type: "ok" }]);
      setTimeout(() => onResult(result, selected), 700);
    } catch (err) {
      clearInterval(iv);
      setError(err.message || "Backend unreachable. Run: uvicorn main:app --reload");
      setScanning(false);
    }
  };

  // Scanning screen
  if (scanning) {
    return (
      <div className="scanning-wrap">
        <div className={`scan-radar ${type.scanClass}`}>
          <div className="radar-ring r1" /><div className="radar-ring r2" />
          <div className="radar-ring r3" /><div className="radar-ring r4" />
          <div className="radar-sweep" /><div className="radar-cross" />
          <div className="radar-ping" />
          <div className="radar-label">{type.icon}</div>
        </div>
        <div className="scan-title">ANALYZING {type.label}</div>
        <div className="scan-sub">RUNNING FORENSIC DETECTION PIPELINE</div>
        <div className="terminal">
          <div className="term-bar">
            <div className="tdot r" /><div className="tdot y" /><div className="tdot g" />
            <span className="term-title">deepshield.{selected}.analyzer</span>
          </div>
          <div className="term-body">
            {logs.map((l, i) => (
              <div key={i} className={`tline ${l.type}`}>
                <span className="prompt" style={{ color: `var(--${type.color})` }}>$</span>
                <span className="text">{l.text}</span>
              </div>
            ))}
            <div className="tline">
              <span className="prompt" style={{ color: `var(--${type.color})` }}>$</span>
              <span className="tcursor" style={{ background: `var(--${type.color})` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-pill">DEEPSHIELD AI FORENSICS — v3.0</div>
          <h1 className="hero-title">
            DETECT<br /><span className="accent">DEEPFAKES</span>
          </h1>
          <p className="hero-sub">
            Select a media type below, upload your file, and get
            a forensic verdict with confidence score in seconds.
          </p>
        </div>
        <div className="hero-stats">
          {[
            { n: "3",    l: "Media Types", c: "var(--img)" },
            { n: "4×",   l: "Models Each", c: "var(--vid)" },
            { n: "100%", l: "Explainable", c: "var(--aud)" },
          ].map(s => (
            <div key={s.l} className="hstat">
              <div className="hstat-num" style={{ color: s.c }}>{s.n}</div>
              <div className="hstat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1 — choose type */}
      <div style={{ marginBottom: "0.6rem" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--t3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          STEP 1 — Select media type
        </span>
      </div>

      <div className="type-selector">
        {TYPES.map(t => (
          <div
            key={t.id}
            className={`type-card ${t.id}-card ${selected === t.id ? "selected" : ""}`}
            onClick={() => selectType(t.id)}
            style={{ opacity: 1, visibility: "visible" }}
          >
            <div className="selected-check">✓</div>
            <span className="type-icon">{t.icon}</span>
            <div className="type-title">{t.label}</div>
            <div className="type-desc">{t.desc}</div>
            <div className="type-models">
              {t.models.map(m => (
                <span key={m} className="model-tag">{m}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Step 2 — upload */}
      <div style={{ marginBottom: "0.6rem", marginTop: "1.5rem" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--t3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          STEP 2 — Upload {type.label.toLowerCase()} file
        </span>
      </div>

      {error && <div className="err-bar">⚠ {error}</div>}

      {!file ? (
        <div
          className={`drop-area ${type.dropClass} ${dragging ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          style={{ opacity: 1, visibility: "visible" }}
        >
          <div className="corner tl" /><div className="corner tr" />
          <div className="corner bl" /><div className="corner br" />
          <span className="drop-big-icon" style={{ color: `var(--${type.color})` }}>{type.icon}</span>
          <div className="drop-title" style={{ color: `var(--${type.color})` }}>
            DROP {type.label} HERE
          </div>
          <div className="drop-sub">Click to browse or drag & drop your file</div>
          <div className="drop-formats">
            {type.formats.map(f => <span key={f} className="fmt-badge">{f}</span>)}
          </div>
          <input
            ref={inputRef} type="file" accept={type.accept}
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <>
          <div className="file-preview">
            <div className="fp-icon">{type.icon}</div>
            <div>
              <div className="fp-name">{file.name}</div>
              <div className="fp-meta">{formatBytes(file.size)} · {file.type}</div>
            </div>
            <button className="fp-remove" onClick={() => setFile(null)}>✕ Remove</button>
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--t3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              STEP 3 — Run analysis
            </span>
          </div>
          <button className={`analyze-btn ${type.btnClass}`} onClick={startScan}>
            ◈ ANALYZE {type.label} FOR DEEPFAKES
          </button>
        </>
      )}
    </div>
  );
}