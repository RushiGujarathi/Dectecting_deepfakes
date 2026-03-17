import { useState } from "react";
import { analyzeUrl } from "../utils/api";

const EXAMPLES = [
  {
    label: "AI Face (JPG)",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Gatto_europeo4.jpg/320px-Gatto_europeo4.jpg",
    icon: "🖼",
    type: "image"
  },
  {
    label: "Sample PNG",
    url: "https://www.w3schools.com/css/img_5terre.jpg",
    icon: "📷",
    type: "image"
  },
  {
    label: "Test Image",
    url: "https://picsum.photos/400/300.jpg",
    icon: "🎨",
    type: "image"
  },
];

const TIPS = [
  { icon: "✅", text: "Direct image: https://example.com/photo.jpg" },
  { icon: "✅", text: "Direct image: https://example.com/image.png" },
  { icon: "✅", text: "Direct audio: https://example.com/audio.mp3" },
  { icon: "✅", text: "Direct video: https://example.com/video.mp4" },
  { icon: "❌", text: "YouTube/Vimeo page URLs (not direct media)" },
  { icon: "❌", text: "Instagram/Twitter/Facebook URLs (HTML pages)" },
  { icon: "❌", text: "Google Drive links (requires login)" },
];

function isLikelyMediaUrl(url) {
  const mediaExts = ['.jpg','.jpeg','.png','.webp','.gif','.bmp','.mp4','.avi','.mov','.webm','.mp3','.wav','.ogg','.m4a','.flac'];
  const lower = url.toLowerCase();
  return mediaExts.some(ext => lower.includes(ext));
}

function isWebPageUrl(url) {
  const webDomains = ['youtube.com','youtu.be','vimeo.com','instagram.com','twitter.com','x.com','facebook.com','tiktok.com','reddit.com','linkedin.com','medium.com','wikipedia.org'];
  try {
    const host = new URL(url).hostname.replace('www.','');
    return webDomains.some(d => host.includes(d));
  } catch { return false; }
}

