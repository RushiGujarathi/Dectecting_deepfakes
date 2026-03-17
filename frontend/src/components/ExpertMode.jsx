import { useState } from "react";

const EXPERT_EXPLANATIONS = {
  ela: {
    title: "ELA (Error Level Analysis)",
    simple: "Checks if the image was compressed differently in different areas — a sign of editing or AI generation.",
    expert: "ELA re-saves the image at a known compression level and measures the difference. Authentic images show uniform error levels. Manipulated regions show higher error because they were compressed at a different quality than the surrounding pixels. AI-generated images show characteristic entropy patterns (7.6–7.9 bits) vs real photos (7.0–7.5 bits)."
  },
  frequency: {
    title: "Frequency Domain Analysis",
    simple: "Looks for invisible grid patterns that AI generators leave behind.",
    expert: "GANs (Generative Adversarial Networks) use convolutional layers with fixed kernel sizes (typically 4×4 or 8×8). These produce periodic spectral artifacts visible in the DCT frequency domain. We detect these by computing autocorrelation at lags of 8, 16, and 32 bytes and measuring periodicity scores."
  },
  metadata: {
    title: "Metadata Forensics",
    simple: "Searches the file for AI tool names hidden in the file data.",
    expert: "Image files embed metadata in EXIF (JPEG) or tEXt/iTXt chunks (PNG). AI generation tools like Stable Diffusion write their name, version, and generation parameters into these fields. We scan the first 16KB of the file for 15+ known AI tool signatures. Missing EXIF in JPEG also raises suspicion — real cameras always write EXIF."
  },
  noise: {
    title: "Noise Pattern Analysis",
    simple: "Real cameras produce messy, natural noise. AI images are too smooth.",
    expert: "Real camera sensors introduce spatially-varying shot noise and read noise. We compute local pixel variance in 16-byte chunks across the image. Authentic photos show high variance-of-variance (smooth sky vs detailed grass). AI images show unnaturally uniform variance — the neural network produces consistent pixel distributions across all regions."
  },
  tts: {
    title: "TTS Signature Detection",
    simple: "Checks if a voice cloning tool's name is hidden in the audio file.",
    expert: "Text-to-speech engines like ElevenLabs, VALL-E, and Murf write identifying strings into audio file metadata and codec headers. We scan the first 8KB of the audio binary for 8+ known TTS engine signatures. This is highly reliable when metadata hasn't been stripped."
  },
  spectral: {
    title: "Spectral Flatness",
    simple: "Measures whether the voice sounds too perfect — real voices are imperfect.",
    expert: "Spectral flatness = geometric_mean(spectrum) / arithmetic_mean(spectrum). Values near 1.0 indicate white noise (synthetic). Values near 0 indicate tonal content (natural speech with clear formants). Neural vocoders used in TTS (WaveNet, HiFi-GAN) produce characteristic spectral flatness profiles in the 0.4–0.7 range, distinct from natural speech (0.1–0.3)."
  }
};

export default function ExpertMode({ result, mediaType }) {
  const [expert, setExpert] = useState(false);

  const keys = mediaType === "image"
    ? ["ela", "frequency", "metadata", "noise"]
    : mediaType === "audio"
    ? ["tts", "spectral"]
    : ["frequency"];

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "var(--r-xl)", padding: "1.5rem", marginBottom: "1.25rem"
    }}>
      {/* Toggle header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Explanation Mode
          </div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>
            {expert ? "🔬 Expert View" : "💡 Simple View"}
          </div>
        </div>
        {/* Toggle switch */}
        <div
          onClick={() => setExpert(p => !p)}
          style={{
            width: 52, height: 28, borderRadius: 14,
            background: expert ? "var(--img)" : "var(--raised)",
            border: `1px solid ${expert ? "var(--img)" : "rgba(255,255,255,0.1)"}`,
            cursor: "pointer", position: "relative",
            transition: "all 0.25s"
          }}
        >
          <div style={{
            position: "absolute", top: 3, left: expert ? 26 : 3,
            width: 20, height: 20, borderRadius: "50%",
            background: expert ? "#000" : "var(--t2)",
            transition: "left 0.25s", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.6rem"
          }}>
            {expert ? "🔬" : "💡"}
          </div>
        </div>
      </div>

      {/* Explanations */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {keys.map(key => {
          const ex = EXPERT_EXPLANATIONS[key];
          if (!ex) return null;
          return (
            <div key={key} style={{
              background: "var(--raised)", borderRadius: "var(--r)", padding: "0.875rem 1rem",
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.35rem", color: "var(--img)" }}>
                {ex.title}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--t2)", lineHeight: 1.6 }}>
                {expert ? ex.expert : ex.simple}
              </div>
            </div>
          );
        })}
      </div>

      {!expert && (
        <div style={{ marginTop: "0.75rem", fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--t3)", textAlign: "center" }}>
          Toggle to Expert Mode for technical details ↑
        </div>
      )}
    </div>
  );
}