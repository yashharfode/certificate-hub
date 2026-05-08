import type { TemplateId } from "@/lib/cert-utils";

export interface CertData {
  templateId: TemplateId;
  recipientName: string;
  projectName?: string;
  hackathonName?: string;
  categoryName?: string;
  certificateId: string;
  issueDate: string;
  signatureName?: string;
  signatureTitle?: string;
  description?: string;
  organization?: string;
  eventName?: string;
  assets?: {
    logo?: string;
    msmeLogo?: string;
    stamp?: string;
    signatureImage?: string;
  };
  partners?: { label?: string; prefix?: string; logo?: string }[];
}

interface Props {
  data: CertData;
  /** scale 0-1 for preview, 1 for export */
  scale?: number;
  innerRef?: React.Ref<HTMLDivElement>;
}

/* Each cert is rendered at fixed 1400x990 px and scaled. */
export function CertificateTemplate({ data, scale = 1, innerRef }: Props) {
  const W = 1400;
  const H = 990;
  return (
    <div
      style={{
        width: W * scale,
        height: H * scale,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {renderTemplate(data)}
      </div>
    </div>
  );
}

function renderTemplate(d: CertData) {
  switch (d.templateId) {
    case "modern-minimal": return <ModernMinimal {...d} />;
    case "bold-hackathon": return <BoldHackathon {...d} />;
    case "elegant-script": return <ElegantScript {...d} />;
    case "corporate-formal": return <CorporateFormal {...d} />;
    case "royal-navy":
    default: return <RoyalNavy {...d} />;
  }
}

const ORG = (d: CertData) => d.organization || "DEVLYNIX";
const EVT = (d: CertData) => d.eventName || d.hackathonName || "EVENT";

function AssetHeader({ d, color = "#0a0f1e" }: { d: CertData; color?: string }) {
  const { logo, msmeLogo } = d.assets || {};
  if (!logo && !msmeLogo) return null;
  return (
    <div style={{ position: "absolute", top: 60, left: 80, right: 80, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 5, color }}>
      {logo ? <img src={logo} crossOrigin="anonymous" alt="logo" style={{ maxHeight: 70, maxWidth: 220, objectFit: "contain" }} /> : <div />}
      {msmeLogo ? <img src={msmeLogo} crossOrigin="anonymous" alt="msme" style={{ maxHeight: 70, maxWidth: 220, objectFit: "contain" }} /> : <div />}
    </div>
  );
}

function PartnerStrip({ d }: { d: CertData }) {
  const ps = (d.partners || []).filter((p) => p.logo);
  if (!ps.length) return null;
  return (
    <div style={{ position: "absolute", bottom: 18, left: 80, right: 80, display: "flex", justifyContent: "center", alignItems: "center", gap: 36, zIndex: 5 }}>
      {ps.map((p, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          {p.prefix && <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{p.prefix.toUpperCase()}</div>}
          <img src={p.logo} crossOrigin="anonymous" alt={p.label || "partner"} style={{ maxHeight: 44, maxWidth: 140, objectFit: "contain" }} />
          {p.label && <div style={{ fontSize: 10, color: "#64748b" }}>{p.label}</div>}
        </div>
      ))}
    </div>
  );
}

/* ============ Royal Navy & Gold ============ */
function RoyalNavy(d: CertData) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#faf7f0", position: "relative", fontFamily: "'Cormorant Garamond', serif", color: "#0a0f1e" }}>
      <div style={{ position: "absolute", inset: 24, border: "3px solid #0a0f1e" }} />
      <div style={{ position: "absolute", inset: 38, border: "1px solid #c9a84c" }} />
      <CornerOrnaments color="#c9a84c" />
      <AssetHeader d={d} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "90px 110px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, letterSpacing: "0.4em", color: "#0a0f1e", marginTop: 70 }}>{ORG(d)} • {EVT(d)}</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, letterSpacing: "0.35em", color: "#c9a84c", marginTop: 6 }}>CERTIFICATE OF ACHIEVEMENT</div>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 86, fontWeight: 900, marginTop: 24, letterSpacing: "0.06em" }}>CERTIFICATE</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, color: "#c9a84c", fontSize: 14, letterSpacing: "0.3em" }}>
          <Line /> <span>THIS CERTIFICATE IS PROUDLY PRESENTED TO</span> <Line />
        </div>
        <div style={{ fontFamily: "'Alex Brush', cursive", fontSize: 100, color: "#0a0f1e", marginTop: 10, lineHeight: 1 }}>{d.recipientName}</div>
        <div style={{ width: "70%", height: 1, background: "#c9a84c", marginTop: 22 }} />
        <p style={{ fontStyle: "italic", fontSize: 24, marginTop: 22, maxWidth: 1100, lineHeight: 1.45 }}>
          {d.description || "in recognition of outstanding technical excellence, creative innovation, and securing the title of"}
        </p>
        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 34, marginTop: 14, letterSpacing: "0.08em" }}>{(d.categoryName || "PARTICIPATION").toUpperCase()}</div>
        {d.projectName && <div style={{ fontStyle: "italic", fontSize: 22, marginTop: 10 }}>with the exceptional project <b>{d.projectName.toUpperCase()}</b></div>}
      </div>
      <Footer d={d} />
      <PartnerStrip d={d} />
    </div>
  );
}