export default function UrlScannerPage() {
  const [url,      setUrl]      = useState("");
  const [scanning, setScanning] = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState("");
  const [logs,     setLogs]     = useState([]);
  const [urlWarn,  setUrlWarn]  = useState("");

  const addLog = (text, type="") => setLogs(p => [...p, { text, type }]);
  const delay  = ms => new Promise(r => setTimeout(r, ms));

  const handleUrlChange = (val) => {
    setUrl(val);
    setUrlWarn("");
    setError("");
    if (!val) return;
    if (isWebPageUrl(val)) {
      setUrlWarn("This looks like a webpage URL. URL scanner needs a DIRECT link to a media file (ending in .jpg, .png, .mp4, .mp3 etc.)");
    } else if (val.length > 10 && !isLikelyMediaUrl(val)) {
      setUrlWarn("Tip: Make sure this URL points directly to a media file, not a webpage.");
    }
  };

  const scan = async () => {
    if (!url.trim()) return;
    if (isWebPageUrl(url)) {
      setError("This is a webpage URL, not a direct media link. See the guide below for how to get a direct URL.");
      return;
    }
    setScanning(true);
    setResult(null);
    setError("");
    setLogs([]);

    addLog("Validating URL format...");    await delay(300);
    addLog("Fetching media from URL...");  await delay(500);
    addLog("Detecting media type...");     await delay(300);
    addLog("Running forensic analysis..."); await delay(500);
    addLog("Computing ensemble scores..."); await delay(400);

    try {
      const res = await analyzeUrl(url);
      addLog("✓ Analysis complete!", "ok");
      setResult(res);
    } catch(err) {
      const msg = err.message || "Failed";
      addLog("✗ " + msg, "err");
      if (msg.includes("Not media") || msg.includes("text/html")) {
        setError("This URL returned an HTML page, not a media file. You need a direct link to the image/video/audio file itself.");
      } else if (msg.includes("Fetch failed") || msg.includes("CORS")) {
        setError("Could not fetch this URL. The server may be blocking external requests. Try a different direct media URL.");
      } else {
        setError(msg);
      }
    } finally {
      setScanning(false);
    }
  };

  const vc = result
    ? ({ deepfake:"var(--fake)", authentic:"var(--real)", suspicious:"var(--sus)" }[result.verdict])
    : "";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:"1.75rem" }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", color:"#00e676", letterSpacing:"0.15em", marginBottom:"0.5rem" }}>
          ◈ URL SCANNER
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(2rem,5vw,4rem)", letterSpacing:"0.04em", lineHeight:0.95, marginBottom:"0.75rem" }}>
          SCAN ANY<br/><span style={{ color:"#00e676" }}>DIRECT URL</span>
        </h1>
        <p style={{ color:"#6b8aaa", fontSize:"0.88rem", fontWeight:300 }}>
          Paste a <strong style={{ color:"#edf4ff" }}>direct link</strong> to an image, video, or audio file. Not a webpage — a direct media file URL.
        </p>
      </div>

      {/* Input */}
      <div style={{ background:"#0d1625", border:`1px solid ${urlWarn?"rgba(255,170,0,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:"20px", padding:"1.5rem", marginBottom:"1rem", transition:"border-color 0.2s" }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.65rem", color:"#2d4a66", letterSpacing:"0.1em", marginBottom:"0.75rem" }}>
          PASTE DIRECT MEDIA URL
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          <input
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
            onKeyDown={e => e.key==="Enter" && scan()}
            placeholder="https://example.com/image.jpg"
            style={{ flex:1, padding:"12px 16px", background:"#121e30", border:`1px solid ${urlWarn?"rgba(255,170,0,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:"8px", color:"#edf4ff", fontFamily:"'DM Mono',monospace", fontSize:"0.83rem", outline:"none", transition:"border-color 0.2s" }}
            onFocus={e => e.target.style.borderColor="rgba(0,230,118,0.4)"}
            onBlur={e => e.target.style.borderColor = urlWarn ? "rgba(255,170,0,0.3)" : "rgba(255,255,255,0.08)"}
          />
          <button
            onClick={scan}
            disabled={!url.trim() || scanning}
            style={{ padding:"12px 22px", borderRadius:"8px", border:"none", fontFamily:"'Bebas Neue',sans-serif", fontSize:"1rem", letterSpacing:"0.08em", background:"#00e676", color:"#000", cursor:"pointer", opacity:(!url.trim()||scanning)?0.5:1, fontWeight:700, whiteSpace:"nowrap", transition:"all 0.2s" }}
          >
            {scanning ? "SCANNING..." : "▶ SCAN URL"}
          </button>
        </div>

        {/* Warning */}
        {urlWarn && (
          <div style={{ marginTop:"0.75rem", display:"flex", gap:8, padding:"8px 12px", background:"rgba(255,170,0,0.08)", border:"1px solid rgba(255,170,0,0.25)", borderRadius:"8px", fontSize:"0.78rem", color:"#ffaa00", fontFamily:"'DM Mono',monospace" }}>
            ⚠ {urlWarn}
          </div>
        )}

        {/* Example links */}
        <div style={{ marginTop:"0.75rem", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#2d4a66" }}>TRY THESE:</span>
          {EXAMPLES.map(ex => (
            <button key={ex.url} onClick={() => { setUrl(ex.url); setUrlWarn(""); setError(""); }}
              style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", padding:"3px 10px", borderRadius:4, border:"1px solid rgba(0,230,118,0.2)", background:"rgba(0,230,118,0.06)", color:"#00e676", cursor:"pointer" }}>
              {ex.icon} {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:"rgba(255,45,85,0.08)", border:"1px solid rgba(255,45,85,0.3)", borderRadius:"12px", padding:"1rem 1.25rem", marginBottom:"1rem" }}>
          <div style={{ color:"#ff2d55", fontFamily:"'DM Mono',monospace", fontSize:"0.78rem", marginBottom:"0.5rem" }}>
            ⚠ {error}
          </div>
          {(error.includes("webpage") || error.includes("HTML") || error.includes("Not media")) && (
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.72rem", color:"#6b8aaa", lineHeight:1.6 }}>
              <strong style={{ color:"#edf4ff" }}>How to get a direct media URL:</strong><br/>
              • Right-click an image on a webpage → "Open image in new tab" → copy that URL<br/>
              • On Google Images → click image → right-click the image itself → "Copy image address"<br/>
              • On Wikipedia → click an image → right-click → "Copy image link"
            </div>
          )}
        </div>
      )}

      {/* Terminal */}
      {logs.length > 0 && (
        <div className="terminal" style={{ marginBottom:"1.25rem" }}>
          <div className="term-bar">
            <div className="tdot r"/><div className="tdot y"/><div className="tdot g"/>
            <span className="term-title">deepshield.url.scanner</span>
          </div>
          <div className="term-body">
            {logs.map((l,i) => (
              <div key={i} className={`tline ${l.type}`}>
                <span className="prompt" style={{ color:"#00e676" }}>$</span>
                <span className="text">{l.text}</span>
              </div>
            ))}
            {scanning && (
              <div className="tline">
                <span className="prompt" style={{ color:"#00e676" }}>$</span>
                <span className="tcursor" style={{ background:"#00e676" }}/>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ background:"#0d1625", border:`1px solid ${vc}40`, borderRadius:"20px", padding:"1.5rem", marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"1.25rem" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.5rem", letterSpacing:"0.1em", color:vc }}>
              {result.verdict==="deepfake" ? "⚠ DEEPFAKE DETECTED" : result.verdict==="authentic" ? "✓ AUTHENTIC" : "◐ SUSPICIOUS"}
            </div>
            <span className={`risk ${result.risk_level}`}>{result.risk_level}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1rem", marginBottom:"1rem" }}>
            {[
              { l:"Confidence",   v:Math.round(result.confidence*100)+"%",           c:vc },
              { l:"Authenticity", v:Math.round(result.authenticity_score*100)+"%",   c:"#edf4ff" },
              { l:"Media Type",   v:result.media_type?.toUpperCase(),                c:"#00aaff" },
            ].map(s => (
              <div key={s.l} style={{ background:"#121e30", borderRadius:"8px", padding:"0.75rem 1rem", border:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#2d4a66", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{s.l}</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.5rem", color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          {result.indicators?.map((ind,i) => (
            <div key={i} style={{ display:"flex", gap:8, padding:"6px 0", fontSize:"0.82rem", color:"#6b8aaa", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color:vc }}>›</span> {ind}
            </div>
          ))}
        </div>
      )}

      {/* Guide */}
      <div style={{ background:"#0d1625", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"16px", padding:"1.5rem" }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.65rem", color:"#2d4a66", letterSpacing:"0.1em", marginBottom:"1rem" }}>HOW TO GET A DIRECT MEDIA URL</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
          {TIPS.map((t,i) => (
            <div key={i} style={{ display:"flex", gap:8, fontSize:"0.78rem", color: t.icon==="✅" ? "#6b8aaa" : "#3d5166", padding:"4px 0" }}>
              <span>{t.icon}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:"1rem", padding:"0.75rem 1rem", background:"rgba(0,230,118,0.06)", border:"1px solid rgba(0,230,118,0.15)", borderRadius:"8px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.65rem", color:"#00e676", marginBottom:"0.4rem" }}>💡 QUICK TIP</div>
          <div style={{ fontSize:"0.78rem", color:"#6b8aaa", lineHeight:1.6 }}>
            On any webpage: right-click an image → <strong style={{ color:"#edf4ff" }}>"Open image in new tab"</strong> → copy the URL from that tab. That URL will end in .jpg, .png etc. and will work here.
          </div>
        </div>
      </div>
    </div>
  );
}