import { useState, useEffect } from "react";
import { gsap } from "gsap";
import { getAnalyses, deleteAnalysis } from "../utils/api";

function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_CONFIG = {
  image: { icon:"🖼",  color:"#00aaff", label:"IMAGE" },
  video: { icon:"🎬",  color:"#aa55ff", label:"VIDEO" },
  audio: { icon:"🎧",  color:"#ff6b35", label:"AUDIO" },
  text:  { icon:"📝",  color:"#00e676", label:"TEXT"  },
  url:   { icon:"🔗",  color:"#ffcc00", label:"URL"   },
};

const VERDICT_COLOR = {
  deepfake:   "#ff2d55",
  authentic:  "#00e676",
  suspicious: "#ffaa00",
};

const RISK_COLOR = {
  low:      "#00e676",
  medium:   "#ffaa00",
  high:     "#ff6b35",
  critical: "#ff2d55",
};

export default function HistoryPage({ onView, onAnalyze }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  const load = () => {
    setLoading(true);
    getAnalyses(200)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData({ results:[], total:0 }); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading && data?.results?.length) {
      gsap.from(".hist-row", { opacity:0, x:-12, stagger:0.03, duration:0.3, delay:0.1, ease:"power2.out" });
    }
  }, [loading, data, filter]);

  const doDelete = async (e, id) => {
    e.stopPropagation();
    const row = e.currentTarget.closest(".hist-row");
    gsap.to(row, { opacity:0, x:20, duration:0.2, onComplete:() => deleteAnalysis(id).then(load) });
  };

  const filtered = data?.results?.filter(r =>
    filter === "all" || r.media_type === filter || r.verdict === filter
  ) || [];

  const counts = {
    all:        data?.results?.length || 0,
    image:      data?.results?.filter(r => r.media_type === "image").length || 0,
    video:      data?.results?.filter(r => r.media_type === "video").length || 0,
    audio:      data?.results?.filter(r => r.media_type === "audio").length || 0,
    text:       data?.results?.filter(r => r.media_type === "text").length  || 0,
    deepfake:   data?.results?.filter(r => r.verdict === "deepfake").length  || 0,
    authentic:  data?.results?.filter(r => r.verdict === "authentic").length || 0,
  };

  if (loading) {
    return (
      <div style={{ textAlign:"center", padding:"3rem" }}>
        <div style={{
          width:48, height:48, margin:"0 auto 1rem",
          border:"1px solid rgba(0,170,255,0.2)",
          borderTop:"2px solid #00aaff",
          borderRadius:"50%", animation:"spin 0.9s linear infinite",
        }}/>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.75rem", color:"#4a6a8a" }}>
          Fetching from MongoDB…
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.5rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#4a6a8a", letterSpacing:"0.12em", marginBottom:"0.4rem" }}>
            ◈ ANALYSIS HISTORY
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(2rem,5vw,3.5rem)", letterSpacing:"0.05em", lineHeight:0.95, marginBottom:"0.3rem" }}>
            HISTORY
          </h1>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", color:"#4a6a8a" }}>
            {data?.total || 0} total records · MongoDB deepshield.analyses
          </div>
        </div>
        <button onClick={load} style={{
          padding:"9px 18px", borderRadius:8,
          border:"1px solid rgba(255,255,255,0.08)",
          background:"rgba(255,255,255,0.03)",
          color:"#edf4ff", fontFamily:"'DM Mono',monospace",
          fontSize:"0.72rem", cursor:"pointer",
        }}>↻ Refresh</button>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:"1.25rem" }}>
        {[
          { id:"all",       label:`All (${counts.all})`,             c:"#edf4ff" },
          { id:"image",     label:`🖼 Images (${counts.image})`,     c:"#00aaff" },
          { id:"video",     label:`🎬 Videos (${counts.video})`,     c:"#aa55ff" },
          { id:"audio",     label:`🎧 Audio (${counts.audio})`,      c:"#ff6b35" },
          { id:"text",      label:`📝 Text (${counts.text})`,        c:"#00e676" },
          { id:"deepfake",  label:`⚠ Deepfakes (${counts.deepfake})`, c:"#ff2d55" },
          { id:"authentic", label:`✓ Authentic (${counts.authentic})`, c:"#00e676" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding:"5px 13px", borderRadius:20, cursor:"pointer",
            fontFamily:"'DM Mono',monospace", fontSize:"0.65rem",
            transition:"all 0.15s",
            background: filter===f.id ? `${f.c}20` : "rgba(255,255,255,0.03)",
            border: `1px solid ${filter===f.id ? f.c+"50" : "rgba(255,255,255,0.07)"}`,
            color: filter===f.id ? f.c : "#4a6a8a",
          }}>{f.label}</button>
        ))}
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      {!filtered.length ? (
        <div style={{ textAlign:"center", padding:"3rem" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:"0.75rem", opacity:0.2 }}>📂</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.2rem", color:"#2d4a66", marginBottom:"0.5rem" }}>NO RECORDS</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.72rem", color:"#4a6a8a", marginBottom:"1.5rem" }}>
            {filter === "all" ? "No analyses yet." : `No ${filter} analyses yet.`}
          </div>
          <button onClick={onAnalyze} style={{
            padding:"9px 22px", borderRadius:8,
            border:"1px solid rgba(0,170,255,0.3)", background:"rgba(0,170,255,0.08)",
            color:"#00aaff", fontFamily:"'Bebas Neue',sans-serif",
            fontSize:"1rem", letterSpacing:"0.08em", cursor:"pointer",
          }}>+ Analyze a File</button>
        </div>
      ) : (
        <div style={{ overflow:"auto", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                {["File","Type","Verdict","Confidence","Risk","Time","Scanned",""].map(h => (
                  <th key={h} style={{
                    padding:"10px 14px", textAlign:"left",
                    fontFamily:"'DM Mono',monospace", fontSize:"0.6rem",
                    color:"#2d4a66", letterSpacing:"0.1em", fontWeight:400,
                    whiteSpace:"nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const tc = TYPE_CONFIG[r.media_type] || TYPE_CONFIG.image;
                const vc = VERDICT_COLOR[r.verdict] || "#edf4ff";
                const rc = RISK_COLOR[r.risk_level] || "#edf4ff";
                return (
                  <tr
                    key={r.id}
                    className="hist-row"
                    onClick={() => onView(r, r.media_type)}
                    style={{
                      borderBottom:"1px solid rgba(255,255,255,0.04)",
                      cursor:"pointer", transition:"background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.73rem", color:"#edf4ff", marginBottom:2, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {r.filename}
                      </div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:"#2d4a66" }}>
                        {r.file_size > 1048576 ? (r.file_size/1048576).toFixed(1)+" MB" : (r.file_size/1024).toFixed(0)+" KB"}
                      </div>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{
                        fontFamily:"'DM Mono',monospace", fontSize:"0.65rem",
                        background:`${tc.color}18`, border:`1px solid ${tc.color}35`,
                        color:tc.color, padding:"3px 9px", borderRadius:4,
                      }}>{tc.icon} {tc.label}</span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{
                        fontFamily:"'DM Mono',monospace", fontSize:"0.65rem",
                        background:`${vc}14`, border:`1px solid ${vc}35`,
                        color:vc, padding:"3px 9px", borderRadius:4,
                      }}>{r.verdict}</span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.72rem", color: r.confidence>0.8?"#00e676":"#edf4ff" }}>
                        {Math.round(r.confidence*100)}%
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{
                        fontFamily:"'DM Mono',monospace", fontSize:"0.62rem",
                        color:rc, textTransform:"uppercase",
                      }}>{r.risk_level}</span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", color:"#4a6a8a" }}>
                        {r.processing_time_seconds}s
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.65rem", color:"#4a6a8a" }}>
                        {timeAgo(r.created_at)}
                      </span>
                    </td>
                    <td style={{ padding:"10px 10px 10px 0" }}>
                      <button onClick={e => doDelete(e, r.id)} style={{
                        padding:"4px 10px", borderRadius:5,
                        border:"1px solid rgba(255,45,85,0.2)",
                        background:"rgba(255,45,85,0.07)",
                        color:"#ff2d55", cursor:"pointer",
                        fontFamily:"'DM Mono',monospace", fontSize:"0.65rem",
                      }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}