/* ============ Modern Minimal ============ */
function ModernMinimal(d: CertData) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#ffffff", color: "#0f172a", position: "relative", fontFamily: "'DM Sans', sans-serif", padding: 80 }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: "#3b82f6" }} />
      <AssetHeader d={d} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: "0.4em", color: "#64748b", marginTop: d.assets?.logo ? 80 : 0 }}>{ORG(d)}</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{EVT(d)}</div>
        </div>
        <div style={{ fontSize: 14, color: "#64748b" }}>ID • {d.certificateId}</div>
      </div>
      <div style={{ marginTop: 80 }}>
        <div style={{ fontSize: 18, letterSpacing: "0.3em", color: "#3b82f6" }}>CERTIFICATE OF {(d.categoryName || "PARTICIPATION").toUpperCase()}</div>
        <h1 style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05, marginTop: 24, letterSpacing: "-0.02em" }}>{d.recipientName}</h1>
        <div style={{ width: 120, height: 4, background: "#3b82f6", marginTop: 30 }} />
        <p style={{ fontSize: 22, color: "#475569", marginTop: 24, maxWidth: 1100, lineHeight: 1.5 }}>
          {d.description || "For exceptional contribution and innovation"}{d.projectName ? <> — project <b style={{color:"#0f172a"}}>{d.projectName}</b></> : ""}.
        </p>
      </div>
      <div style={{ position: "absolute", bottom: 90, left: 80, right: 80, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{d.issueDate}</div>
          <div style={{ fontSize: 13, color: "#64748b", letterSpacing: "0.2em", marginTop: 4 }}>DATE OF ISSUE</div>
        </div>
        {d.assets?.stamp && <img src={d.assets.stamp} crossOrigin="anonymous" alt="stamp" style={{ maxHeight: 110, maxWidth: 140, objectFit: "contain", opacity: 0.9 }} />}
        <div style={{ textAlign: "right" }}>
          {d.assets?.signatureImage
            ? <img src={d.assets.signatureImage} crossOrigin="anonymous" alt="signature" style={{ maxHeight: 70, maxWidth: 260, objectFit: "contain", marginLeft: "auto" }} />
            : <div style={{ fontFamily: "'Alex Brush', cursive", fontSize: 50, color: "#0f172a" }}>{d.signatureName || "Signature"}</div>}
          <div style={{ width: 260, height: 1, background: "#0f172a", margin: "4px 0 6px auto" }} />
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.1em" }}>{(d.signatureName || "AUTHORIZED").toUpperCase()}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{d.signatureTitle || "Founder"}</div>
        </div>
      </div>
      <PartnerStrip d={d} />
    </div>
  );
}

