import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { getStats } from "../utils/api";

const TYPE_META = {
  image: { icon:"🖼",  color:"#00aaff", label:"IMAGE"  },
  video: { icon:"🎬",  color:"#aa55ff", label:"VIDEO"  },
  audio: { icon:"🎧",  color:"#ff6b35", label:"AUDIO"  },
  text:  { icon:"📝",  color:"#00e676", label:"TEXT"   },
  url:   { icon:"🔗",  color:"#ffcc00", label:"URL"    },
};

const VERDICT_CONFIG = {
  deepfake:   { color:"#ff2d55", icon:"⚠", bg:"rgba(255,45,85,0.08)",   border:"rgba(255,45,85,0.35)",   label:"DEEPFAKE DETECTED" },
  authentic:  { color:"#00e676", icon:"✓", bg:"rgba(0,230,118,0.07)",   border:"rgba(0,230,118,0.30)",   label:"AUTHENTIC MEDIA"   },
  suspicious: { color:"#ffaa00", icon:"◐", bg:"rgba(255,170,0,0.07)",   border:"rgba(255,170,0,0.30)",   label:"SUSPICIOUS — REVIEW" },
};

function AnimCounter({ to, suffix="", duration=1.5 }) {
  const ref = useRef(null);
  useEffect(() => {
    const obj = { val:0 };
    gsap.to(obj, {
      val: to, duration, ease:"power2.out",
      onUpdate: () => { if (ref.current) ref.current.textContent = Math.round(obj.val) + suffix; }
    });
  }, [to]);
  return <span ref={ref}>0{suffix}</span>;
}

