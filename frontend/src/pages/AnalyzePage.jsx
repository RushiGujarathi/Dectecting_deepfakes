import { useState, useRef, useCallback } from "react";
import { analyzeFile, analyzeText } from "../utils/api";

// ── Media type definitions ────────────────────────────────────────────────────
const TYPES = [
  {
    id: "image",
    icon: "🖼",
    label: "IMAGE",
    desc: "Detect AI-generated or manipulated photos",
    models: ["ELA v2", "DCT Grid", "Metadata", "PRNU"],
    formats: ["JPG", "PNG", "WEBP", "GIF", "BMP"],
    accept: "image/*",
    accentVar: "--c-img",
    accent: "#00aaff",
  },
  {
    id: "video",
    icon: "🎬",
    label: "VIDEO",
    desc: "Identify deepfakes and face-swaps in recordings",
    models: ["Container", "Entropy", "Motion", "Codec"],
    formats: ["MP4", "AVI", "MOV", "WEBM", "MKV"],
    accept: "video/*",
    accentVar: "--c-vid",
    accent: "#aa55ff",
  },
  {
    id: "audio",
    icon: "🎧",
    label: "AUDIO",
    desc: "Detect cloned or synthesised voice recordings",
    models: ["TTS Sig", "Pitch Var", "Spectral", "ZCR"],
    formats: ["MP3", "WAV", "OGG", "M4A", "FLAC"],
    accept: "audio/*",
    accentVar: "--c-aud",
    accent: "#ff6b35",
  },
  {
    id: "text",
    icon: "📝",
    label: "TEXT",
    desc: "Detect AI-generated or LLM-written content",
    models: ["Perplexity", "Burstiness", "Vocab", "Phrases"],
    formats: ["TXT", "MD", "Paste"],
    accept: "text/*,.txt,.md",
    accentVar: "--c-txt",
    accent: "#00e676",
    isText: true,
  },
  {
    id: "url",
    icon: "🔗",
    label: "URL",
    desc: "Scan any direct media URL for deepfakes",
    models: ["Auto-detect", "All models", "Domain check"],
    formats: ["IMG URL", "VID URL", "AUD URL"],
    accept: null,
    accentVar: "--c-url",
    accent: "#ffcc00",
    isUrl: true,
  },
];

const SCAN_LOGS = {
  image: [
    "Loading ELA v2 forensic module…",
    "Scanning DCT grid for GAN artifacts…",
    "Running EXIF / metadata forensics…",
    "Measuring PRNU noise fingerprint…",
    "Analyzing edge coherence patterns…",
    "Running 6-model ensemble fusion…",
    "Writing audit record to MongoDB…",
  ],
  video: [
    "Parsing container structure…",
    "Computing byte entropy profile…",
    "Detecting motion consistency…",
    "Running codec fingerprint analysis…",
    "Scanning for editing tool signatures…",
    "Assembling ensemble verdict…",
    "Writing audit record to MongoDB…",
  ],
  audio: [
    "Parsing audio header / metadata…",
    "Scanning for TTS engine signatures…",
    "Computing pitch variance profile…",
    "Analyzing zero-crossing rate…",
    "Measuring spectral flatness…",
    "Running 7-model ensemble fusion…",
    "Writing audit record to MongoDB…",
  ],
  text: [
    "Tokenizing input text…",
    "Computing character n-gram entropy…",
    "Measuring word distribution burstiness…",
    "Scanning for LLM phrase signatures…",
    "Evaluating vocabulary richness…",
    "Running 5-model ensemble fusion…",
    "Writing audit record to MongoDB…",
  ],
  url: [
    "Validating URL format…",
    "Fetching media from remote server…",
    "Auto-detecting media type…",
    "Running appropriate forensic pipeline…",
    "Aggregating ensemble scores…",
    "Writing audit record to MongoDB…",
  ],
};

const URL_MEDIA_EXTS = [".jpg",".jpeg",".png",".webp",".gif",".bmp",".mp4",".avi",".mov",".webm",".mp3",".wav",".ogg",".m4a"];
const WEB_DOMAINS    = ["youtube.com","youtu.be","vimeo.com","instagram.com","twitter.com","x.com","facebook.com","tiktok.com","reddit.com"];

