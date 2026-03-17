import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { getStats } from "../utils/api";

function colorFor(v) {
  return { deepfake: "red", authentic: "teal", suspicious: "amber" }[v] || "teal";
}
function barColor(score) {
  return score > 0.65 ? "red" : score > 0.4 ? "amber" : "teal";
}

// Animated number counter
function Counter({ to, suffix = "", decimals = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const obj = { val: 0 };
    gsap.to(obj, {
      val: to, duration: 1.4, ease: "power2.out",
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent =
            obj.val.toFixed(decimals) + suffix;
        }
      }
    });
  }, [to]);
  return <span ref={ref}>0{suffix}</span>;
}

export default function DashboardPage({ result, onNew }) {
  const [stats, setStats] = useState(null);
  const pageRef = useRef(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, [result]);

  // GSAP entrance
  useEffect(() => {
    if (!result) return;
    const ctx = gsap.context(() => {
      gsap.from(".db-meta",        { opacity:0, y:-10, duration:0.4 });
      gsap.from(".verdict-banner", { opacity:0, scale:0.95, duration:0.5, ease:"back.out(1.4)", delay:0.1 });
      gsap.from(".stats-strip .strip-cell", { opacity:0, y:20, stagger:0.08, duration:0.5, delay:0.25 });
      gsap.from(".card",           { opacity:0, y:24, stagger:0.06, duration:0.5, delay:0.4 });
      // Progress bars animate after cards appear
      setTimeout(() => {
        document.querySelectorAll(".prog-fill").forEach(el => {
          const target = el.dataset.width;
          gsap.fromTo(el, { width: "0%" }, { width: target, duration: 1.4, ease: "power2.out" });
        });
        document.querySelectorAll(".model-bar-fill").forEach(el => {
          const target = el.dataset.width;
          gsap.fromTo(el, { width: "0%" }, { width: target, duration: 1.2, ease: "power2.out" });
        });
      }, 600);
    }, pageRef);
    return () => ctx.revert();
  }, [result]);

  if (!result) {
    return (
      <div className="empty">
        <div className="empty-icon">◈</div>
        <h2>NO RESULTS YET</h2>
        <p style={{ marginBottom: "1.5rem" }}>Upload a file to run forensic analysis.</p>
        <button className="btn btn-primary" onClick={onNew}>+ Analyze File</button>
      </div>
    );
  }

  const c     = colorFor(result.verdict);
  const conf  = Math.round(result.confidence * 100);
  const auth  = Math.round(result.authenticity_score * 100);
  const ICON  = { deepfake: "⚠", authentic: "✓", suspicious: "◐" };

  return (
    <div ref={pageRef}>
      {/* Header */}
      <div className="db-header">
        <div>
          <div className="db-meta">
            <span>FILE:</span> <span>{result.filename}</span>
            <span style={{color:"var(--line-mid)"}}>|</span>
            <span>TYPE:</span> <span>{result.media_type.toUpperCase()}</span>
            <span style={{color:"var(--line-mid)"}}>|</span>
            <span>TIME:</span> <span>{result.processing_time_seconds}s</span>
          </div>
          <div className={`verdict-banner ${result.verdict}`}>
            <span className="verdict-icon-big">{ICON[result.verdict]}</span>
            {result.verdict === "deepfake"   && "⚡ DEEPFAKE DETECTED"}
            {result.verdict === "authentic"  && "✓ AUTHENTIC MEDIA"}
            {result.verdict === "suspicious" && "◐ SUSPICIOUS — MANUAL REVIEW"}
          </div>
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          <button className="btn btn-ghost" onClick={onNew}>+ New Analysis</button>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="stats-strip">
          {[
            { label: "Total Analyses", val: stats.total_analyses,    color: "white" },
            { label: "Deepfakes Found", val: stats.deepfakes_detected, color: "red"   },
            { label: "Authentic Media", val: stats.authentic_media,   color: "teal"  },
            { label: "Detection Rate",  val: stats.detection_rate + "%", color: "amber" },
          ].map(s => (
            <div key={s.label} className="strip-cell">
              <div className="strip-label">{s.label}</div>
              <div className={`strip-val ${s.color}`}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Confidence + Authenticity */}
      <div className="g2">
        <div className="card">
          <div className="card-head">
            <div className="card-label">Confidence Score</div>
            <span className={`risk ${result.risk_level}`}>{result.risk_level}</span>
          </div>
          <div className={`big-num`} style={{ color: `var(--${c})` }}>
            <Counter to={conf} suffix="%" />
          </div>
          <div className="big-sub">Model certainty in verdict</div>
          <div className="prog-track">
            <div className={`prog-fill ${c}`} data-width={`${conf}%`} style={{ width: "0%" }} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-label">Authenticity Score</div>
          </div>
          <div className="big-num" style={{ color: auth > 50 ? "var(--teal)" : "var(--red)" }}>
            <Counter to={auth} suffix="%" />
          </div>
          <div className="big-sub">Probability media is genuine</div>
          <div className="prog-track">
            <div
              className={`prog-fill ${auth > 50 ? "teal" : "red"}`}
              data-width={`${auth}%`}
              style={{ width: "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Model scores */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-head">
          <div className="card-label">Model Ensemble Breakdown</div>
        </div>
        {Object.entries(result.model_scores).map(([model, score]) => {
          const pct = Math.round(score * 100);
          const bc = barColor(score);
          return (
            <div className="model-row" key={model}>
              <span className="model-name">{model}</span>
              <div className="model-bar">
                <div
                  className="model-bar-fill"
                  data-width={`${pct}%`}
                  style={{
                    width: "0%",
                    background: `var(--${bc})`,
                    boxShadow: `0 0 8px var(--${bc})`
                  }}
                />
              </div>
              <span className="model-pct">{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Indicators + Details */}
      <div className="g2">
        <div className="card">
          <div className="card-head">
            <div className="card-label">Forensic Indicators</div>
          </div>
          <ul className="ind-list">
            {result.indicators.map((ind, i) => {
              const good = ind.toLowerCase().includes("natural") || ind.toLowerCase().includes("consistent") || ind.toLowerCase().includes("real");
              const dc = good ? "teal" : result.verdict === "suspicious" ? "amber" : "red";
              return (
                <li key={i} className="ind-item">
                  <span className={`ind-dot ${dc}`} />
                  {ind}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-label">Analysis Details</div>
          </div>
          <div className="detail-grid">
            {Object.entries(result.analysis_details)
              .filter(([, v]) => typeof v !== "boolean")
              .slice(0, 8)
              .map(([k, v]) => (
                <div key={k} className="detail-cell">
                  <div className="dc-key">{k.replace(/_/g, " ")}</div>
                  <div className="dc-val">{String(v)}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