/* ============ Bold Hackathon ============ */
function BoldHackathon(d: CertData) {
  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#0a0f1e 0%,#1a1a3a 100%)", color: "#fff", position: "relative", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,#22d3ee44,transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -150, left: -150, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,#a78bfa44,transparent 70%)" }} />
      <div style={{ position: "absolute", inset: 30, border: "2px solid #22d3ee55", borderRadius: 20 }} />
      <AssetHeader d={d} color="#fff" />
      <div style={{ position: "relative", padding: 90, textAlign: "center", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 14, letterSpacing: "0.5em", color: "#22d3ee" }}>{ORG(d)} // {EVT(d)}</div>
        <div style={{ marginTop: 30, padding: "10px 30px", border: "1px solid #22d3ee", borderRadius: 999, fontSize: 14, letterSpacing: "0.4em" }}>CERTIFICATE OF {(d.categoryName || "ACHIEVEMENT").toUpperCase()}</div>
        <div style={{ fontSize: 24, marginTop: 50, color: "#cbd5e1" }}>This certificate is awarded to</div>
        <h1 style={{ fontSize: 110, fontWeight: 900, marginTop: 20, background: "linear-gradient(90deg,#22d3ee,#a78bfa)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", lineHeight: 1 }}>{d.recipientName}</h1>
        {d.projectName && <div style={{ marginTop: 36, fontSize: 26 }}>For the project <b style={{ color: "#22d3ee" }}>{d.projectName}</b></div>}
        <div style={{ marginTop: 28, color: "#94a3b8", fontSize: 18, maxWidth: 900, lineHeight: 1.6 }}>{d.description || "Recognized for technical excellence, creative innovation and dedication to building."}</div>
      </div>
      <Footer d={d} dark />
      <PartnerStrip d={d} />
    </div>
  );
}

/* ============ Elegant Script ============ */
function ElegantScript(d: CertData) {
  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(180deg,#fdfaf0,#f4ead0)", color: "#3a2a10", position: "relative", fontFamily: "'Cormorant Garamond', serif" }}>
      <div style={{ position: "absolute", inset: 36, border: "1px solid #b8923a", borderRadius: 6 }} />
      <div style={{ position: "absolute", inset: 50, border: "1px solid #b8923a55", borderRadius: 4 }} />
      <AssetHeader d={d} color="#3a2a10" />
      <div style={{ padding: 110, textAlign: "center", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 16, letterSpacing: "0.5em", color: "#8a6a20", marginTop: d.assets?.logo ? 40 : 0 }}>{ORG(d)} • {EVT(d)}</div>
        <div style={{ fontFamily: "'Alex Brush', cursive", fontSize: 120, color: "#3a2a10", marginTop: 20, lineHeight: 1 }}>Certificate</div>
        <div style={{ fontSize: 22, fontStyle: "italic", marginTop: 4 }}>of {d.categoryName || "Achievement"}</div>
        <div style={{ fontSize: 22, marginTop: 36 }}>is hereby presented to</div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 64, fontWeight: 700, marginTop: 14, letterSpacing: "0.05em" }}>{d.recipientName}</div>
        <div style={{ width: 600, height: 1, background: "#b8923a", marginTop: 20 }} />
        <p style={{ fontStyle: "italic", fontSize: 22, marginTop: 24, maxWidth: 1000, lineHeight: 1.5 }}>
          {d.description || <>for outstanding contribution to <b>{EVT(d)}</b>{d.projectName ? <> with the project <b>{d.projectName}</b></> : ""}.</>}
        </p>
      </div>
      <Footer d={d} accent="#8a6a20" />
      <PartnerStrip d={d} />
    </div>
  );
}