function isWebPageUrl(url) {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    return WEB_DOMAINS.some(d => host.includes(d));
  } catch { return false; }
}
function isMediaUrl(url) {
  return URL_MEDIA_EXTS.some(e => url.toLowerCase().includes(e));
}
function formatBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b/1024).toFixed(1) + " KB";
  return (b/1048576).toFixed(1) + " MB";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeCard({ t, selected, onClick }) {
  const active = selected === t.id;
  return (
    <button
      onClick={() => onClick(t.id)}
      style={{
        background:    active ? `${t.accent}14` : "rgba(255,255,255,0.02)",
        border:        `1.5px solid ${active ? t.accent : "rgba(255,255,255,0.07)"}`,
        borderRadius:  14,
        padding:       "1rem 1.1rem",
        textAlign:     "left",
        cursor:        "pointer",
        transition:    "all 0.2s",
        position:      "relative",
        overflow:      "hidden",
      }}
    >
      {active && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          background: `radial-gradient(ellipse at 30% 40%, ${t.accent}18 0%, transparent 70%)`,
          pointerEvents: "none",
        }}/>
      )}
      {active && (
        <div style={{
          position: "absolute", top: 9, right: 9, width: 18, height: 18,
          borderRadius: "50%", background: t.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.6rem", color: "#000", fontWeight: 900,
        }}>✓</div>
      )}
      <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>{t.icon}</div>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "1.05rem", letterSpacing: "0.08em",
        color: active ? t.accent : "#edf4ff", marginBottom: "0.3rem",
      }}>{t.label}</div>
      <div style={{ fontSize: "0.72rem", color: "#6b8aaa", marginBottom: "0.65rem", lineHeight: 1.4 }}>
        {t.desc}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {t.models.map(m => (
          <span key={m} style={{
            fontSize: "0.6rem", fontFamily: "'DM Mono', monospace",
            background: active ? `${t.accent}20` : "rgba(255,255,255,0.04)",
            color: active ? t.accent : "#4a6a8a",
            padding: "2px 7px", borderRadius: 3,
            border: `1px solid ${active ? t.accent+"40" : "rgba(255,255,255,0.06)"}`,
          }}>{m}</span>
        ))}
      </div>
    </button>
  );
}

