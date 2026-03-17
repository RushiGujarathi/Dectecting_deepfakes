import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { getStats } from "../utils/api";

const VERDICT_C = {
  deepfake:   "#ff2d55",
  authentic:  "#00e676",
  suspicious: "#ffaa00",
};

function AnimCounter({ to, suffix="", decimals=0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const obj = { val:0 };
    gsap.to(obj, {
      val:to, duration:1.4, ease:"power2.out",
      onUpdate:()=>{ if(ref.current) ref.current.textContent = obj.val.toFixed(decimals)+suffix; }
    });
  }, [to]);
  return <span ref={ref}>0{suffix}</span>;
}

function ProgBar({ value, color, delay=0 }) {
  const ref = useRef(null);
  useEffect(()=>{
    if(!ref.current) return;
    gsap.fromTo(ref.current,{width:"0%"},{width:`${value}%`,duration:1.4,ease:"power2.out",delay});
  },[value,delay]);
  return(
    <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}>
      <div ref={ref} style={{height:"100%",background:color,borderRadius:3,boxShadow:`0 0 8px ${color}80`}}/>
    </div>
  );
}

export default function DashboardPage({ result, onNew }) {
  const [stats, setStats] = useState(null);
  const pageRef = useRef(null);

  useEffect(()=>{ getStats().then(setStats).catch(()=>{}); }, [result]);

  useEffect(()=>{
    if(!result || !pageRef.current) return;
    const ctx = gsap.context(()=>{
      gsap.timeline({ defaults:{ease:"power3.out"} })
        .from(".db-file",   {opacity:0,y:-8,duration:0.35})
        .from(".db-banner", {opacity:0,scale:0.95,duration:0.5,ease:"back.out(1.4)"},"-=0.1")
        .from(".db-strip",  {opacity:0,y:14,stagger:0.07,duration:0.4},"-=0.1")
        .from(".db-card",   {opacity:0,y:20,stagger:0.06,duration:0.45},"-=0.1");
    }, pageRef);
    return()=>ctx.revert();
  },[result]);

  if(!result){
    return(
      <div style={{textAlign:"center",padding:"4rem 1rem"}}>
        <div style={{fontSize:"3rem",marginBottom:"1rem",opacity:0.15}}>◈</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",color:"#2d4a66",marginBottom:"0.75rem"}}>
          NO RESULTS YET
        </div>
        <p style={{color:"#4a6a8a",fontSize:"0.82rem",marginBottom:"1.5rem"}}>
          Upload a file to run forensic analysis.
        </p>
        <button onClick={onNew} style={{
          padding:"10px 24px",borderRadius:8,
          border:"1px solid rgba(0,170,255,0.3)",background:"rgba(0,170,255,0.08)",
          color:"#00aaff",fontFamily:"'Bebas Neue',sans-serif",
          fontSize:"1rem",letterSpacing:"0.08em",cursor:"pointer",
        }}>+ Analyze File</button>
      </div>
    );
  }

  const vc   = VERDICT_C[result.verdict] || "#00e676";
  const conf = Math.round(result.confidence*100);
  const auth = Math.round(result.authenticity_score*100);
  const VICON= {deepfake:"⚠",authentic:"✓",suspicious:"◐"};

  return(
    <div ref={pageRef}>
      {/* File meta */}
      <div className="db-file" style={{
        fontFamily:"'DM Mono',monospace",fontSize:"0.65rem",color:"#4a6a8a",
        marginBottom:"0.75rem",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",
      }}>
        <span>FILE:</span><span style={{color:"#edf4ff"}}>{result.filename}</span>
        <span style={{color:"#162336"}}>|</span>
        <span>TYPE:</span><span style={{color:"#edf4ff"}}>{result.media_type?.toUpperCase()}</span>
        <span style={{color:"#162336"}}>|</span>
        <span>TIME:</span><span style={{color:"#edf4ff"}}>{result.processing_time_seconds}s</span>
      </div>

      {/* Verdict banner */}
      <div className="db-banner" style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        background:`${vc}10`,border:`1px solid ${vc}40`,
        borderRadius:14,padding:"1rem 1.5rem",marginBottom:"1.25rem",flexWrap:"wrap",gap:"0.75rem",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:"2rem"}}>{VICON[result.verdict]}</span>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(1.3rem,4vw,2rem)",letterSpacing:"0.1em",color:vc,lineHeight:1}}>
              {result.verdict==="deepfake"  ?"⚡ DEEPFAKE DETECTED":
               result.verdict==="authentic" ?"✓ AUTHENTIC MEDIA":
               "◐ SUSPICIOUS — MANUAL REVIEW"}
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"0.65rem",color:"#4a6a8a",marginTop:4}}>
              {result.filename} · Risk: <span style={{color:vc}}>{result.risk_level.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <button onClick={onNew} style={{
          padding:"8px 18px",borderRadius:8,
          border:`1px solid ${vc}40`,background:`${vc}14`,
          color:vc,fontFamily:"'DM Mono',monospace",fontSize:"0.72rem",cursor:"pointer",
        }}>+ New Analysis</button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{
          display:"grid",gridTemplateColumns:"repeat(4,1fr)",
          background:"#0d1625",border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:14,overflow:"hidden",marginBottom:"1.25rem",
        }}>
          {[
            {l:"Total Scans",   v:stats.total_analyses,    c:"#edf4ff"},
            {l:"Deepfakes",     v:stats.deepfakes_detected,c:"#ff2d55"},
            {l:"Authentic",     v:stats.authentic_media,   c:"#00e676"},
            {l:"Detection Rate",v:stats.detection_rate+"%",c:"#ffaa00"},
          ].map((s,i)=>(
            <div key={s.l} className="db-strip" style={{
              padding:"0.9rem 1.1rem",
              borderRight:i<3?"1px solid rgba(255,255,255,0.05)":"none",
            }}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:"0.58rem",color:"#2d4a66",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{s.l}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.7rem",lineHeight:1,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Confidence + Authenticity */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.9rem",marginBottom:"1.25rem"}}>
        <div className="db-card" style={{background:"#0d1625",border:`1px solid ${vc}30`,borderRadius:14,padding:"1.1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.4rem"}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"0.6rem",color:"#2d4a66",letterSpacing:"0.1em"}}>CONFIDENCE SCORE</div>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:"0.6rem",padding:"2px 8px",borderRadius:4,background:`${vc}20`,border:`1px solid ${vc}40`,color:vc}}>{result.risk_level}</span>
          </div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"3rem",lineHeight:1,color:vc,marginBottom:"0.25rem"}}>
            <AnimCounter to={conf} suffix="%"/>
          </div>
          <div style={{fontSize:"0.7rem",color:"#4a6a8a",marginBottom:"0.65rem"}}>Model certainty in verdict</div>
          <ProgBar value={conf} color={vc} delay={0.5}/>
        </div>

        <div className="db-card" style={{background:"#0d1625",border:`1px solid ${auth>50?"#00e67630":"#ff2d5530"}`,borderRadius:14,padding:"1.1rem"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"0.6rem",color:"#2d4a66",letterSpacing:"0.1em",marginBottom:"0.4rem"}}>AUTHENTICITY SCORE</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"3rem",lineHeight:1,color:auth>50?"#00e676":"#ff2d55",marginBottom:"0.25rem"}}>
            <AnimCounter to={auth} suffix="%"/>
          </div>
          <div style={{fontSize:"0.7rem",color:"#4a6a8a",marginBottom:"0.65rem"}}>Probability media is genuine</div>
          <ProgBar value={auth} color={auth>50?"#00e676":"#ff2d55"} delay={0.6}/>
        </div>
      </div>

      {/* Model breakdown */}
      <div className="db-card" style={{background:"#0d1625",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"1.25rem",marginBottom:"1.25rem"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:"0.62rem",color:"#4a6a8a",letterSpacing:"0.1em",marginBottom:"1rem"}}>
          MODEL ENSEMBLE BREAKDOWN
        </div>
        {Object.entries(result.model_scores).map(([model,score],i)=>{
          const pct=Math.round(score*100);
          const bc=pct>65?"#ff2d55":pct>40?"#ffaa00":"#00e676";
          return(
            <div key={model} style={{display:"grid",gridTemplateColumns:"200px 1fr 44px",alignItems:"center",gap:12,marginBottom:"0.6rem"}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:"0.68rem",color:"#6b8aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{model}</span>
              <ProgBar value={pct} color={bc} delay={0.4+i*0.05}/>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:"0.7rem",color:bc,textAlign:"right"}}>{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Indicators + Details */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
        <div className="db-card" style={{background:"#0d1625",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"1.25rem"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"0.62rem",color:"#4a6a8a",letterSpacing:"0.1em",marginBottom:"0.85rem"}}>FORENSIC INDICATORS</div>
          {result.indicators.map((ind,i)=>{
            const good=/natural|authentic|no synthetic|consistent|no ai/i.test(ind);
            const dc=good?"#00e676":result.verdict==="suspicious"?"#ffaa00":"#ff2d55";
            return(
              <div key={i} style={{display:"flex",gap:8,padding:"3px 0",alignItems:"flex-start"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:dc,flexShrink:0,marginTop:5,boxShadow:`0 0 5px ${dc}`}}/>
                <span style={{fontSize:"0.76rem",color:"#6b8aaa",lineHeight:1.5}}>{ind}</span>
              </div>
            );
          })}
        </div>

        <div className="db-card" style={{background:"#0d1625",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"1.25rem"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:"0.62rem",color:"#4a6a8a",letterSpacing:"0.1em",marginBottom:"0.85rem"}}>ANALYSIS DETAILS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.45rem"}}>
            {Object.entries(result.analysis_details)
              .filter(([,v])=>typeof v!=="boolean"&&v!=="N/A"&&v!==null)
              .slice(0,8)
              .map(([k,v])=>(
                <div key={k} style={{background:"rgba(255,255,255,0.025)",borderRadius:7,padding:"0.45rem 0.65rem"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:"0.56rem",color:"#2d4a66",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>
                    {k.replace(/_/g," ")}
                  </div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:"0.7rem",color:"#edf4ff"}}>{String(v)}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}