import { useState, useRef, useEffect, useCallback } from "react";

/* ─── colour tokens ─── */
const C = {
  bg: "#FAF8F5", card: "#FFFFFF", border: "#E8E2DA",
  text: "#1A1A1A", textSec: "#666666",
  brand: "#B05C3B", brandLight: "#F3E8E2", brandDark: "#8B3F24",
  accent: "#2D6A4F", accentLight: "#D4EDDA",
  warn: "#D4A017", warnLight: "#FFF8E1",
  activityBg: "#FAFAF8",
};

/* ─── icons ─── */
const I = {
  Upload: (s = 20) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2M14 7l-4-4-4 4M10 3v10" /></svg>,
  Sparkle: (s = 16) => <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5z" /></svg>,
  Check: (s = 14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5l3 3L11.5 4" /></svg>,
  Plus: (s = 16) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>,
  Trash: (s = 15) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" /></svg>,
  Send: () => <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M2.94 5.34A1 1 0 012.62 4.1l14-4a1 1 0 011.28 1.28l-4 14a1 1 0 01-1.84.08L9.2 9.2 2.94 6.34z" /></svg>,
  File: (s = 18) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h8l4 4v10a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z" /><path d="M12 2v4h4" /></svg>,
  Globe: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5" /><path d="M1.5 8h13M8 1.5c-2 2.5-2 9 0 13M8 1.5c2 2.5 2 9 0 13" /></svg>,
  Building: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 14V3a1 1 0 011-1h6a1 1 0 011 1v11M10 7h3a1 1 0 011 1v6M5 5h2M5 8h2M5 11h2" /></svg>,
  MapPin: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 14s-5-4.5-5-8a5 5 0 0110 0c0 3.5-5 8-5 8z" /><circle cx="8" cy="6" r="1.5" /></svg>,
  Calendar: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="1" /><path d="M5 1v3M11 1v3M2 7h12" /></svg>,
  Users: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="5" r="2.5" /><path d="M1 14c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" /></svg>,
  Search: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="7" r="5" /><path d="M14.5 14.5l-3.6-3.6" /></svg>,
  Paperclip: () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 10l-6.4 6.4a3.5 3.5 0 01-5-5L10.5 5a2.3 2.3 0 013.3 3.3L7.5 14.5a1.2 1.2 0 01-1.7-1.7L12 6.5" /></svg>,
  Zap: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 1L3 9h5l-1 6 6-8H8z" /></svg>,
  Eye: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2" /></svg>,
  Lightbulb: () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 14h4M5.5 11.5c-1.5-1-2.5-2.7-2.5-4.5a5 5 0 0110 0c0 1.8-1 3.5-2.5 4.5V13a1 1 0 01-1 1h-2a1 1 0 01-1-1z" /></svg>,
  ExternalLink: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 8v3.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 011 11.5v-7A1.5 1.5 0 012.5 3H6M9 1h4v4M6 8L13 1" /></svg>,
  Loader: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 1v3M8 12v3M3.3 3.3l2.1 2.1M10.6 10.6l2.1 2.1M1 8h3M12 8h3M3.3 12.7l2.1-2.1M10.6 5.4l2.1-2.1"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite" /></path></svg>,
};

/* ─── tiny components ─── */
const Badge = ({ children, color = C.brand, bg = C.brandLight, style: s }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color, background: bg, padding: "2px 9px", borderRadius: 4, ...s }}>{children}</span>
);
const SectionLabel = ({ children, style: s }) => (
  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textSec, marginBottom: 6, ...s }}>{children}</div>
);

/* ─── Inline editable field ─── */
function EditableField({ value, onSave, placeholder = "Click to add...", multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{ fontSize: 13, color: value ? C.text : "#bbb", cursor: "pointer", padding: "1px 0", borderBottom: "1px dashed transparent", transition: "border-color 0.15s", lineHeight: 1.5 }}
        onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = C.border}
        onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = "transparent"}
      >
        {value || placeholder}
      </div>
    );
  }
  const Tag = multiline ? "textarea" : "input";
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <Tag
        autoFocus value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !multiline) save(); if (e.key === "Escape") cancel(); }}
        onBlur={save}
        rows={multiline ? 3 : undefined}
        style={{ flex: 1, fontSize: 13, padding: "4px 8px", border: `1.5px solid ${C.brand}`, borderRadius: 5, fontFamily: "inherit", background: "#fff", color: C.text, resize: multiline ? "vertical" : "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

/* ─── Pre-filled Event Details from creation form ─── */
const PREFILLED_EVENT = {
  name: "Meridian Capital Partners — Q2 Executive Dinner",
  type: "Executive Dinner",
  date: "March 18, 2026",
  time: "6:30 PM – 10:00 PM",
  location: "The NoMad Restaurant, Private Dining Room, New York, NY",
  capacity: "20",
  host: "Meridian Capital Partners",
  description: "An intimate dinner for senior decision-makers in private equity, venture capital, and institutional investing.",
  dressCode: "",
  image: "",  // empty = no image uploaded yet
};

function EventImageUpload({ image, onImageChange }) {
  const [hover, setHover] = useState(false);

  // Generate a placeholder gradient based on event name
  const placeholderBg = `linear-gradient(135deg, ${C.brandLight} 0%, #E8D5CC 50%, ${C.brandLight} 100%)`;

  return (
    <div
      onClick={() => {
        // Simulate picking an image — toggle between placeholder and a "uploaded" state
        onImageChange(image ? "" : "uploaded");
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 88, height: 88, borderRadius: 10, flexShrink: 0,
        background: image ? C.brandDark : placeholderBg,
        border: `1px solid ${image ? C.brand + "44" : C.border}`,
        cursor: "pointer", position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}
    >
      {image ? (
        /* Simulated uploaded image — show initials as placeholder visual */
        <>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: -1, opacity: 0.9 }}>MC</div>
          {hover && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 11, fontWeight: 600,
            }}>
              Change
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: hover ? C.brand : C.textSec, transition: "color 0.15s" }}>
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="16" height="16" rx="2" />
            <circle cx="7" cy="7" r="1.5" />
            <path d="M18 13l-4-4-8 8" />
          </svg>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.02em" }}>Add image</span>
        </div>
      )}
    </div>
  );
}