/* ============ Corporate Formal ============ */
function CorporateFormal(d: CertData) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#fff", color: "#0c2340", position: "relative", fontFamily: "'Libre Baskerville', serif" }}>
      <div style={{ position: "absolute", inset: 30, border: "6px double #0c2340" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: "#0c2340" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 16, background: "#0c2340" }} />
      <AssetHeader d={d} color="#0c2340" />
      <div style={{ padding: 100, textAlign: "center", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 16, letterSpacing: "0.4em", color: "#0c2340", marginTop: d.assets?.logo ? 50 : 0 }}>{ORG(d)} — {EVT(d)}</div>
        <h1 style={{ fontSize: 64, fontWeight: 700, marginTop: 40, letterSpacing: "0.04em" }}>CERTIFICATE</h1>
        <div style={{ fontSize: 18, letterSpacing: "0.4em", marginTop: 6 }}>OF {(d.categoryName || "PARTICIPATION").toUpperCase()}</div>
        <div style={{ fontSize: 22, marginTop: 40, fontStyle: "italic" }}>This is to certify that</div>
        <div style={{ fontSize: 60, fontWeight: 700, marginTop: 18, fontFamily: "'Cinzel', serif" }}>{d.recipientName}</div>
        <div style={{ width: 500, height: 2, background: "#0c2340", marginTop: 20 }} />
        <p style={{ fontSize: 20, marginTop: 24, maxWidth: 1000, lineHeight: 1.5, fontStyle: "italic" }}>
          {d.description || <>has successfully participated{d.projectName ? <> with the project <b>{d.projectName}</b></> : ""} and demonstrated commendable performance.</>}
        </p>
      </div>
      <Footer d={d} accent="#0c2340" />
      <PartnerStrip d={d} />
    </div>
  );
}

/* ============ Shared bits ============ */
function Line() {
  return <div style={{ width: 80, height: 1, background: "#c9a84c" }} />;
}

function CornerOrnaments({ color }: { color: string }) {
  const corner = (style: React.CSSProperties) => (
    <svg width="80" height="80" viewBox="0 0 80 80" style={style}>
      <path d="M0 0 L40 0 M0 0 L0 40 M10 10 L30 10 M10 10 L10 30" stroke={color} strokeWidth="2" fill="none" />
      <circle cx="40" cy="40" r="3" fill={color} />
    </svg>
  );
  return (
    <>
      {corner({ position: "absolute", top: 50, left: 50 })}
      {corner({ position: "absolute", top: 50, right: 50, transform: "scaleX(-1)" })}
      {corner({ position: "absolute", bottom: 50, left: 50, transform: "scaleY(-1)" })}
      {corner({ position: "absolute", bottom: 50, right: 50, transform: "scale(-1,-1)" })}
    </>
  );
}

function Footer({ d, dark, accent }: { d: CertData; dark?: boolean; accent?: string }) {
  const date = d.issueDate; const certId = d.certificateId; const sig = d.signatureName; const sigTitle = d.signatureTitle;
  const stamp = d.assets?.stamp; const sigImg = d.assets?.signatureImage;
  const color = accent || (dark ? "#cbd5e1" : "#0a0f1e");
  const muted = dark ? "#64748b" : "#64748b";
  return (
    <div style={{ position: "absolute", bottom: 110, left: 100, right: 100, display: "flex", justifyContent: "space-between", alignItems: "flex-end", color }}>
      <div>
        <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>{date}</div>
        <div style={{ width: 220, height: 1, background: color, margin: "6px 0" }} />
        <div style={{ fontSize: 12, letterSpacing: "0.25em", color: muted }}>DATE OF ISSUE</div>
      </div>
      <div style={{ textAlign: "center", fontSize: 12, letterSpacing: "0.25em", color: muted }}>
        {stamp && <img src={stamp} crossOrigin="anonymous" alt="stamp" style={{ maxHeight: 90, maxWidth: 120, objectFit: "contain", display: "block", margin: "0 auto 6px" }} />}
        CERT-ID • {certId}
      </div>
      <div style={{ textAlign: "right" }}>
        {sigImg
          ? <img src={sigImg} crossOrigin="anonymous" alt="signature" style={{ maxHeight: 70, maxWidth: 240, objectFit: "contain", marginLeft: "auto" }} />
          : <div style={{ fontFamily: "'Alex Brush', cursive", fontSize: 50, color }}>{sig || "Signature"}</div>}
        <div style={{ width: 260, height: 1, background: color, margin: "4px 0" }} />
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.18em" }}>{(sig || "AUTHORIZED").toUpperCase()}</div>
        <div style={{ fontSize: 11, color: muted, letterSpacing: "0.1em" }}>{sigTitle || "Founder"}</div>
      </div>
    </div>
  );
}