function ScanningScreen({ type, logs }) {
  const c = type.accent;
  const rgb = c.replace("#","");
  const toRgb = hex => {
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    return `${r},${g},${b}`;
  };
  const rgbStr = toRgb(rgb.length === 6 ? rgb : "00aaff");

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"2rem 0 1rem" }}>
      {/* Radar */}
      <div style={{ position:"relative", width:160, height:160, marginBottom:"1.5rem" }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            position:"absolute", borderRadius:"50%",
            border:`1px solid rgba(${rgbStr},${0.25-i*0.05})`,
            width:`${i*25}%`, height:`${i*25}%`,
            top:`${50-i*12.5}%`, left:`${50-i*12.5}%`,
          }}/>
        ))}
        {/* Sweep */}
        <div style={{
          position:"absolute", inset:0, borderRadius:"50%",
          background:`conic-gradient(from 0deg, transparent 0deg, rgba(${rgbStr},0.2) 60deg, transparent 60deg)`,
          animation:"spin 2s linear infinite",
        }}/>
        {/* Center icon */}
        <div style={{
          position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center",
          fontSize:"2rem",
        }}>{type.icon}</div>
        {/* Cross */}
        <div style={{
          position:"absolute", top:"50%", left:0, right:0, height:1,
          background:`rgba(${rgbStr},0.2)`, transform:"translateY(-50%)",
        }}/>
        <div style={{
          position:"absolute", top:0, bottom:0, left:"50%", width:1,
          background:`rgba(${rgbStr},0.2)`, transform:"translateX(-50%)",
        }}/>
      </div>

      <div style={{
        fontFamily:"'Bebas Neue', sans-serif",
        fontSize:"1.6rem", letterSpacing:"0.15em", color: c,
        marginBottom:"0.3rem",
      }}>ANALYZING {type.label}</div>
      <div style={{
        fontFamily:"'DM Mono', monospace", fontSize:"0.65rem",
        color:"#4a6a8a", letterSpacing:"0.12em", marginBottom:"1.5rem",
      }}>RUNNING FORENSIC DETECTION PIPELINE</div>

      {/* Terminal */}
      <div style={{
        width:"100%", maxWidth:540, background:"#080e18",
        border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden",
      }}>
        <div style={{
          padding:"8px 12px", background:"rgba(255,255,255,0.03)",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          display:"flex", alignItems:"center", gap:8,
        }}>
          {["#ff5f57","#ffbd2e","#28c940"].map((bg,i) => (
            <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:bg }}/>
          ))}
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#4a6a8a", marginLeft:6 }}>
            deepshield.{type.id}.analyzer
          </span>
        </div>
        <div style={{ padding:"0.85rem 1rem", minHeight:120 }}>
          {logs.map((l, i) => (
            <div key={i} style={{
              display:"flex", gap:8, padding:"2px 0",
              fontFamily:"'DM Mono',monospace", fontSize:"0.72rem",
              color: l.type === "ok" ? "#00e676" : "#6b8aaa",
            }}>
              <span style={{ color: c }}>$</span>
              <span>{l.text}</span>
            </div>
          ))}
          <div style={{ display:"flex", gap:8, padding:"2px 0" }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.72rem", color: c }}>$</span>
            <span style={{
              display:"inline-block", width:8, height:14,
              background: c, animation:"blink 1s step-end infinite",
              verticalAlign:"middle",
            }}/>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AnalyzePage({ onResult }) {
  const [selected,  setSelected]  = useState("image");
  const [file,      setFile]      = useState(null);
  const [textInput, setTextInput] = useState("");
  const [urlInput,  setUrlInput]  = useState("");
  const [dragging,  setDragging]  = useState(false);
  const [scanning,  setScanning]  = useState(false);
  const [logs,      setLogs]      = useState([]);
  const [error,     setError]     = useState("");
  const [urlWarn,   setUrlWarn]   = useState("");
  const inputRef = useRef(null);
  const type     = TYPES.find(t => t.id === selected);

  const selectType = (id) => {
    if (id === selected) return;
    setFile(null); setTextInput(""); setUrlInput("");
    setError(""); setUrlWarn(""); setSelected(id);
  };

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f); setError("");
  }, []);

  const handleUrlChange = (val) => {
    setUrlInput(val); setError(""); setUrlWarn("");
    if (!val) return;
    if (isWebPageUrl(val)) setUrlWarn("This is a webpage URL — use a direct media file link (ending in .jpg, .mp4, .mp3, etc.)");
    else if (val.length > 8 && !isMediaUrl(val)) setUrlWarn("Make sure this URL points directly to a media file.");
  };

  const startScan = async () => {
    setScanning(true);
    setLogs([]);
    setError("");

    const steps = SCAN_LOGS[selected] || SCAN_LOGS.image;
    let i = 0;
    const iv = setInterval(() => {
      if (i < steps.length) { setLogs(p => [...p, { text: steps[i], type:"" }]); i++; }
    }, 360);

    try {
      let result;
      if (type.isText) {
        // Text input: create blob and upload OR call /api/analyze-text
        const { analyzeText } = await import("../utils/api");
        result = await analyzeText(textInput);
      } else if (type.isUrl) {
        const { analyzeUrl } = await import("../utils/api");
        result = await analyzeUrl(urlInput.trim());
      } else {
        result = await analyzeFile(file);
      }
      clearInterval(iv);
      setLogs(p => [...p, { text: "✓ Analysis complete!", type:"ok" }]);
      setTimeout(() => onResult(result, selected), 700);
    } catch (err) {
      clearInterval(iv);
      setError(err.message || "Backend unreachable. Run: uvicorn main:app --reload");
      setScanning(false);
    }
  };

  const canScan = () => {
    if (type.isText) return textInput.trim().length >= 10;
    if (type.isUrl)  return urlInput.trim().length > 8 && !isWebPageUrl(urlInput);
    return !!file;
  };

  if (scanning) {
    return <ScanningScreen type={type} logs={logs}/>;
  }

  const c = type.accent;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom:"2rem" }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.65rem", color: c, letterSpacing:"0.15em", marginBottom:"0.6rem" }}>
          ◈ DEEPSHIELD FORENSICS v5.0
        </div>
        <h1 style={{
          fontFamily:"'Bebas Neue', sans-serif",
          fontSize:"clamp(2.5rem,6vw,4.5rem)", letterSpacing:"0.04em", lineHeight:0.92,
          marginBottom:"0.75rem",
        }}>
          DETECT<br/>
          <span style={{ color: c }}>DEEPFAKES</span><br/>
          <span style={{ color:"#2d4a66" }}>INSTANTLY.</span>
        </h1>
        <p style={{ color:"#6b8aaa", fontSize:"0.88rem", maxWidth:460, lineHeight:1.6 }}>
          5-mode AI forensics — Image, Video, Audio, Text, and URL scanning
          with ensemble models and explainable confidence scores.
        </p>

        {/* Stat pills */}
        <div style={{ display:"flex", gap:10, marginTop:"1rem", flexWrap:"wrap" }}>
          {[
            { n:"5",    l:"Media Types",  c:"#00aaff" },
            { n:"6+",   l:"Models Each",  c:"#aa55ff" },
            { n:"100%", l:"Explainable",  c:"#00e676" },
          ].map(s => (
            <div key={s.l} style={{
              padding:"5px 14px",
              background:`${s.c}14`,
              border:`1px solid ${s.c}40`,
              borderRadius:20,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.1rem", color:s.c }}>{s.n}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:"#6b8aaa", letterSpacing:"0.08em" }}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 1: Choose type ──────────────────────────────────── */}
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#4a6a8a", letterSpacing:"0.12em", marginBottom:"0.75rem" }}>
        STEP 01 — SELECT ANALYSIS MODE
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.65rem", marginBottom:"1.75rem" }}>
        {TYPES.map(t => <TypeCard key={t.id} t={t} selected={selected} onClick={selectType}/>)}
      </div>

      {/* ── Step 2: Input ─────────────────────────────────────────── */}
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#4a6a8a", letterSpacing:"0.12em", marginBottom:"0.75rem" }}>
        STEP 02 — PROVIDE {type.isText ? "TEXT" : type.isUrl ? "URL" : "FILE"}
      </div>

      {error && (
        <div style={{
          background:"rgba(255,45,85,0.08)", border:"1px solid rgba(255,45,85,0.3)",
          borderRadius:10, padding:"0.85rem 1.1rem", marginBottom:"1rem",
          fontFamily:"'DM Mono',monospace", fontSize:"0.75rem", color:"#ff2d55",
          display:"flex", gap:8, alignItems:"flex-start",
        }}>
          <span>⚠</span><span>{error}</span>
        </div>
      )}

      {/* TEXT input */}
      {type.isText && (
        <div style={{
          background:"#0d1625", border:`1.5px solid ${textInput.length >= 10 ? c+"50" : "rgba(255,255,255,0.07)"}`,
          borderRadius:14, padding:"1.25rem", marginBottom:"1rem", transition:"border-color 0.2s",
        }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#2d4a66", letterSpacing:"0.1em", marginBottom:"0.75rem" }}>
            PASTE TEXT TO ANALYZE — minimum 10 words recommended
          </div>
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="Paste any text here — article, email, essay, chatbot response…"
            rows={8}
            style={{
              width:"100%", background:"transparent", border:"none",
              color:"#edf4ff", fontFamily:"'DM Mono', monospace", fontSize:"0.82rem",
              resize:"vertical", outline:"none", lineHeight:1.7,
            }}
          />
          <div style={{
            display:"flex", justifyContent:"space-between", marginTop:"0.5rem",
            fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#2d4a66",
          }}>
            <span>{textInput.trim().split(/\s+/).filter(Boolean).length} words</span>
            <span style={{ color: textInput.length >= 50 ? c : "#4a6a8a" }}>
              {textInput.length >= 50 ? "✓ Ready" : "Add more text for accurate results"}
            </span>
          </div>
        </div>
      )}

      {/* URL input */}
      {type.isUrl && (
        <div style={{
          background:"#0d1625",
          border:`1.5px solid ${urlWarn ? "rgba(255,170,0,0.35)" : "rgba(255,255,255,0.07)"}`,
          borderRadius:14, padding:"1.25rem", marginBottom:"1rem", transition:"border-color 0.2s",
        }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#2d4a66", letterSpacing:"0.1em", marginBottom:"0.75rem" }}>
            DIRECT MEDIA URL — must end in .jpg / .png / .mp4 / .mp3 etc.
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <input
              value={urlInput}
              onChange={e => handleUrlChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && canScan() && startScan()}
              placeholder="https://example.com/photo.jpg"
              style={{
                flex:1, padding:"10px 14px",
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:8, color:"#edf4ff",
                fontFamily:"'DM Mono',monospace", fontSize:"0.82rem", outline:"none",
              }}
            />
          </div>
          {urlWarn && (
            <div style={{
              marginTop:"0.65rem", padding:"7px 10px",
              background:"rgba(255,170,0,0.08)", border:"1px solid rgba(255,170,0,0.25)",
              borderRadius:7, fontFamily:"'DM Mono',monospace",
              fontSize:"0.72rem", color:"#ffaa00", display:"flex", gap:6,
            }}>
              <span>⚠</span><span>{urlWarn}</span>
            </div>
          )}
          {/* Example links */}
          <div style={{ marginTop:"0.75rem", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:"#2d4a66" }}>TRY:</span>
            {[
              { l:"Sample IMG", u:"https://picsum.photos/400/300.jpg" },
              { l:"W3 Test",    u:"https://www.w3schools.com/css/img_5terre.jpg" },
            ].map(ex => (
              <button key={ex.u} onClick={() => { setUrlInput(ex.u); setUrlWarn(""); setError(""); }}
                style={{
                  fontFamily:"'DM Mono',monospace", fontSize:"0.65rem",
                  padding:"3px 10px", borderRadius:4,
                  border:`1px solid ${c}30`, background:`${c}0a`,
                  color: c, cursor:"pointer",
                }}>
                {ex.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File drop */}
      {!type.isText && !type.isUrl && (
        !file ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
            style={{
              border:`2px dashed ${dragging ? c : "rgba(255,255,255,0.09)"}`,
              borderRadius:16, padding:"2.5rem 1.5rem", textAlign:"center",
              cursor:"pointer", transition:"all 0.2s",
              background: dragging ? `${c}08` : "rgba(255,255,255,0.015)",
              marginBottom:"1rem", position:"relative",
            }}
          >
            {/* Corner brackets */}
            {[["0","0","10px 0 0"],["auto","0","10px 0 0"],["0","auto","0 0 10px"],["auto","auto","0 0 0 10px"]].map(([t,r,br],i) => (
              <div key={i} style={{
                position:"absolute",
                top:   i<2?8:"auto", bottom: i>=2?8:"auto",
                left:  i%2===0?8:"auto", right: i%2===1?8:"auto",
                width:20, height:20,
                border:`2px solid ${c}`,
                borderRadius: [
                  "10px 0 0 0","0 10px 0 0","0 0 0 10px","0 0 10px 0"
                ][i],
                borderRight:   i%2===1?"2px solid "+c:"none",
                borderLeft:    i%2===0?"2px solid "+c:"none",
                borderTop:     i<2?"2px solid "+c:"none",
                borderBottom:  i>=2?"2px solid "+c:"none",
              }}/>
            ))}

            <div style={{ fontSize:"3rem", marginBottom:"0.75rem", opacity:0.7 }}>{type.icon}</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.4rem", letterSpacing:"0.1em", color: c, marginBottom:"0.4rem" }}>
              DROP {type.label} HERE
            </div>
            <div style={{ color:"#6b8aaa", fontSize:"0.82rem", marginBottom:"1rem" }}>
              Click to browse or drag & drop your file
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
              {type.formats.map(f => (
                <span key={f} style={{
                  fontFamily:"'DM Mono',monospace", fontSize:"0.6rem",
                  padding:"3px 9px", borderRadius:4,
                  background:`${c}14`, border:`1px solid ${c}30`, color: c,
                }}>{f}</span>
              ))}
            </div>
            <input ref={inputRef} type="file" accept={type.accept} style={{ display:"none" }}
              onChange={e => handleFile(e.target.files[0])}/>
          </div>
        ) : (
          <div style={{
            display:"flex", alignItems:"center", gap:"1rem",
            background:`${c}0c`, border:`1px solid ${c}40`,
            borderRadius:12, padding:"0.9rem 1.2rem", marginBottom:"1rem",
          }}>
            <div style={{ fontSize:"1.8rem" }}>{type.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.8rem", color:"#edf4ff", marginBottom:2 }}>{file.name}</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.65rem", color:"#4a6a8a" }}>
                {formatBytes(file.size)} · {file.type || "unknown"}
              </div>
            </div>
            <button onClick={() => setFile(null)} style={{
              background:"rgba(255,45,85,0.12)", border:"1px solid rgba(255,45,85,0.3)",
              color:"#ff2d55", borderRadius:7, padding:"5px 12px",
              fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", cursor:"pointer",
            }}>✕ Remove</button>
          </div>
        )
      )}

      {/* ── Step 3: Analyze button ───────────────────────────────── */}
      {canScan() && (
        <>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#4a6a8a", letterSpacing:"0.12em", marginBottom:"0.75rem" }}>
            STEP 03 — RUN ANALYSIS
          </div>
          <button
            onClick={startScan}
            style={{
              width:"100%", padding:"15px", borderRadius:12, border:"none",
              fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.25rem",
              letterSpacing:"0.1em", cursor:"pointer", transition:"all 0.2s",
              background: c, color:"#000", fontWeight:900,
              boxShadow:`0 4px 24px ${c}50`,
            }}
            onMouseEnter={e => e.target.style.opacity = "0.88"}
            onMouseLeave={e => e.target.style.opacity = "1"}
          >
            ◈ ANALYZE {type.label} FOR DEEPFAKES
          </button>
        </>
      )}
    </div>
  );
}