import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { getStats } from "../utils/api";
import HeatmapViewer from "../components/HeatmapViewer";
import ExpertMode    from "../components/ExpertMode";

const TYPE_META = {
  image: { icon:"🖼", color:"img", label:"IMAGE" },
  video: { icon:"🎬", color:"vid", label:"VIDEO" },
  audio: { icon:"🎧", color:"aud", label:"AUDIO" },
};

function verdictColor(v) {
  return { deepfake:"fake", authentic:"real", suspicious:"sus" }[v] || "real";
}
function barColorVar(score) {
  if (score > 0.65) return "var(--fake)";
  if (score > 0.4)  return "var(--sus)";
  return "var(--real)";
}

function Counter({ to, suffix="" }) {
  const ref = useRef(null);
  useEffect(() => {
    const obj = { val:0 };
    gsap.to(obj, { val:to, duration:1.5, ease:"power2.out",
      onUpdate: () => { if (ref.current) ref.current.textContent = Math.round(obj.val) + suffix; }
    });
  }, [to]);
  return <span ref={ref}>0{suffix}</span>;
}

export default function ResultPage({ result, mediaType, uploadedFile, onNew, onHistory }) {
  const [stats, setStats] = useState(null);
  const pageRef = useRef(null);
  const meta = TYPE_META[mediaType] || TYPE_META.image;

  useEffect(() => { getStats().then(setStats).catch(()=>{}); }, []);

  useEffect(() => {
    if (!result) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults:{ ease:"power3.out" } })
        .from(".result-meta",  { opacity:0, y:-8, duration:0.3 })
        .from(".verdict",      { opacity:0, scale:0.93, duration:0.5, ease:"back.out(1.5)" }, "-=0.1")
        .from(".score-card",   { opacity:0, y:20, stagger:0.08, duration:0.4 }, "-=0.1")
        .from(".models-card",  { opacity:0, y:16, duration:0.4 }, "-=0.1")
        .from(".info-card",    { opacity:0, y:16, stagger:0.07, duration:0.4 }, "-=0.1");
      setTimeout(() => {
        document.querySelectorAll("[data-w]").forEach(el => {
          gsap.fromTo(el, { width:"0%" }, { width:el.dataset.w, duration:1.3, ease:"power2.out" });
        });
      }, 500);
    }, pageRef);
    return () => ctx.revert();
  }, [result]);

  if (!result) {
    return (
      <div className="empty">
        <span className="empty-icon">◈</span>
        <div className="empty-title">NO RESULTS YET</div>
        <div className="empty-sub" style={{ marginBottom:"1.5rem" }}>Analyze a file to see results.</div>
        <button className="ghost-btn" onClick={onNew}>+ Analyze a File</button>
      </div>
    );
  }

  const vc   = verdictColor(result.verdict);
  const conf = Math.round(result.confidence * 100);
  const auth = Math.round(result.authenticity_score * 100);
  const VICON= { deepfake:"⚠", authentic:"✓", suspicious:"◐" };

  return (
    <div ref={pageRef}>
      {/* Top */}
      <div className="result-top">
        <div>
          <div className="result-meta">
            <span>{meta.icon}</span>
            <span style={{ color:`var(--${meta.color})` }}>{meta.label} ANALYSIS</span>
            <span>·</span><span>{result.filename}</span>
            <span>·</span><span>{result.processing_time_seconds}s</span>
            {result.source && result.source !== "upload" && (
              <><span>·</span><span style={{ color:"var(--vid)" }}>via {result.source}</span></>
            )}
          </div>
          <div className={`verdict ${vc}`}>
            <span className="verdict-icon">{VICON[result.verdict]}</span>
            {result.verdict==="deepfake"   && "DEEPFAKE DETECTED"}
            {result.verdict==="authentic"  && "AUTHENTIC MEDIA"}
            {result.verdict==="suspicious" && "SUSPICIOUS — REVIEW"}
          </div>
        </div>
        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
          <button className="ghost-btn" onClick={onNew}>+ New Analysis</button>
          <button className="ghost-btn" onClick={onHistory}>↗ History</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", background:"var(--surface)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"var(--r-lg)", overflow:"hidden", marginBottom:"1.25rem" }}>
          {[
            { l:"Total Scans",    v:stats.total_analyses,    c:"var(--t1)" },
            { l:"Deepfakes",      v:stats.deepfakes_detected,c:"var(--fake)" },
            { l:"Authentic",      v:stats.authentic_media,   c:"var(--real)" },
            { l:"Detection Rate", v:stats.detection_rate+"%",c:"var(--sus)" },
          ].map((s,i)=>(
            <div key={s.l} style={{ padding:"1rem 1.25rem", borderRight:i<3?"1px solid rgba(255,255,255,0.06)":"none" }}>
              <div style={{ fontFamily:"var(--mono)", fontSize:"0.62rem", color:"var(--t3)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{s.l}</div>
              <div style={{ fontFamily:"var(--display)", fontSize:"1.8rem", lineHeight:1, color:s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Score cards */}
      <div className="score-grid">
        <div className={`score-card c-${vc}`}>
          <div className="sc-label">Confidence</div>
          <div className="sc-val" style={{ color:vc==="fake"?"var(--fake)":vc==="sus"?"var(--sus)":"var(--real)" }}>
            <Counter to={conf} suffix="%" />
          </div>
          <div className="sc-sub">Model certainty</div>
          <div className="sc-bar"><div className="sc-fill" data-w={`${conf}%`} style={{ width:"0%", background:vc==="fake"?"var(--fake)":vc==="sus"?"var(--sus)":"var(--real)" }} /></div>
        </div>
        <div className={`score-card c-${auth>50?"real":"fake"}`}>
          <div className="sc-label">Authenticity</div>
          <div className="sc-val" style={{ color:auth>50?"var(--real)":"var(--fake)" }}><Counter to={auth} suffix="%" /></div>
          <div className="sc-sub">Probability genuine</div>
          <div className="sc-bar"><div className="sc-fill" data-w={`${auth}%`} style={{ width:"0%", background:auth>50?"var(--real)":"var(--fake)" }} /></div>
        </div>
        <div className={`score-card c-${meta.color}`}>
          <div className="sc-label">Risk Level</div>
          <div className="sc-val" style={{ color:`var(--${meta.color})`, fontSize:"2rem", paddingTop:"0.4rem" }}>{result.risk_level.toUpperCase()}</div>
          <div className="sc-sub"><span className={`risk ${result.risk_level}`}>{result.risk_level}</span></div>
        </div>
      </div>

      {/* Heatmap */}
      <HeatmapViewer file={uploadedFile} result={result} />

      {/* Model scores */}
      <div className="models-card">
        <div className="mc-title">Detection Model Scores</div>
        {Object.entries(result.model_scores).map(([model, score]) => {
          const pct = Math.round(score*100);
          const bc  = barColorVar(score);
          return (
            <div className="mrow" key={model}>
              <span className="mrow-name">{model}</span>
              <div className="mrow-bar"><div className="mrow-fill" data-w={`${pct}%`} style={{ width:"0%", background:bc, boxShadow:`0 0 8px ${bc}` }} /></div>
              <span className="mrow-pct">{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Expert mode */}
      <ExpertMode result={result} mediaType={mediaType} />

      {/* Indicators + Details */}
      <div className="two-col">
        <div className="info-card">
          <div className="ic-title">Forensic Indicators</div>
          <ul className="ind-list">
            {result.indicators.map((ind,i) => {
              const good = ind.toLowerCase().includes("natural")||ind.toLowerCase().includes("no synthetic")||ind.toLowerCase().includes("authentic");
              return (
                <li key={i} className="ind-item">
                  <span className={`ind-dot ${good?"g":result.verdict==="suspicious"?"a":"r"}`} />{ind}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="info-card">
          <div className="ic-title">Technical Details</div>
          <div className="detail-cells">
            {Object.entries(result.analysis_details).filter(([,v])=>typeof v!=="boolean").slice(0,8).map(([k,v])=>(
              <div key={k} className="dc">
                <div className="dc-k">{k.replace(/_/g," ")}</div>
                <div className="dc-v">{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}