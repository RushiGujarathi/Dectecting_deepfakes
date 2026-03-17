import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are DeepShield's AI forensics expert assistant. You help users understand:
1. How deepfake detection works (ELA, frequency analysis, metadata forensics, noise analysis)
2. What the analysis results mean
3. Why specific media was flagged as fake or authentic
4. Technical details about GAN artifacts, deepfake methods, detection techniques

Keep answers concise (2-4 sentences), use simple language unless user asks for technical detail.
Always relate answers to the DeepShield detection pipeline when relevant.
Current detection methods: ELA (Error Level Analysis), Frequency Domain, Metadata Forensics, Noise Pattern for images; Container Forensics, Entropy, Signature Detection for video; TTS Signature, Spectral Flatness, Silence Ratio for audio.`;

const QUICK_QUESTIONS = [
  "Why was my image flagged as fake?",
  "How does ELA detection work?",
  "What are GAN artifacts?",
  "How do you detect cloned voices?",
  "What makes a deepfake video detectable?",
  "Explain confidence score",
];

export default function ChatBot({ lastResult }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm DeepShield's AI forensics expert. Ask me anything about deepfake detection, your analysis results, or how the technology works. 🔍"
    }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = () => {
    if (!lastResult) return "";
    return `\n\nContext - Last analysis result: File="${lastResult.filename}", Verdict="${lastResult.verdict}", Confidence=${Math.round(lastResult.confidence*100)}%, Risk="${lastResult.risk_level}", Indicators: ${lastResult.indicators?.join("; ")}`;
  };

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT + buildContext(),
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again.";
      setMessages(p => [...p, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(p => [...p, {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please check your connection and try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "var(--surface)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "var(--r-xl)", overflow: "hidden",
      height: "520px"
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem 1.25rem",
        background: "var(--raised)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: "10px"
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,170,255,0.15)", border: "1px solid rgba(0,170,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🤖</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>DeepShield AI Expert</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.62rem", color: "var(--real)", display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--real)", boxShadow: "0 0 4px var(--real)" }} />
            ONLINE · Powered by Claude AI
          </div>
        </div>
        {lastResult && (
          <div style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: "0.62rem", color: "var(--t3)", background: "var(--card)", padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)" }}>
            Context: {lastResult.filename?.slice(0, 20)}...
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
          }}>
            {m.role === "assistant" && (
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(0,170,255,0.15)", border: "1px solid rgba(0,170,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", flexShrink: 0, marginRight: 8, marginTop: 2 }}>🤖</div>
            )}
            <div style={{
              maxWidth: "75%", padding: "10px 14px",
              borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.role === "user" ? "var(--img)" : "var(--raised)",
              color: m.role === "user" ? "#000" : "var(--t1)",
              fontSize: "0.84rem", lineHeight: 1.55, fontWeight: m.role === "user" ? 600 : 400,
              border: m.role === "assistant" ? "1px solid rgba(255,255,255,0.06)" : "none"
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(0,170,255,0.15)", border: "1px solid rgba(0,170,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>🤖</div>
            <div style={{ background: "var(--raised)", border: "1px solid rgba(255,255,255,0.06)", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", display: "flex", gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--img)", animation: `bounce 1.2s ${i*0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      <div style={{ padding: "0.5rem 1rem", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {QUICK_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => send(q)}
            style={{
              fontFamily: "var(--mono)", fontSize: "0.65rem",
              padding: "4px 10px", borderRadius: 4, whiteSpace: "nowrap",
              border: "1px solid rgba(0,170,255,0.2)", background: "rgba(0,170,255,0.06)",
              color: "var(--img)", cursor: "pointer", flexShrink: 0
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about deepfakes, detection methods, results..."
          style={{
            flex: 1, padding: "10px 14px",
            background: "var(--raised)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--r)", color: "var(--t1)",
            fontFamily: "var(--body)", fontSize: "0.84rem", outline: "none"
          }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            padding: "10px 16px", borderRadius: "var(--r)", border: "none",
            background: input.trim() ? "var(--img)" : "var(--raised)",
            color: input.trim() ? "#000" : "var(--t3)",
            cursor: input.trim() ? "pointer" : "default",
            fontWeight: 700, fontSize: "0.9rem", transition: "all 0.15s"
          }}
        >
          ↑
        </button>
      </div>

      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}