function EventDetailsCard({ eventData, setEventData }) {
  const upd = (key, val) => setEventData((p) => ({ ...p, [key]: val }));

  const fields = [
    { icon: I.Calendar(), label: "Date", key: "date", ph: "Event date" },
    { icon: <span style={{ fontSize: 13 }}>🕡</span>, label: "Time", key: "time", ph: "Start – End time" },
    { icon: I.MapPin(), label: "Location", key: "location", ph: "Venue and address" },
    { icon: I.Users(), label: "Capacity", key: "capacity", ph: "Number of guests" },
    { icon: I.Building(), label: "Host", key: "host", ph: "Hosting company" },
    { icon: <span style={{ fontSize: 13 }}>👔</span>, label: "Dress Code", key: "dressCode", ph: "Click to add..." },
  ];

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <SectionLabel style={{ marginBottom: 0 }}>Event Details</SectionLabel>
        <Badge color={C.accent} bg={C.accentLight}>From event setup</Badge>
      </div>

      {/* Top row: Image + Name/Type */}
      <div style={{ display: "flex", gap: 14, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
        <EventImageUpload image={eventData.image} onImageChange={(v) => upd("image", v)} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Event Name</div>
          <EditableField value={eventData.name} onSave={(v) => upd("name", v)} placeholder="Event name" />
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Type</div>
            <EditableField value={eventData.type} onSave={(v) => upd("type", v)} placeholder="e.g. Executive Dinner, Conference" />
          </div>
        </div>
      </div>

      {/* Grid fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {fields.map((f) => (
          <div key={f.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: C.textSec, marginTop: 3, flexShrink: 0 }}>{f.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{f.label}</div>
              <EditableField value={eventData[f.key]} onSave={(v) => upd(f.key, v)} placeholder={f.ph} />
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Description</div>
        <EditableField value={eventData.description} onSave={(v) => upd("description", v)} placeholder="Describe the event..." multiline />
      </div>
    </div>
  );
}

/* ─── ACTIVITY ITEM types ─── */
// types: "reading", "extracted", "researching", "found", "insight", "suggestion", "complete", "waiting", "user", "speaker_card"
function ActivityItem({ item, isLatest }) {
  const iconMap = {
    reading: { icon: <I.Eye />, color: C.brand, label: "Reading" },
    extracted: { icon: <I.Check />, color: C.accent, label: "Extracted" },
    researching: { icon: <I.Search />, color: "#6B5CE7", label: "Researching" },
    found: { icon: <I.Zap />, color: "#D4A017", label: "Found" },
    insight: { icon: <I.Lightbulb />, color: C.brand, label: "Insight" },
    suggestion: { icon: <I.Sparkle />, color: C.brand, label: "Suggestion" },
    complete: { icon: <I.Check />, color: C.accent, label: "Done" },
    waiting: { icon: <I.Sparkle />, color: C.textSec, label: "" },
    user: { icon: <I.Users />, color: C.text, label: "You" },
    speaker_card: { icon: <I.Users />, color: "#6B5CE7", label: "Speaker Candidates" },
  };

  const meta = iconMap[item.type] || iconMap.insight;
  const isActive = item.type === "reading" || item.type === "researching";

  return (
    <div style={{
      display: "flex", gap: 12, padding: "12px 0",
      opacity: isLatest ? 1 : 0.85,
      transition: "opacity 0.3s",
    }}>
      {/* Timeline dot + line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: item.type === "user" ? C.border : item.type === "complete" ? C.accentLight : item.type === "suggestion" ? C.brandLight : item.type === "speaker_card" ? "#EDE8FF" : "#F5F3F0",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: meta.color,
          animation: isActive && isLatest ? "pulse 1.5s infinite" : "none",
        }}>
          {isActive && isLatest ? <I.Loader /> : meta.icon}
        </div>
        <div style={{ width: 2, flex: 1, background: C.border, marginTop: 4 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
        {/* User message bubble */}
        {item.type === "user" ? (
          <div style={{
            background: C.text, color: "#fff", padding: "10px 14px", borderRadius: "12px 12px 12px 4px",
            fontSize: 14, lineHeight: 1.6, maxWidth: "95%",
          }}>
            {item.text}
          </div>
        ) : (
          <>
            {meta.label && (
              <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 3 }}>
                {meta.label}
              </div>
            )}
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{item.text}</div>
          </>
        )}

        {/* Speaker cards — rich profile cards */}
        {item.speakers && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {item.speakers.map((sp, si) => (
              <SpeakerCard key={si} speaker={sp} rank={si + 1} />
            ))}
          </div>
        )}

        {/* Rich content blocks */}
        {item.details && (
          <div style={{ marginTop: 8, padding: "10px 12px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            {item.details.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: i < item.details.length - 1 ? 6 : 0 }}>
                <span style={{ color: C.brand, flexShrink: 0, marginTop: 2 }}>•</span>
                <span>{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons on suggestions */}
        {item.actions && (
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {item.actions.map((a, i) => (
              <button key={i} style={{
                fontSize: 13, fontWeight: 600, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                background: a.primary ? C.brand : "transparent",
                color: a.primary ? "#fff" : C.brand,
                border: a.primary ? "none" : `1px solid ${C.brand}44`,
              }}>
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {item.time && (
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{item.time}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Speaker profile card ─── */
function SpeakerCard({ speaker, rank }) {
  const [expanded, setExpanded] = useState(false);
  const relevanceColor = speaker.relevance >= 95 ? C.accent : speaker.relevance >= 90 ? "#2D6A4F" : speaker.relevance >= 85 ? C.warn : C.textSec;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: C.card, border: `1px solid ${rank === 1 ? C.brand + "55" : C.border}`,
        borderRadius: 10, padding: 14, cursor: "pointer",
        transition: "all 0.15s",
        boxShadow: rank === 1 ? `0 0 0 1px ${C.brand}22` : "none",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {/* Avatar */}
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: rank === 1 ? C.brand : rank === 2 ? C.accent : rank === 3 ? "#6B5CE7" : C.textSec,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 14, fontWeight: 700,
          }}>
            {speaker.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
              {speaker.name}
              {rank === 1 && <Badge color={C.brand} bg={C.brandLight} style={{ fontSize: 10 }}>Top Pick</Badge>}
            </div>
            <div style={{ fontSize: 12, color: C.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{speaker.title}</div>
          </div>
        </div>
        {/* Relevance score */}
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: relevanceColor, lineHeight: 1 }}>{speaker.relevance}</div>
          <div style={{ fontSize: 9, color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Match</div>
        </div>
      </div>

      {/* Quick info — always visible */}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: C.accentLight, color: C.accent, fontWeight: 500 }}>{speaker.events.split(",")[0]}</span>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#EDE8FF", color: "#6B5CE7", fontWeight: 500 }}>{speaker.speaking.split(",")[0]}</span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Past Events</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{speaker.events}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Speaking Experience</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{speaker.speaking}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Why They Fit</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{speaker.fit}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Relationship</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{speaker.relationship}</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", background: C.brand, color: "#fff", border: "none" }}>
              Draft outreach
            </button>
            <button style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: C.brand, border: `1px solid ${C.brand}44` }}>
              Add to guest list
            </button>
            <button style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: C.textSec, border: `1px solid ${C.border}` }}>
              View full profile
            </button>
          </div>
        </div>
      )}

      {/* Expand hint */}
      {!expanded && (
        <div style={{ fontSize: 11, color: C.textSec, marginTop: 6, fontStyle: "italic" }}>Click to see full profile and outreach options</div>
      )}
    </div>
  );
}

/* ─── ACTIVITY SEQUENCES (simulated AI work) ─── */
const ACTIVITY_AFTER_UPLOAD = [
  { type: "reading", text: "Reading Q2_Executive_Dinner_Brief.pdf...", delay: 0 },
  { type: "extracted", text: "Extracted event details from dinner brief", delay: 2200,
    details: [
      "Event: Meridian Capital Partners Q2 Executive Dinner",
      "Date: March 18, 2026 · 6:30 PM – 10:00 PM",
      "Venue: The NoMad Restaurant, Private Dining Room, NYC",
      "Format: Seated dinner for 20 guests",
      "Host: Meridian Capital Partners · Co-sponsor: Goldman Sachs Private Wealth",
    ],
  },
  { type: "reading", text: "Reading Meridian_Fund_IV_Overview.docx...", delay: 3800 },
  { type: "extracted", text: "Identified strategic context from Fund IV overview", delay: 5500,
    details: [
      "Fund III ($1.2B) fully deployed — Fund IV launch expected Q3 2026",
      "Strategy shift: increased focus on healthcare services and climate tech",
      "Target Fund IV size: $1.8B–$2.0B",
      "Key LP relationships to re-engage identified in the document",
    ],
  },
  { type: "researching", text: "Searching for events happening around March 18 in NYC...", delay: 7000 },
  { type: "found", text: "Discovered relevant market context", delay: 9000,
    details: [
      "NYC Private Equity Week runs March 16–20, 2026",
      "Institutional Investor PE Summit — March 17–18 at The Plaza",
      "KKR hosting LP dinner on March 17 at Le Bernardin",
      "Apollo Global hosting investor reception March 18 at The Grill",
    ],
  },
  { type: "insight", text: "Your dinner overlaps with Apollo's reception on the same evening. Target guests may need to choose between the two. Consider starting your cocktails earlier (6:00 PM) or emphasising the intimate dinner format vs. Apollo's larger reception.",
    delay: 10500,
    actions: [
      { label: "Adjust start time to 6:00 PM", primary: false },
      { label: "Note for invitation messaging", primary: true },
    ],
  },
  { type: "researching", text: "Researching Goldman Sachs Private Wealth Management...", delay: 12000 },
  { type: "found", text: "Goldman Sachs PWM co-sponsor intelligence", delay: 14000,
    details: [
      "GS PWM manages $1.1T in client assets — largest US wealth manager",
      "Client network skews family offices, endowments, and UHNW individuals",
      "Recent push into alternatives allocation for private clients",
      "Key NYC contacts: Managing Directors in the Alternatives Group",
    ],
  },
  { type: "insight", text: "The Goldman co-sponsorship is a strong signal. Their client base aligns with your Fund IV LP targets — family offices and endowments. I can search for Goldman PWM contacts in your people database who should be at this dinner.",
    delay: 15500,
    actions: [
      { label: "Search people database", primary: true },
      { label: "Skip for now", primary: false },
    ],
  },
  { type: "reading", text: "Reading Guest_Wishlist_V2.xlsx...", delay: 17000 },
  { type: "extracted", text: "Processed guest wishlist spreadsheet", delay: 19000,
    details: [
      "47 contacts identified with relationship notes",
      "12 marked as 'Must invite' — Fund III anchor LPs",
      "18 new prospects tagged for Fund IV outreach",
      "17 warm leads with existing Meridian relationship",
    ],
  },
  { type: "suggestion", text: "I've built a rich context for this event. Here's what I can do next:", delay: 20500,
    details: [
      "Import all 47 wishlist contacts into Guest Intelligence and score them against objectives",
      "Draft invitation messaging that positions your dinner against the Apollo reception",
      "Research the 18 new prospects to enrich their profiles before scoring",
      "Generate a pre-event briefing based on everything I've learned",
    ],
    actions: [
      { label: "Import & score contacts", primary: true },
      { label: "Go to Objectives", primary: false },
    ],
  },
];

const ACTIVITY_INITIAL = [
  { type: "waiting", text: "Drop documents, add links, or share any information about your event. I'll analyse everything and build a rich context that powers all my recommendations — guest scoring, invitations, briefings, and more.", delay: 0 },
];

/* ─── Collapsible section wrapper ─── */
function CollapsibleSection({ title, icon, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          background: "none", border: "none", cursor: "pointer", padding: "6px 0",
          fontFamily: "inherit",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={C.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}>
          <path d="M4 2l4 4-4 4" />
        </svg>
        {icon && <span style={{ color: C.textSec, display: "flex", alignItems: "center" }}>{icon}</span>}
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textSec }}>{title}</span>
        {badge && badge}
      </button>
      {open && <div style={{ paddingTop: 6 }}>{children}</div>}
    </div>
  );
}

/* ─── LEFT PANEL: Upload + Context ─── */
function LeftPanel({ documents, setDocuments, links, setLinks, contextData, onGenerate, isGenerating, isGenerated, eventData, setEventData }) {
  const [dragOver, setDragOver] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  const fakeUpload = (name, size, type) => {
    setDocuments((p) => [...p, { name, size, type, status: "queued" }]);
  };

  const handleDropZone = () => {
    if (documents.length === 0) {
      fakeUpload("Q2_Executive_Dinner_Brief.pdf", "2.4 MB", "pdf");
      setTimeout(() => fakeUpload("Meridian_Fund_IV_Overview.docx", "890 KB", "docx"), 300);
      setTimeout(() => fakeUpload("Guest_Wishlist_V2.xlsx", "340 KB", "xlsx"), 600);
    } else {
      fakeUpload("Additional_Document.pdf", "1.1 MB", "pdf");
    }
  };

  const addLink = () => {
    if (!newUrl.trim()) return;
    const url = newUrl.startsWith("http") ? newUrl : "https://" + newUrl;
    let label;
    try { label = new URL(url).hostname; } catch { label = url; }
    setLinks((p) => [...p, { url, label }]);
    setNewUrl(""); setShowLinkInput(false);
  };

  const fileColor = (t) => t === "pdf" ? "#C0392B" : t === "xlsx" ? "#217346" : "#2B71C0";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 12px 24px", flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Event Context</h2>
        <p style={{ fontSize: 13, color: C.textSec, margin: "4px 0 0" }}>
          Add documents, links, and information. The more context, the smarter the AI.
        </p>
      </div>

      {/* Single scrollable area — Generated Context first, then Event Details & Docs */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 16px 24px" }}>

        {/* ═══ GENERATED CONTEXT — top priority, always visible ═══ */}
        {isGenerated ? (
          <GeneratedContext data={contextData} />
        ) : (
          <div style={{ textAlign: "center", padding: "28px 20px", color: C.textSec, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
            <div style={{ marginBottom: 6, color: C.brand }}>{I.Sparkle(22)}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Generated context will appear here</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Upload documents and let the AI analyse your event.</div>
          </div>
        )}

        {/* ═══ EVENT DETAILS — collapsible, editable ═══ */}
        <CollapsibleSection
          title="Event Details"
          icon={I.Calendar()}
          badge={<Badge color={C.accent} bg={C.accentLight} style={{ fontSize: 10, padding: "1px 7px" }}>Editable</Badge>}
          defaultOpen={!isGenerated}
        >
          <EventDetailsCard eventData={eventData} setEventData={setEventData} />
        </CollapsibleSection>

        {/* ═══ DOCUMENTS — collapsible ═══ */}
        <CollapsibleSection
          title="Documents"
          icon={I.File(15)}
          badge={documents.length > 0 ? <span style={{ fontSize: 10, fontWeight: 700, background: C.accentLight, color: C.accent, padding: "1px 7px", borderRadius: 10 }}>{documents.length}</span> : null}
          defaultOpen={!isGenerated}
        >
          {/* Upload zone */}
          <div
            onClick={handleDropZone}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleDropZone(); }}
            style={{
              border: `2px dashed ${dragOver ? C.brand : C.border}`,
              borderRadius: 10, padding: "18px 16px", textAlign: "center",
              cursor: "pointer", background: dragOver ? C.brandLight : C.bg,
              transition: "all 0.15s", marginBottom: 10,
            }}
          >
            <div style={{ color: dragOver ? C.brand : C.textSec, marginBottom: 4, display: "flex", justifyContent: "center" }}>{I.Upload()}</div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
              Drop files here or <span style={{ color: C.brand, fontWeight: 600 }}>browse</span>
            </div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>Event briefs, sponsor decks, guest lists, agendas</div>
          </div>

          {/* Uploaded files */}
          {documents.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {documents.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: fileColor(d.type) }}>{I.File()}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: C.textSec }}>{d.size}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {d.status === "analyzed" ? (
                      <Badge color={C.accent} bg={C.accentLight}>{I.Check(12)} Analyzed</Badge>
                    ) : d.status === "analyzing" ? (
                      <Badge color={C.brand} bg={C.brandLight}>{I.Loader()} Reading...</Badge>
                    ) : (
                      <Badge color={C.textSec} bg="#F0EDEA">Queued</Badge>
                    )}
                    <button onClick={() => setDocuments((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}>{I.Trash()}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* ═══ LINKS — collapsible ═══ */}
        <CollapsibleSection
          title="Links & References"
          icon={I.Globe()}
          badge={links.length > 0 ? <span style={{ fontSize: 10, fontWeight: 700, background: C.accentLight, color: C.accent, padding: "1px 7px", borderRadius: 10 }}>{links.length}</span> : null}
          defaultOpen={!isGenerated}
        >
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: links.length || showLinkInput ? 8 : 0 }}>
              <button onClick={() => setShowLinkInput(true)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.brand, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                {I.Plus(14)} Add
              </button>
            </div>
            {links.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 6 }}>
                <span style={{ color: C.brand }}>{I.Globe()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.brand, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</div>
                  <div style={{ fontSize: 11, color: C.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.url}</div>
                </div>
                <button onClick={() => setLinks((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}>{I.Trash(13)}</button>
              </div>
            ))}
            {showLinkInput && (
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <input autoFocus value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLink()} placeholder="Paste a URL..." style={{ flex: 1, fontSize: 13, padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "inherit" }} />
                <button onClick={addLink} style={{ fontSize: 12, padding: "7px 14px", border: "none", borderRadius: 6, background: C.brand, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Add</button>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Generate button — fixed at bottom */}
      {documents.length > 0 && (
        <div style={{ padding: "12px 20px 16px 24px", borderTop: `1px solid ${C.border}`, background: "#fff", flexShrink: 0 }}>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            style={{
              width: "100%", padding: "12px 20px", fontSize: 15, fontWeight: 700,
              background: isGenerating ? "#E8E2DA" : C.brand, color: isGenerating ? C.textSec : "#fff",
              border: "none", borderRadius: 10, cursor: isGenerating ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit", transition: "all 0.2s",
            }}
          >
            {isGenerating ? (
              <>{I.Loader()} Analysing documents...</>
            ) : isGenerated ? (
              <>{I.Sparkle()} Re-generate Context</>
            ) : (
              <>{I.Sparkle()} Generate Context</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Generated context cards ─── */
function GeneratedContext({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
      {/* Sponsors */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
        <SectionLabel>Sponsors</SectionLabel>
        {[
          { name: "Meridian Capital Partners", role: "Host", tier: "Primary" },
          { name: "Goldman Sachs Private Wealth", role: "Co-sponsor", tier: "Gold" },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: C.bg, borderRadius: 6, marginBottom: i === 0 ? 6 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {I.Building()}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.textSec }}>{s.role}</div>
              </div>
            </div>
            <Badge color={s.tier === "Primary" ? C.brandDark : "#7B6D2E"} bg={s.tier === "Primary" ? C.brandLight : "#FFF8E1"}>{s.tier}</Badge>
          </div>
        ))}
      </div>

      {/* Strategic significance */}
      <div style={{ background: C.brandLight, border: `1px solid ${C.brand}33`, borderRadius: 10, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ color: C.brand }}>{I.Sparkle()}</span>
          <SectionLabel style={{ marginBottom: 0, color: C.brand }}>Strategic Significance</SectionLabel>
        </div>
        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>
          Pre-marketing touchpoint ahead of Fund IV launch (Q3 2026). Fund III ($1.2B) fully deployed.
          Goal: re-engage anchor LPs and cultivate new institutional relationships. Goldman co-sponsorship
          adds credibility with family offices and endowments.
        </p>
      </div>

      {/* Market context */}
      <div style={{ background: C.warnLight, border: `1px solid ${C.warn}33`, borderRadius: 10, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ color: C.warn }}>{I.Zap()}</span>
          <SectionLabel style={{ marginBottom: 0, color: "#8B6914" }}>Market Context</SectionLabel>
          <Badge color="#8B6914" bg="#FFF0C0">AI Researched</Badge>
        </div>
        <p style={{ fontSize: 13, color: "#5D4A0B", lineHeight: 1.6, margin: 0 }}>
          During NYC PE Week (March 16–20). Target attendees already in town.
          Competing: Apollo reception same evening, KKR dinner March 17, II PE Summit.
        </p>
      </div>

      {/* Completeness */}
      <CompletenessCard />
    </div>
  );
}

function CompletenessCard() {
  const items = [
    { label: "Event basics", done: true },
    { label: "Date & venue", done: true },
    { label: "Strategic purpose", done: true },
    { label: "Sponsors identified", done: true },
    { label: "Documents analysed", done: true },
    { label: "Market context", done: true },
    { label: "Dress code", done: false },
    { label: "Evening agenda / flow", done: false },
    { label: "Dietary requirements", done: false },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <SectionLabel style={{ marginBottom: 0 }}>Context Completeness</SectionLabel>
        <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 60 ? C.accent : C.warn }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: "#EEEAE5", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: C.accent, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {items.map((it, i) => (
          <span key={i} style={{
            fontSize: 12, padding: "3px 10px", borderRadius: 4,
            background: it.done ? C.accentLight : "#F5F2EE",
            color: it.done ? C.accent : "#aaa",
            fontWeight: it.done ? 600 : 400,
          }}>
            {it.done && "✓ "}{it.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── RIGHT PANEL: AI Activity Feed ─── */
function RightPanel({ activities, inputMsg, setInputMsg, onSend, shouldAutoScroll }) {
  const bottomRef = useRef(null);
  const feedRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Only auto-scroll when new activities arrive from user interaction, not on initial load
  useEffect(() => {
    if (!userScrolled && shouldAutoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activities, shouldAutoScroll]);

  // Detect if user has scrolled up
  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setUserScrolled(!isNearBottom);
  };

  // Scroll-to-bottom button when user has scrolled up
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUserScrolled(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.activityBg }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.brandLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: C.brand }}>{I.Sparkle(14)}</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Moots Intelligence</div>
            <div style={{ fontSize: 11, color: C.accent, fontWeight: 500 }}>Active · Watching for context</div>
          </div>
        </div>
      </div>

      {/* Activity feed — fully scrollable */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div
          ref={feedRef}
          onScroll={handleScroll}
          style={{ height: "100%", overflowY: "auto", padding: "16px 20px 8px" }}
        >
          {activities.map((item, i) => (
            <ActivityItem key={i} item={item} isLatest={i === activities.length - 1} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Scroll-to-bottom indicator */}
        {userScrolled && (
          <button
            onClick={scrollToBottom}
            style={{
              position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
              background: C.brand, color: "#fff", border: "none", borderRadius: 20,
              padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 5,
              fontFamily: "inherit",
            }}
          >
            ↓ Latest activity
          </button>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: "10px 20px 16px", borderTop: `1px solid ${C.border}`, background: "#fff" }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 5px 5px 14px", border: `1.5px solid ${C.border}`, borderRadius: 12, background: C.bg, transition: "border-color 0.15s" }}
        >
          <input
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="Ask Moots to research, look up sponsors, find competing events..."
            style={{ flex: 1, fontSize: 13, border: "none", background: "transparent", outline: "none", fontFamily: "inherit", color: C.text }}
          />
          <button onClick={onSend} disabled={!inputMsg.trim()} style={{
            width: 36, height: 36, borderRadius: 9, border: "none",
            background: inputMsg.trim() ? C.brand : "#E0DBD4", color: "#fff",
            cursor: inputMsg.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>{I.Send()}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── TAB HEADER ─── */
function TabHeader() {
  const tabs = ["Overview", "Context", "Objectives", "Guest Intelligence", "Campaigns", "Briefings", "Check-in & Seating", "Follow-Up", "Analytics"];
  return (
    <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "0 24px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0 0" }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>Meridian Capital Partners — Q2 Executive Dinner</h1>
        <Badge>Event #86</Badge>
      </div>
      <div style={{ display: "flex", gap: 0, marginTop: 10, overflowX: "auto" }}>
        {tabs.map((t) => (
          <button key={t} style={{
            fontSize: 13, fontWeight: t === "Context" ? 700 : 500,
            color: t === "Context" ? C.brand : C.textSec,
            background: "none", border: "none",
            borderBottom: t === "Context" ? `2px solid ${C.brand}` : "2px solid transparent",
            padding: "8px 14px", cursor: "pointer", whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>
    </div>
  );
}

/* ─── Pre-populated state (user has already added context) ─── */
const POPULATED_DOCS = [
  { name: "Q2_Executive_Dinner_Brief.pdf", size: "2.4 MB", type: "pdf", status: "analyzed" },
  { name: "Meridian_Fund_IV_Overview.docx", size: "890 KB", type: "docx", status: "analyzed" },
  { name: "Guest_Wishlist_V2.xlsx", size: "340 KB", type: "xlsx", status: "analyzed" },
  { name: "NoMad_Private_Dining_Menu.pdf", size: "1.1 MB", type: "pdf", status: "analyzed" },
];

const POPULATED_LINKS = [
  { url: "https://meridiancapital.com/q2-dinner", label: "meridiancapital.com" },
  { url: "https://nycpeweek.com/schedule", label: "nycpeweek.com" },
  { url: "https://linkedin.com/company/meridian-capital-partners", label: "linkedin.com" },
];

const POPULATED_ACTIVITIES = [
  { type: "extracted", text: "Extracted event details from dinner brief",
    details: [
      "Event: Meridian Capital Partners Q2 Executive Dinner",
      "Date: March 18, 2026 · 6:30 PM – 10:00 PM",
      "Venue: The NoMad Restaurant, Private Dining Room, NYC",
      "Format: Seated dinner for 20 guests",
      "Host: Meridian Capital Partners · Co-sponsor: Goldman Sachs Private Wealth",
    ],
    time: "12 min ago",
  },
  { type: "extracted", text: "Identified strategic context from Fund IV overview",
    details: [
      "Fund III ($1.2B) fully deployed — Fund IV launch expected Q3 2026",
      "Strategy shift: increased focus on healthcare services and climate tech",
      "Target Fund IV size: $1.8B–$2.0B",
      "Key LP relationships to re-engage identified in the document",
    ],
    time: "11 min ago",
  },
  { type: "found", text: "Discovered relevant market context",
    details: [
      "NYC Private Equity Week runs March 16–20, 2026",
      "Institutional Investor PE Summit — March 17–18 at The Plaza",
      "KKR hosting LP dinner on March 17 at Le Bernardin",
      "Apollo Global hosting investor reception March 18 at The Grill",
    ],
    time: "10 min ago",
  },
  { type: "insight", text: "Your dinner overlaps with Apollo's reception on the same evening. Target guests may need to choose between the two. Consider starting your cocktails earlier (6:00 PM) or emphasising the intimate dinner format vs. Apollo's larger reception.",
    time: "9 min ago",
  },
  { type: "found", text: "Goldman Sachs PWM co-sponsor intelligence",
    details: [
      "GS PWM manages $1.1T in client assets — largest US wealth manager",
      "Client network skews family offices, endowments, and UHNW individuals",
      "Recent push into alternatives allocation for private clients",
      "Key NYC contacts: Managing Directors in the Alternatives Group",
    ],
    time: "8 min ago",
  },
  { type: "extracted", text: "Processed guest wishlist spreadsheet",
    details: [
      "47 contacts identified with relationship notes",
      "12 marked as 'Must invite' — Fund III anchor LPs",
      "18 new prospects tagged for Fund IV outreach",
      "17 warm leads with existing Meridian relationship",
    ],
    time: "7 min ago",
  },
  { type: "extracted", text: "Analysed NoMad private dining menu",
    details: [
      "4-course prix fixe with wine pairing available",
      "Vegetarian and gluten-free options standard",
      "Chef's tasting menu option for groups of 16+",
      "Minimum spend: $12,000 for private dining room",
    ],
    time: "5 min ago",
  },
  { type: "insight", text: "Based on the 47-person wishlist, 12 'must invite' anchor LPs, and the 20-seat capacity — you'll need to be selective. I'd recommend prioritising the 12 anchor LPs plus 8 high-potential new prospects. Want me to score and rank them on the Objectives tab?",
    time: "4 min ago",
    actions: [
      { label: "Score & rank contacts", primary: true },
      { label: "Go to Objectives", primary: false },
    ],
  },
  { type: "suggestion", text: "Here's what I can help with next:",
    details: [
      "Import all 47 wishlist contacts and score them against your objectives",
      "Draft invitation messaging that positions your dinner against the Apollo reception",
      "Research the 18 new Fund IV prospects to enrich their profiles",
      "Generate a seating strategy based on relationship dynamics",
      "Create a pre-event briefing for the host team",
    ],
    time: "3 min ago",
    actions: [
      { label: "Import & score contacts", primary: true },
      { label: "Draft invitations", primary: false },
    ],
  },
  /* ─── Brainstorming: Speaker search ─── */
  { type: "user", text: "We need a keynote speaker for the dinner — someone who's attended our past events and has credibility in PE or alternatives. Can you find good candidates from our past guest lists?", time: "2 min ago" },
  { type: "researching", text: "Searching across 6 past Meridian events for guests with speaking experience and PE/alternatives expertise...", time: "2 min ago" },
  { type: "found", text: "Identified 4 strong speaker candidates from your past events",
    time: "1 min ago",
    details: [
      "Cross-referenced 312 past attendees across 6 Meridian events",
      "Filtered for: PE/alternatives expertise, prior speaking engagements, attended 2+ events",
      "Scored by relevance to Fund IV themes (healthcare services, climate tech)",
    ],
  },
  { type: "speaker_card", text: "Top speaker candidates",
    time: "1 min ago",
    speakers: [
      {
        name: "Dr. Sarah Chen",
        title: "Managing Partner, Evergreen Health Ventures",
        relevance: 97,
        events: "Attended Q4 2025 LP Dinner, Q1 2025 Annual Meeting",
        speaking: "Keynote at JP Morgan Healthcare Conference 2026, TEDx speaker on healthtech investing",
        fit: "Deep expertise in healthcare services PE — directly aligned with Fund IV thesis. Strong LP network through Evergreen's co-investment platform.",
        relationship: "Warm — sat next to James (Meridian CEO) at Q4 dinner",
      },
      {
        name: "Marcus Rivera",
        title: "CIO, Caldwell Family Office ($3.2B AUM)",
        relevance: 92,
        events: "Attended 3 Meridian events (2024–2025), Fund III anchor LP",
        speaking: "Panelist at Milken Institute 2025, Institutional Investor Allocators Summit",
        fit: "Respected allocator voice. Speaking on 'The LP Perspective on Next-Gen PE' would resonate with the room. Fund III anchor LP — natural advocate.",
        relationship: "Strong — Fund III $50M commitment, regular co-investment partner",
      },
      {
        name: "Anika Patel",
        title: "Partner & Head of Climate Investments, BlackRock Alternatives",
        relevance: 88,
        events: "Attended Q2 2025 Executive Dinner",
        speaking: "Speaker at COP30 Finance Day, Bloomberg New Energy Summit, SuperReturn 2025",
        fit: "Leading voice in climate tech investing — validates Meridian's Fund IV climate thesis. BlackRock relationship could open co-investment deal flow.",
        relationship: "Developing — met at Q2 dinner, follow-up meeting scheduled",
      },
      {
        name: "Thomas Kirchner",
        title: "Senior MD, Goldman Sachs Private Wealth Management",
        relevance: 85,
        events: "Attended Q4 2025 LP Dinner, co-sponsor representative",
        speaking: "Internal keynotes, Goldman Sachs Alternatives Conference 2025",
        fit: "Natural choice given Goldman co-sponsorship. Can speak on 'What Family Offices Want from Next-Gen PE Managers.' Less external speaking profile.",
        relationship: "Strong — Goldman co-sponsorship lead, frequent touchpoint",
      },
    ],
  },
  { type: "insight", text: "My top recommendation is Dr. Sarah Chen. Her healthcare services focus maps perfectly to Fund IV's thesis, she has a strong public speaking profile, and the personal relationship with James makes the ask easy. Marcus Rivera is the safest bet — he's a proven allocator voice and Fund III anchor LP who can credibly endorse Meridian.",
    time: "just now",
    actions: [
      { label: "Draft outreach to Dr. Chen", primary: true },
      { label: "Draft outreach to Marcus", primary: false },
      { label: "Compare all 4 side-by-side", primary: false },
    ],
  },
];

/* ─── MAIN APP ─── */
export default function App() {
  const [documents, setDocuments] = useState([]);
  const [links, setLinks] = useState([]);
  const [activities, setActivities] = useState(ACTIVITY_INITIAL);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [eventData, setEventData] = useState({ ...PREFILLED_EVENT, image: "uploaded" });
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const timeoutsRef = useRef([]);

  const clearTimeouts = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };

  const handleGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setShouldAutoScroll(true);
    setActivities([]);

    // Update doc statuses progressively
    const docNames = documents.map((d) => d.name);
    let analyzingIdx = 0;
    const markAnalyzing = (idx) => {
      setDocuments((p) => p.map((d, i) => i === idx ? { ...d, status: "analyzing" } : d));
    };
    const markAnalyzed = (idx) => {
      setDocuments((p) => p.map((d, i) => i === idx ? { ...d, status: "analyzed" } : d));
    };

    // Queue activity items
    ACTIVITY_AFTER_UPLOAD.forEach((item, i) => {
      const t = setTimeout(() => {
        setActivities((p) => [...p, item]);

        // Sync doc statuses with activity
        if (item.type === "reading" && item.text.includes("Brief")) { markAnalyzing(0); }
        if (item.type === "extracted" && item.text.includes("event details")) { markAnalyzed(0); markAnalyzing(1); }
        if (item.type === "reading" && item.text.includes("Fund_IV")) { markAnalyzing(1); }
        if (item.type === "extracted" && item.text.includes("strategic")) { markAnalyzed(1); }
        if (item.type === "reading" && item.text.includes("Wishlist")) { markAnalyzing(2); }
        if (item.type === "extracted" && item.text.includes("wishlist")) { markAnalyzed(2); }

        // End of sequence
        if (i === ACTIVITY_AFTER_UPLOAD.length - 1) {
          setIsGenerating(false);
          setIsGenerated(true);
          // Mark all remaining docs as analyzed
          setDocuments((p) => p.map((d) => ({ ...d, status: "analyzed" })));
        }
      }, item.delay);
      timeoutsRef.current.push(t);
    });
  };

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    const msg = inputMsg.trim();
    setInputMsg("");
    setShouldAutoScroll(true);

    // Add user message as an activity
    setActivities((p) => [...p, { type: "user", text: msg }]);

    // Simulate AI response based on keywords
    const lower = msg.toLowerCase();
    setTimeout(() => {
      if (lower.includes("speaker") || lower.includes("keynote") || lower.includes("past guest") || lower.includes("past event")) {
        setActivities((p) => [...p, { type: "researching", text: "Searching across 6 past Meridian events for guests with speaking experience and PE/alternatives expertise..." }]);
        setTimeout(() => {
          setActivities((p) => [...p, {
            type: "found", text: "Identified 4 strong speaker candidates from your past events",
            details: [
              "Cross-referenced 312 past attendees across 6 Meridian events",
              "Filtered for: PE/alternatives expertise, prior speaking engagements, attended 2+ events",
              "Scored by relevance to Fund IV themes (healthcare services, climate tech)",
            ],
          }]);
        }, 2000);
        setTimeout(() => {
          setActivities((p) => [...p, {
            type: "speaker_card", text: "Top speaker candidates",
            speakers: [
              {
                name: "Dr. Sarah Chen",
                title: "Managing Partner, Evergreen Health Ventures",
                relevance: 97,
                events: "Attended Q4 2025 LP Dinner, Q1 2025 Annual Meeting",
                speaking: "Keynote at JP Morgan Healthcare Conference 2026, TEDx speaker on healthtech investing",
                fit: "Deep expertise in healthcare services PE — directly aligned with Fund IV thesis. Strong LP network through Evergreen's co-investment platform.",
                relationship: "Warm — sat next to James (Meridian CEO) at Q4 dinner",
              },
              {
                name: "Marcus Rivera",
                title: "CIO, Caldwell Family Office ($3.2B AUM)",
                relevance: 92,
                events: "Attended 3 Meridian events (2024–2025), Fund III anchor LP",
                speaking: "Panelist at Milken Institute 2025, Institutional Investor Allocators Summit",
                fit: "Respected allocator voice. Speaking on 'The LP Perspective on Next-Gen PE' would resonate with the room.",
                relationship: "Strong — Fund III $50M commitment, regular co-investment partner",
              },
            ],
          }]);
        }, 4000);
        setTimeout(() => {
          setActivities((p) => [...p, {
            type: "insight", text: "My top recommendation is Dr. Sarah Chen — her healthcare focus maps perfectly to Fund IV's thesis and she has a strong public speaking profile. Marcus Rivera is the safest bet as a Fund III anchor LP who can credibly endorse Meridian.",
            actions: [
              { label: "Draft outreach to Dr. Chen", primary: true },
              { label: "Draft outreach to Marcus", primary: false },
              { label: "See 2 more candidates", primary: false },
            ],
          }]);
        }, 5500);
      } else if (lower.includes("sponsor") || lower.includes("search") || lower.includes("find")) {
        setActivities((p) => [...p, { type: "researching", text: "Searching for potential sponsors in the alternative investments space..." }]);
        setTimeout(() => {
          setActivities((p) => [...p, {
            type: "found", text: "Found 5 potential co-sponsors with active PE event sponsorship programs",
            details: [
              "J.P. Morgan Private Bank — sponsored 3 PE dinners in NYC this quarter",
              "Morgan Stanley Alternatives — active LP events program",
              "Blackstone Portfolio Operations — co-sponsored Institutional Investor events",
              "Citadel Securities — expanding PE relationship marketing",
              "Ares Management — hosted 2 LP dinners in Q1 2026",
            ],
            actions: [
              { label: "Add to sponsor shortlist", primary: true },
              { label: "Research further", primary: false },
            ],
          }]);
        }, 2500);
      } else if (lower.includes("dress") || lower.includes("attire")) {
        setActivities((p) => [...p, {
          type: "insight", text: "I'll add dress code to the event context. For executive dinners at The NoMad, 'Business formal — dark attire preferred' is standard. I'll include this in invitation confirmations and pre-event briefings.",
          actions: [{ label: "Add to context", primary: true }],
        }]);
      } else if (lower.includes("agenda") || lower.includes("schedule") || lower.includes("flow")) {
        setActivities((p) => [...p, {
          type: "suggestion", text: "For a 20-person executive dinner, here's a typical evening flow I'd recommend:",
          details: [
            "6:30–7:15 PM — Cocktail reception (introductions, light conversation)",
            "7:15–7:30 PM — Welcome remarks from Meridian + Goldman hosts",
            "7:30–9:00 PM — Seated dinner (structured table conversations)",
            "9:00–9:30 PM — Dessert + open networking",
            "9:30–10:00 PM — Wind-down, key follow-ups identified",
          ],
          actions: [
            { label: "Use this agenda", primary: true },
            { label: "Modify", primary: false },
          ],
        }]);
      } else {
        setActivities((p) => [...p, {
          type: "insight", text: `Noted — I've added that to the event context. This will influence how I score guests, draft invitations, and prepare briefings for this event.`,
        }]);
      }
    }, 1500);
  };

  useEffect(() => () => clearTimeouts(), []);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: C.bg, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        * { box-sizing: border-box; }
        textarea:focus, input:focus { outline: none; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d0c9c0; border-radius: 3px; }
      `}</style>

      <TabHeader />

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}>
        {/* Left: Upload + Context */}
        <div style={{ borderRight: `1px solid ${C.border}`, overflow: "hidden" }}>
          <LeftPanel
            documents={documents} setDocuments={setDocuments}
            links={links} setLinks={setLinks}
            contextData={{}} onGenerate={handleGenerate}
            isGenerating={isGenerating} isGenerated={isGenerated}
            eventData={eventData} setEventData={setEventData}
          />
        </div>

        {/* Right: AI Activity Feed */}
        <RightPanel
          activities={activities}
          inputMsg={inputMsg} setInputMsg={setInputMsg}
          onSend={handleSend}
          shouldAutoScroll={shouldAutoScroll}
        />
      </div>
    </div>
  );
}