function ProgressBar({ value, color, delay=0 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { width:"0%" }, { width:`${value}%`, duration:1.4, ease:"power2.out", delay });
  }, [value, delay]);
  return (
    <div style={{ height:6, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
      <div ref={ref} style={{ height:"100%", background:color, borderRadius:3, boxShadow:`0 0 8px ${color}` }}/>
    </div>
  );
}

export default function ResultPage({ result, mediaType, uploadedFile, onNew, onHistory }) {
  const [stats, setStats] = useState(null);
  const pageRef = useRef(null);
  const meta    = TYPE_META[mediaType] || TYPE_META.image;
  const vc      = VERDICT_CONFIG[result?.verdict] || VERDICT_CONFIG.authentic;

  useEffect(() => { getStats().then(setStats).catch(()=>{}); }, []);

  useEffect(() => {
    if (!result || !pageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults:{ ease:"power3.out" } })
        .from(".r-meta",    { opacity:0, y:-10, duration:0.3 })
        .from(".r-verdict", { opacity:0, scale:0.94, duration:0.5, ease:"back.out(1.5)" }, "-=0.1")
        .from(".r-stat",    { opacity:0, y:16, stagger:0.07, duration:0.4 }, "-=0.1")
        .from(".r-card",    { opacity:0, y:20, stagger:0.06, duration:0.45 }, "-=0.15");
    }, pageRef);
    return () => ctx.revert();
  }, [result]);

  if (!result) {
    return (
      <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
        <div style={{ fontSize:"3rem", marginBottom:"1rem", opacity:0.2 }}>◈</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.5rem", color:"#2d4a66", marginBottom:"0.75rem" }}>
          NO RESULTS YET
        </div>
        <button onClick={onNew} style={{
          padding:"10px 24px", borderRadius:8, border:"1px solid rgba(0,170,255,0.3)",
          background:"rgba(0,170,255,0.08)", color:"#00aaff",
          fontFamily:"'Bebas Neue',sans-serif", fontSize:"1rem", letterSpacing:"0.08em", cursor:"pointer",
        }}>+ Analyze a File</button>
      </div>
    );
  }

  const conf = Math.round(result.confidence * 100);
  const auth = Math.round(result.authenticity_score * 100);

  return (
    <div ref={pageRef}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <div className="r-meta" style={{
            display:"flex", gap:8, alignItems:"center", flexWrap:"wrap",
            fontFamily:"'DM Mono',monospace", fontSize:"0.65rem", color:"#4a6a8a",
            marginBottom:"0.5rem",
          }}>
            <span style={{ color: meta.color }}>{meta.icon} {meta.label}</span>
            <span>·</span><span>{result.filename}</span>
            <span>·</span><span>{result.processing_time_seconds}s</span>
            {result.source && result.source !== "upload" && (
              <><span>·</span><span style={{ color: meta.color }}>via {result.source}</span></>
            )}
          </div>
          <div className="r-verdict" style={{
            display:"flex", alignItems:"center", gap:12,
            background: vc.bg, border:`1px solid ${vc.border}`,
            borderRadius:12, padding:"0.75rem 1.25rem",
          }}>
            <span style={{ fontSize:"1.5rem" }}>{vc.icon}</span>
            <span style={{
              fontFamily:"'Bebas Neue',sans-serif",
              fontSize:"clamp(1.2rem,3vw,1.8rem)", letterSpacing:"0.1em", color: vc.color,
            }}>{vc.label}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onNew} style={{
            padding:"9px 18px", borderRadius:8,
            border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)",
            color:"#edf4ff", fontFamily:"'DM Mono',monospace", fontSize:"0.72rem", cursor:"pointer",
          }}>+ New Analysis</button>
          <button onClick={onHistory} style={{
            padding:"9px 18px", borderRadius:8,
            border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)",
            color:"#edf4ff", fontFamily:"'DM Mono',monospace", fontSize:"0.72rem", cursor:"pointer",
          }}>↗ History</button>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────── */}
      {stats && (
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(4,1fr)",
          background:"#0d1625", border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:14, overflow:"hidden", marginBottom:"1.25rem",
        }}>
          {[
            { l:"Total Scans",    v:stats.total_analyses,     c:"#edf4ff" },
            { l:"Deepfakes",      v:stats.deepfakes_detected, c:"#ff2d55" },
            { l:"Authentic",      v:stats.authentic_media,    c:"#00e676" },
            { l:"Detection Rate", v:stats.detection_rate+"%", c:"#ffaa00" },
          ].map((s,i) => (
            <div key={s.l} className="r-stat" style={{
              padding:"0.9rem 1.1rem",
              borderRight: i<3 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.58rem", color:"#2d4a66", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{s.l}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.7rem", lineHeight:1, color:s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Score cards ─────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.9rem", marginBottom:"1.25rem" }}>
        {/* Confidence */}
        <div className="r-card" style={{
          background:"#0d1625", border:`1px solid ${vc.color}30`,
          borderRadius:14, padding:"1.1rem",
        }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:"#2d4a66", letterSpacing:"0.1em", marginBottom:"0.5rem" }}>CONFIDENCE</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"2.8rem", lineHeight:1, color: vc.color, marginBottom:"0.3rem" }}>
            <AnimCounter to={conf} suffix="%" />
          </div>
          <div style={{ fontSize:"0.7rem", color:"#4a6a8a", marginBottom:"0.65rem" }}>Model certainty in verdict</div>
          <ProgressBar value={conf} color={vc.color} delay={0.5}/>
        </div>

        {/* Authenticity */}
        <div className="r-card" style={{
          background:"#0d1625", border:`1px solid ${auth>50?"#00e67630":"#ff2d5530"}`,
          borderRadius:14, padding:"1.1rem",
        }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:"#2d4a66", letterSpacing:"0.1em", marginBottom:"0.5rem" }}>AUTHENTICITY</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"2.8rem", lineHeight:1, color:auth>50?"#00e676":"#ff2d55", marginBottom:"0.3rem" }}>
            <AnimCounter to={auth} suffix="%" />
          </div>
          <div style={{ fontSize:"0.7rem", color:"#4a6a8a", marginBottom:"0.65rem" }}>Probability media is genuine</div>
          <ProgressBar value={auth} color={auth>50?"#00e676":"#ff2d55"} delay={0.6}/>
        </div>

        {/* Risk level */}
        <div className="r-card" style={{
          background:"#0d1625", border:`1px solid ${meta.color}30`,
          borderRadius:14, padding:"1.1rem",
        }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:"#2d4a66", letterSpacing:"0.1em", marginBottom:"0.5rem" }}>RISK LEVEL</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"2.8rem", lineHeight:1, color:meta.color, marginBottom:"0.3rem" }}>
            {result.risk_level.toUpperCase()}
          </div>
          <div style={{ fontSize:"0.7rem", color:"#4a6a8a", marginBottom:"0.65rem" }}>Threat assessment score</div>
          <div style={{ display:"flex", gap:5 }}>
            {["low","medium","high","critical"].map(l => (
              <div key={l} style={{
                flex:1, height:6, borderRadius:3,
                background: ["low","medium","high","critical"].indexOf(l) <=
                            ["low","medium","high","critical"].indexOf(result.risk_level)
                  ? meta.color : "rgba(255,255,255,0.06)",
                transition:"background 0.3s",
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* ── Model ensemble breakdown ─────────────────────────────── */}
      <div className="r-card" style={{
        background:"#0d1625", border:"1px solid rgba(255,255,255,0.06)",
        borderRadius:14, padding:"1.25rem", marginBottom:"1.25rem",
      }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#4a6a8a", letterSpacing:"0.1em", marginBottom:"1rem" }}>
          DETECTION MODEL SCORES
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
          {Object.entries(result.model_scores).map(([model, score], i) => {
            const pct   = Math.round(score * 100);
            const barC  = pct > 65 ? "#ff2d55" : pct > 40 ? "#ffaa00" : "#00e676";
            return (
              <div key={model} style={{ display:"grid", gridTemplateColumns:"200px 1fr 44px", alignItems:"center", gap:12 }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", color:"#6b8aaa", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {model}
                </span>
                <ProgressBar value={pct} color={barC} delay={0.4 + i*0.05}/>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.7rem", color:barC, textAlign:"right" }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Indicators + Details ─────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        {/* Indicators */}
        <div className="r-card" style={{
          background:"#0d1625", border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:14, padding:"1.25rem",
        }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#4a6a8a", letterSpacing:"0.1em", marginBottom:"0.85rem" }}>
            FORENSIC INDICATORS
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
            {result.indicators.map((ind, i) => {
              const isGood = /natural|authentic|no synthetic|consistent|no ai/i.test(ind);
              const dotC   = isGood ? "#00e676" : result.verdict === "suspicious" ? "#ffaa00" : "#ff2d55";
              return (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <div style={{
                    width:6, height:6, borderRadius:"50%", background:dotC,
                    flexShrink:0, marginTop:5, boxShadow:`0 0 6px ${dotC}`,
                  }}/>
                  <span style={{ fontSize:"0.78rem", color:"#6b8aaa", lineHeight:1.5 }}>{ind}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technical details */}
        <div className="r-card" style={{
          background:"#0d1625", border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:14, padding:"1.25rem",
        }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#4a6a8a", letterSpacing:"0.1em", marginBottom:"0.85rem" }}>
            TECHNICAL DETAILS
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
            {Object.entries(result.analysis_details)
              .filter(([,v]) => typeof v !== "boolean" && v !== "N/A" && v !== null)
              .slice(0, 8)
              .map(([k, v]) => (
                <div key={k} style={{
                  background:"rgba(255,255,255,0.025)", borderRadius:7,
                  padding:"0.5rem 0.7rem",
                }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.58rem", color:"#2d4a66", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>
                    {k.replace(/_/g," ")}
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.72rem", color:"#edf4ff" }}>
                    {String(v)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}