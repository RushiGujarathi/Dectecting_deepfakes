import { useState } from "react";
import { analyzeText } from "../utils/api";

const EXAMPLES = [
  {
    label: "AI Sample",
    text: `Certainly! I'd be happy to explain how machine learning works. Machine learning is a fascinating field that leverages algorithms to enable computers to learn from data. Furthermore, it is important to note that there are several key approaches: supervised learning, unsupervised learning, and reinforcement learning. Each of these methodologies has its own unique strengths and applications. In essence, the goal is to build robust models that can generalize well to new, unseen data.`,
  },
  {
    label: "Human Sample",
    text: `I've been using this laptop for about three years now and honestly it's been a mixed bag. The battery went bad faster than expected - by month 18 it was down to maybe 40% capacity. Customer service was no help. On the plus side the keyboard feels really nice to type on, which matters when you're writing for hours. Not sure if I'd buy the same brand again.`,
  },
];

const SCAN_LOGS = [
  "Tokenizing input text…",
  "Computing character n-gram entropy…",
  "Measuring word distribution burstiness…",
  "Scanning for LLM phrase signatures…",
  "Evaluating vocabulary richness…",
  "Running 5-model ensemble fusion…",
  "Writing audit record to MongoDB…",
];

export default function TextAnalyzerPage({ onResult }) {
  const [text,     setText]     = useState("");
  const [scanning, setScanning] = useState(false);
  const [logs,     setLogs]     = useState([]);
  const [error,    setError]    = useState("");

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const ready     = wordCount >= 5;

  const scan = async () => {
    if (!ready) return;
    setScanning(true);
    setLogs([]);
    setError("");

    let i = 0;
    const iv = setInterval(()=>{
      if(i < SCAN_LOGS.length){ setLogs(p=>[...p,{text:SCAN_LOGS[i],type:""}]); i++; }
    }, 340);

    try {
      const result = await analyzeText(text);
      clearInterval(iv);
      setLogs(p => [...p, { text:"✓ Analysis complete!", type:"ok" }]);
      setTimeout(() => onResult(result, "text"), 600);
    } catch(err) {
      clearInterval(iv);
      setError(err.message || "Backend unreachable. Run: uvicorn main:app --reload");
      setScanning(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:"1.75rem" }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.65rem", color:"#00e676", letterSpacing:"0.15em", marginBottom:"0.5rem" }}>
          ◈ TEXT ANALYZER — AI CONTENT DETECTION
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(2rem,5vw,4rem)", letterSpacing:"0.04em", lineHeight:0.95, marginBottom:"0.75rem" }}>
          DETECT<br/><span style={{ color:"#00e676" }}>AI TEXT</span>
        </h1>
        <p style={{ color:"#6b8aaa", fontSize:"0.85rem", lineHeight:1.6, maxWidth:480 }}>
          Paste any text to detect if it was written by an AI language model.
          Uses perplexity, burstiness, vocabulary analysis, and LLM phrase signatures.
        </p>
        <div style={{ display:"flex", gap:8, marginTop:"0.85rem", flexWrap:"wrap" }}>
          {[
            { l:"Perplexity Proxy",  c:"#00e676" },
            { l:"Burstiness",        c:"#00aaff" },
            { l:"LLM Phrase Detect", c:"#aa55ff" },
            { l:"Vocab Richness",    c:"#ff6b35" },
            { l:"AI Opener Check",   c:"#ffcc00" },
          ].map(t => (
            <span key={t.l} style={{
              fontFamily:"'DM Mono',monospace", fontSize:"0.6rem",
              padding:"3px 10px", borderRadius:4,
              background:`${t.c}14`, border:`1px solid ${t.c}35`, color:t.c,
            }}>{t.l}</span>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          background:"rgba(255,45,85,0.08)", border:"1px solid rgba(255,45,85,0.3)",
          borderRadius:10, padding:"0.85rem 1.1rem", marginBottom:"1rem",
          fontFamily:"'DM Mono',monospace", fontSize:"0.75rem", color:"#ff2d55",
          display:"flex", gap:8,
        }}>
          <span>⚠</span><span>{error}</span>
        </div>
      )}

      {/* Text area */}
      <div style={{
        background:"#0d1625",
        border:`1.5px solid ${scanning?"rgba(0,230,118,0.4)":ready?"rgba(0,230,118,0.25)":"rgba(255,255,255,0.07)"}`,
        borderRadius:14, padding:"1.25rem", marginBottom:"1rem", transition:"border-color 0.2s",
      }}>
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:"0.75rem",
        }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#2d4a66", letterSpacing:"0.1em" }}>
            PASTE TEXT TO ANALYZE
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {EXAMPLES.map(ex => (
              <button key={ex.label} onClick={() => { setText(ex.text); setError(""); }}
                style={{
                  fontFamily:"'DM Mono',monospace", fontSize:"0.62rem",
                  padding:"3px 10px", borderRadius:4, cursor:"pointer",
                  border:"1px solid rgba(0,230,118,0.25)", background:"rgba(0,230,118,0.07)",
                  color:"#00e676",
                }}>Try {ex.label}</button>
            ))}
          </div>
        </div>

        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setError(""); }}
          placeholder="Paste an article, email, essay, chatbot response, social media post, or any text here…"
          disabled={scanning}
          rows={10}
          style={{
            width:"100%", background:"transparent", border:"none",
            color:"#edf4ff", fontFamily:"'DM Mono',monospace",
            fontSize:"0.82rem", resize:"vertical", outline:"none",
            lineHeight:1.75, opacity:scanning?0.5:1,
          }}
        />

        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          marginTop:"0.5rem", paddingTop:"0.5rem",
          borderTop:"1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#2d4a66" }}>
            {wordCount} words · {text.length} chars
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color: ready?"#00e676":"#4a6a8a" }}>
            {wordCount < 5  ? "Add at least 5 words" :
             wordCount < 30 ? "More text = more accurate" :
             "✓ Ready for analysis"}
          </div>
        </div>
      </div>

      {/* Terminal log */}
      {logs.length > 0 && (
        <div style={{
          background:"#080e18", border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:12, overflow:"hidden", marginBottom:"1rem",
        }}>
          <div style={{
            padding:"8px 12px", background:"rgba(255,255,255,0.03)",
            borderBottom:"1px solid rgba(255,255,255,0.06)",
            display:"flex", alignItems:"center", gap:8,
          }}>
            {["#ff5f57","#ffbd2e","#28c940"].map((bg,i) => (
              <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:bg }}/>
            ))}
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#2d4a66", marginLeft:6 }}>
              deepshield.text.analyzer
            </span>
          </div>
          <div style={{ padding:"0.85rem 1rem" }}>
            {logs.map((l,i) => (
              <div key={i} style={{
                display:"flex", gap:8, padding:"2px 0",
                fontFamily:"'DM Mono',monospace", fontSize:"0.72rem",
                color:l.type==="ok"?"#00e676":"#6b8aaa",
              }}>
                <span style={{ color:"#00e676" }}>$</span>
                <span>{l.text}</span>
              </div>
            ))}
            {scanning && (
              <div style={{ display:"flex", gap:8, padding:"2px 0" }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.72rem", color:"#00e676" }}>$</span>
                <span style={{
                  display:"inline-block", width:8, height:14,
                  background:"#00e676", animation:"blink 1s step-end infinite",
                  verticalAlign:"middle",
                }}/>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analyze button */}
      {!scanning && (
        <button
          onClick={scan}
          disabled={!ready}
          style={{
            width:"100%", padding:"15px", borderRadius:12, border:"none",
            fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.25rem",
            letterSpacing:"0.1em", cursor:ready?"pointer":"not-allowed",
            background:ready?"#00e676":"#162336",
            color:ready?"#000":"#2d4a66",
            transition:"all 0.2s",
            boxShadow:ready?"0 4px 24px rgba(0,230,118,0.35)":"none",
          }}
        >
          📝 ANALYZE TEXT FOR AI GENERATION
        </button>
      )}

      {/* Guide */}
      <div style={{
        marginTop:"1.5rem", background:"#0d1625",
        border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"1.25rem",
      }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.62rem", color:"#2d4a66", letterSpacing:"0.1em", marginBottom:"0.85rem" }}>
          HOW IT WORKS
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
          {[
            { icon:"📊", title:"Perplexity Proxy", desc:"Measures character n-gram entropy. AI text is more predictable." },
            { icon:"〰️", title:"Burstiness",       desc:"Humans use words in bursts. AI distributes them too evenly." },
            { icon:"📖", title:"Vocab Richness",   desc:"Type-token ratio analysis reveals AI padding patterns." },
            { icon:"🔍", title:"LLM Phrases",      desc:"Scans for transition words and openers typical of LLMs." },
            { icon:"🤖", title:"AI Opener Check",  desc:"Detects \"Certainly!\", \"Great question!\" and similar patterns." },
            { icon:"📏", title:"Sentence Variance",desc:"AI writes sentences of unnaturally consistent lengths." },
          ].map(item => (
            <div key={item.title} style={{
              padding:"0.7rem 0.85rem", background:"rgba(255,255,255,0.025)",
              borderRadius:8,
            }}>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:"0.3rem" }}>
                <span style={{ fontSize:"1rem" }}>{item.icon}</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.65rem", color:"#00e676" }}>{item.title}</span>
              </div>
              <div style={{ fontSize:"0.72rem", color:"#4a6a8a", lineHeight:1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}