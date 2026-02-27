import React, { useState, useEffect, useRef } from "react";

const C = {
  terracotta: "#B8755E",
  gold: "#CBB674",
  forest: "#2F4F3F",
  cream: "#FAF9F7",
  white: "#FFFFFF",
  charcoal: "#1C1C1E",
  secondary: "#555555",
  tertiary: "#8E8E93",
  border: "#E5E5EA",
};

const noiseBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

const icons = {
  search: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="14" r="9" />
      <line x1="20.5" y1="20.5" x2="28" y2="28" />
      <line x1="10" y1="14" x2="18" y2="14" />
      <line x1="14" y1="10" x2="14" y2="18" />
    </svg>
  ),
  clock: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="12" />
      <polyline points="16,8 16,16 22,19" />
    </svg>
  ),
  chart: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="18" width="5" height="10" rx="1" />
      <rect x="13.5" y="10" width="5" height="18" rx="1" />
      <rect x="23" y="4" width="5" height="24" rx="1" />
    </svg>
  ),
  dinner: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="18" cy="24" rx="13" ry="5" />
      <path d="M10 12c0-4 3.5-7 8-7s8 3 8 7" />
      <line x1="18" y1="5" x2="18" y2="3" />
      <circle cx="18" cy="2" r="1" fill={C.terracotta} stroke="none" />
    </svg>
  ),
  house: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16L18 5l14 11" />
      <rect x="7" y="16" width="22" height="16" rx="1" />
      <rect x="14" y="22" width="8" height="10" rx="1" />
      <line x1="14" y1="12" x2="22" y2="12" />
    </svg>
  ),
  retreat: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 32L14 10l8 22" />
      <path d="M10 32l10-16 12 16" />
      <circle cx="28" cy="8" r="3" />
    </svg>
  ),
};

function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, style = {} }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PrimaryBtn({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.terracotta,
        color: C.white,
        border: "none",
        height: 56,
        padding: "0 36px",
        borderRadius: 28,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        fontSize: 16,
        cursor: "pointer",
        boxShadow: "0 8px 20px rgba(184,117,94,0.25)",
        letterSpacing: "0.3px",
        transition: "transform 0.2s, box-shadow 0.2s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 28px rgba(184,117,94,0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(184,117,94,0.25)";
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        color: C.terracotta,
        border: `2px solid ${C.terracotta}`,
        height: 56,
        padding: "0 36px",
        borderRadius: 28,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        fontSize: 16,
        cursor: "pointer",
        transition: "background 0.2s, color 0.2s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = C.terracotta;
        e.currentTarget.style.color = C.white;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = C.terracotta;
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style = {}, noisy = false }) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {noisy && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: noiseBg,
            backgroundRepeat: "repeat",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function Label({ children }) {
  return (
    <p
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        color: C.tertiary,
        margin: "0 0 12px",
      }}
    >
      {children}
    </p>
  );
}

function SectionH2({ children, style = {} }) {
  return (
    <h2
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 28,
        fontWeight: 700,
        color: C.charcoal,
        margin: 0,
        lineHeight: 1.3,
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

/* ================================================================
   NAV
   ================================================================ */
function NavLink({ label, href, children, comingSoon }) {
  const [hover, setHover] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const timerRef = useRef(null);
  const hasSub = !!children;
  const openDrop = () => { clearTimeout(timerRef.current); setDropOpen(true); };
  const closeDrop = () => { timerRef.current = setTimeout(() => setDropOpen(false), 180); };
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setDropOpen(false); };

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => { setHover(true); if (hasSub) openDrop(); }}
      onMouseLeave={() => { setHover(false); if (hasSub) closeDrop(); }}
    >
      <button
        onClick={() => { if (!comingSoon && href) scrollTo(href); }}
        style={{
          background: "none", border: "none", cursor: comingSoon ? "default" : "pointer",
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
          color: comingSoon ? C.tertiary : (hover ? C.terracotta : C.charcoal),
          padding: "8px 0", display: "flex", alignItems: "center", gap: 4,
          transition: "color 0.2s", whiteSpace: "nowrap",
        }}
      >
        {label}
        {comingSoon && (
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.5px", textTransform: "uppercase",
            color: C.terracotta, background: "rgba(184,117,94,0.08)",
            padding: "2px 6px", borderRadius: 4, marginLeft: 4,
          }}>Soon</span>
        )}
        {hasSub && (
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s", transform: dropOpen ? "rotate(180deg)" : "rotate(0)" }}>
            <path d="M1 1l4 4 4-4" />
          </svg>
        )}
      </button>
      {hasSub && dropOpen && (
        <div
          onMouseEnter={openDrop}
          onMouseLeave={closeDrop}
          style={{
            position: "absolute", top: "100%", left: -12, minWidth: 200,
            background: C.white, borderRadius: 12, padding: "8px 0",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.05)",
            border: `1px solid ${C.border}`,
            animation: "navDropIn 0.18s ease",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropItem({ label, href }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => document.getElementById(href)?.scrollIntoView({ behavior: "smooth" })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block", width: "100%", textAlign: "left",
        background: hover ? C.cream : "transparent",
        border: "none", cursor: "pointer", padding: "10px 20px",
        fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
        color: hover ? C.terracotta : C.charcoal, transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

const CALENDLY_URL = "https://calendly.com/moots/demo";

/* ================================================================
   LOGIN / ACCESS REQUEST MODAL
   ================================================================ */
function LoginModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(28,28,30,0.6)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.white, borderRadius: 24, padding: "48px 40px",
          maxWidth: 440, width: "100%", position: "relative",
          boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: C.tertiary, lineHeight: 1,
          }}
          aria-label="Close"
        >
          ×
        </button>

        {!submitted ? (
          <>
            <span style={{
              fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700,
              color: C.charcoal, display: "block", marginBottom: 8,
            }}>
              Sign in to Moots
            </span>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: C.secondary,
              lineHeight: 1.55, margin: "0 0 28px",
            }}>
              Enter your work email. If you have an active Moots account, a secure
              login link will be sent to your inbox. If you're not yet on the platform,
              our team will reach out to schedule a demo.
            </p>
            <label style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
              letterSpacing: "1px", textTransform: "uppercase", color: C.tertiary,
              display: "block", marginBottom: 8,
            }}>
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{
                width: "100%", height: 48, padding: "0 16px",
                borderRadius: 12, border: `1px solid ${C.border}`,
                fontFamily: "'DM Sans', sans-serif", fontSize: 15,
                color: C.charcoal, outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.terracotta)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
            {error && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#c0392b", margin: "12px 0 0" }}>
                {error}
              </p>
            )}
            <PrimaryBtn
              onClick={handleSubmit}
              style={{ width: "100%", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Sending…" : "Continue"}
            </PrimaryBtn>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.tertiary,
              textAlign: "center", marginTop: 16, marginBottom: 0,
            }}>
              Or{" "}
              <span
                onClick={() => window.open(CALENDLY_URL, "_blank")}
                style={{ color: C.terracotta, fontWeight: 600, cursor: "pointer" }}
              >
                book a demo call
              </span>
              {" "}to see the platform first.
            </p>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(184,117,94,0.1)", margin: "0 auto 20px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.terracotta} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6,14 12,20 22,8" />
              </svg>
            </div>
            <span style={{
              fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700,
              color: C.charcoal, display: "block", marginBottom: 8,
            }}>
              We'll be in touch
            </span>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: C.secondary,
              lineHeight: 1.55, margin: 0,
            }}>
              If <strong style={{ color: C.charcoal }}>{email}</strong> has an active
              account, a secure login link is on its way. If you're not yet on the
              platform, our team will reach out to schedule a demo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Nav({ onPilotClick, onLoginClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const mobileScrollTo = (id) => {
    setMobileOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  const navLinks = [
    { label: "How It Works", href: "how-it-works" },
    {
      label: "Host Dashboard",
      href: "platform",
      sub: [
        { label: "Platform Preview", href: "platform" },
        { label: "Post-Event Follow-Up", href: "follow-up" },
        { label: "ROI & Metrics", href: "roi" },
        { label: "Use Cases", href: "use-cases" },
      ],
    },
    { label: "Guest Experience App", href: "moots-app" },
    { label: "FAQ", href: "faq" },
    { label: "Blog", href: "blog", comingSoon: true },
  ];

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(24px, 5vw, 80px)",
          background: scrolled || mobileOpen ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(120%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(120%)" : "none",
          borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
          transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            color: C.charcoal,
            cursor: "pointer",
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Moots
        </span>

        {/* Desktop nav links */}
        <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {navLinks.map((link) => (
            <NavLink key={link.label} label={link.label} href={link.href} comingSoon={link.comingSoon}>
              {link.sub && link.sub.map((s) => (
                <DropItem key={s.href} label={s.label} href={s.href} />
              ))}
            </NavLink>
          ))}
        </div>

        {/* Desktop right buttons */}
        <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onLoginClick}
            style={{
              background: "transparent",
              color: C.charcoal,
              border: "none",
              height: 44,
              padding: "0 20px",
              borderRadius: 22,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.terracotta)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.charcoal)}
          >
            Log In
          </button>
          <PrimaryBtn onClick={onPilotClick} style={{ height: 44, fontSize: 14, padding: "0 24px" }}>
            Request Private Pilot
          </PrimaryBtn>
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: "none",
            background: "none", border: "none", cursor: "pointer",
            width: 44, height: 44,
            alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: mobileOpen ? 0 : 5,
            padding: 8,
          }}
          aria-label="Menu"
        >
          <span style={{
            display: "block", width: 22, height: 2, background: C.charcoal, borderRadius: 1,
            transition: "all 0.3s",
            transform: mobileOpen ? "rotate(45deg) translateY(0)" : "none",
            transformOrigin: "center",
          }} />
          <span style={{
            display: "block", width: 22, height: 2, background: C.charcoal, borderRadius: 1,
            transition: "all 0.3s",
            opacity: mobileOpen ? 0 : 1,
          }} />
          <span style={{
            display: "block", width: 22, height: 2, background: C.charcoal, borderRadius: 1,
            transition: "all 0.3s",
            transform: mobileOpen ? "rotate(-45deg) translateY(0)" : "none",
            transformOrigin: "center",
            marginTop: mobileOpen ? -6 : 0,
          }} />
        </button>
      </nav>

      {/* Mobile slide-down menu */}
      <div
        className="nav-mobile-menu"
        style={{
          position: "fixed",
          top: 72,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99,
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          transform: mobileOpen ? "translateY(0)" : "translateY(-110%)",
          opacity: mobileOpen ? 1 : 0,
          transition: "transform 0.35s ease, opacity 0.3s ease",
          padding: "32px clamp(24px, 5vw, 80px)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {navLinks.map((link) => (
          <div key={link.label} style={{ borderBottom: `1px solid ${C.border}` }}>
            <button
              onClick={() => {
                if (link.comingSoon) return;
                if (link.sub) {
                  setMobileExpanded(mobileExpanded === link.label ? null : link.label);
                } else {
                  mobileScrollTo(link.href);
                }
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", background: "none", border: "none",
                cursor: link.comingSoon ? "default" : "pointer",
                padding: "20px 0",
                fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 600,
                color: link.comingSoon ? C.tertiary : C.charcoal,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {link.label}
                {link.comingSoon && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase",
                    color: C.terracotta, background: "rgba(184,117,94,0.08)",
                    padding: "2px 8px", borderRadius: 4,
                  }}>Soon</span>
                )}
              </span>
              {link.sub && (
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke={C.tertiary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.3s", transform: mobileExpanded === link.label ? "rotate(180deg)" : "rotate(0)" }}>
                  <path d="M1 1l5 5 5-5" />
                </svg>
              )}
            </button>
            {link.sub && (
              <div style={{
                maxHeight: mobileExpanded === link.label ? 300 : 0,
                overflow: "hidden",
                transition: "max-height 0.35s ease",
              }}>
                {link.sub.map((s) => (
                  <button
                    key={s.href}
                    onClick={() => mobileScrollTo(s.href)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: "none", border: "none", cursor: "pointer",
                      padding: "12px 0 12px 20px",
                      fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 500,
                      color: C.secondary,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          <PrimaryBtn onClick={() => { setMobileOpen(false); onPilotClick(); }} style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center" }}>
            Request Private Pilot
          </PrimaryBtn>
          <button
            onClick={() => { setMobileOpen(false); onLoginClick(); }}
            style={{
              background: "transparent",
              color: C.charcoal,
              border: `2px solid ${C.border}`,
              height: 56,
              borderRadius: 28,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Log In
          </button>
        </div>
      </div>
    </>
  );
}

/* ================================================================
   HERO
   ================================================================ */
function HeroAnimation() {
  /*
   * Peripheral animation: rings and dots positioned around the EDGES
   * of the hero section, leaving the center clear for text readability.
   * Elements cluster in corners and along margins only.
   */

  /* Dots along edges and corners only — clear center zone */
  const dots = [
    /* Top-left cluster */
    { cx: 45, cy: 60, r: 3, selected: true, delay: 0 },
    { cx: 80, cy: 35, r: 2, selected: false, delay: 1.2 },
    { cx: 25, cy: 110, r: 2.5, selected: false, delay: 0.6 },
    { cx: 110, cy: 80, r: 2, selected: true, delay: 1.8 },
    /* Top-right cluster */
    { cx: 955, cy: 50, r: 3, selected: true, delay: 0.4 },
    { cx: 920, cy: 85, r: 2, selected: false, delay: 1.0 },
    { cx: 980, cy: 100, r: 2.5, selected: false, delay: 2.0 },
    /* Bottom-left cluster */
    { cx: 40, cy: 540, r: 3, selected: true, delay: 0.8 },
    { cx: 75, cy: 580, r: 2, selected: false, delay: 1.6 },
    { cx: 110, cy: 520, r: 2, selected: false, delay: 2.4 },
    /* Bottom-right cluster */
    { cx: 960, cy: 560, r: 2.5, selected: true, delay: 1.4 },
    { cx: 930, cy: 530, r: 2, selected: false, delay: 0.3 },
    { cx: 985, cy: 510, r: 2, selected: false, delay: 2.1 },
    /* Scattered edge accents (left/right margins only) */
    { cx: 30, cy: 300, r: 2, selected: false, delay: 0.9 },
    { cx: 975, cy: 320, r: 2, selected: false, delay: 1.7 },
  ];

  /* Connections between nearby dots within the same corner cluster */
  const connections = [
    [0, 3], [0, 2], [1, 3],       /* top-left */
    [4, 5], [5, 6],               /* top-right */
    [7, 8], [7, 9],               /* bottom-left */
    [10, 11], [11, 12],           /* bottom-right */
  ];

  return (
    <svg
      className="hero-animation"
      viewBox="0 0 1000 620"
      fill="none"
      preserveAspectRatio="none"
      style={{
        position: "absolute", top: 0, left: 0,
        width: "100%", height: "100%",
        pointerEvents: "none", overflow: "hidden",
      }}
    >
      {/* Breathing ring — top-left corner (partially clipped) */}
      <circle className="hero-ring hero-ring-1" cx="0" cy="0" r="180"
        stroke={C.terracotta} strokeWidth="0.8" fill="none" />
      <circle className="hero-ring hero-ring-2" cx="0" cy="0" r="280"
        stroke={C.terracotta} strokeWidth="0.5" fill="none" />

      {/* Breathing ring — bottom-right corner (partially clipped) */}
      <circle className="hero-ring hero-ring-3" cx="1000" cy="620" r="200"
        stroke={C.terracotta} strokeWidth="0.8" fill="none" />
      <circle className="hero-ring hero-ring-1" cx="1000" cy="620" r="320"
        stroke={C.terracotta} strokeWidth="0.5" fill="none" style={{ animationDelay: "3s" }} />

      {/* Faint arc — top-right area */}
      <circle className="hero-ring hero-ring-2" cx="1000" cy="0" r="160"
        stroke={C.terracotta} strokeWidth="0.4" fill="none" style={{ animationDelay: "1.5s" }} />

      {/* Connection lines between corner-cluster dots */}
      {connections.map(([a, b], i) => (
        <line key={`line-${i}`}
          className="hero-connection"
          x1={dots[a].cx} y1={dots[a].cy}
          x2={dots[b].cx} y2={dots[b].cy}
          stroke={C.terracotta}
          strokeWidth="0.5"
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      ))}

      {/* Dots — all in peripheral zones */}
      {dots.map((d, i) => (
        <g key={`dot-${i}`}>
          {d.selected && (
            <circle
              className="hero-dot-glow"
              cx={d.cx} cy={d.cy} r={d.r * 4}
              fill={C.terracotta}
              style={{ animationDelay: `${d.delay}s` }}
            />
          )}
          <circle
            className={d.selected ? "hero-dot-selected" : "hero-dot-muted"}
            cx={d.cx} cy={d.cy} r={d.r}
            fill={d.selected ? C.terracotta : C.border}
            style={{ animationDelay: `${d.delay}s` }}
          />
        </g>
      ))}
    </svg>
  );
}

function Hero({ onPilotClick, onLearnClick }) {
  return (
    <section
      style={{
        background: C.cream,
        backgroundImage: noiseBg,
        backgroundRepeat: "repeat",
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px clamp(24px, 5vw, 80px) 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <HeroAnimation />

      <div style={{ maxWidth: 780, textAlign: "center", position: "relative", zIndex: 2 }}>
        <Reveal>
          <Label>Guest Intelligence for Corporate Events</Label>
        </Reveal>
        <Reveal delay={0.1}>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(36px, 5vw, 52px)",
              fontWeight: 700,
              color: C.charcoal,
              lineHeight: 1.25,
              margin: "0 0 24px",
            }}
          >
            Vet the Room Before the Event.
            <br />
            Convert the Room After.
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 20,
              lineHeight: 1.65,
              color: C.secondary,
              maxWidth: 740,
              margin: "0 auto 40px",
            }}
          >
            Your team spends weeks vetting guest lists and chasing follow-ups.
            Moots does both in hours, so every event drives real revenue.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <PrimaryBtn onClick={onPilotClick}>Request Private Pilot</PrimaryBtn>
            <SecondaryBtn onClick={onLearnClick}>See How It Works</SecondaryBtn>
          </div>
        </Reveal>
        <Reveal delay={0.45}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: C.tertiary,
              marginTop: 28,
            }}
          >
            Trusted by corporate event teams, PR agencies, financial institutions, and advisory firms.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================
   THE PROBLEM
   ================================================================ */
function ProblemSection() {
  const problems = [
    {
      icon: icons.search,
      title: "Hours Lost Vetting Contacts",
      desc: "Your team copy-pastes each name from your RSVP list into WealthX, LinkedIn, Apollo, one by one. Whether it's 200 names or 3,500, what should take minutes takes a dedicated full-time hire.",
    },
    {
      icon: icons.clock,
      title: "Follow-Up Gets Buried",
      desc: "Your team is on to the next thing by Monday. Follow-up gets delayed for weeks while everyone handles competing priorities, and by then, the warmth of every conversation has gone cold.",
    },
    {
      icon: icons.chart,
      title: "No Framework for ROI",
      desc: "Leadership scrutinizes every dollar. Without clear metrics tying guest interactions to pipeline outcomes, justifying the next event becomes a battle.",
    },
  ];
  return (
    <section style={{ background: C.white, padding: "100px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <Reveal>
          <Label>The Challenge</Label>
          <SectionH2 style={{ marginBottom: 48 }}>
            High-Value Events Deserve Better Intelligence
          </SectionH2>
        </Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 28,
          }}
        >
          {problems.map((p, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <Card style={{ padding: 32, height: "100%", border: `1px solid ${C.border}` }}>
                <div style={{ marginBottom: 16 }}>{p.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: C.charcoal, margin: "0 0 12px" }}>
                  {p.title}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.6, color: C.secondary, margin: 0 }}>
                  {p.desc}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   THREE STEPS
   ================================================================ */
function StepsSection() {
  const steps = [
    {
      num: "01",
      title: "Import & Enrich",
      desc: "Upload your attendee list, RSVP contacts, CRM exports, or curated candidate names. Whether you're reviewing 200 profiles or 3,500, Moots enriches each one across dozens of intelligence sources in seconds, not hours.",
      detail: "CRM sync · CSV upload · Past event import · Manual entry",
    },
    {
      num: "02",
      title: "Score, Brief & Approve",
      desc: "Set your event objectives and let AI score every guest against what matters to your team. Build approval decks for leadership sign-off, then send invitations directly from the platform.",
      detail: "Objective-based scoring · Approval decks · Invite management",
    },
    {
      num: "03",
      title: "Connect at the Event",
      desc: "Each team member receives a personalized briefing packet: who they should meet, what to discuss, and shared connections to reference. Your team walks in prepared for every conversation.",
      detail: "Host briefing packets · Per-rep conversation guides · Talking points",
    },
    {
      num: "04",
      title: "Follow Up & Track Outcomes",
      desc: "Automated follow-up sequences go out within hours while the conversation is still warm. Every interaction syncs to your CRM. A post-event ROI report ties each guest to pipeline outcomes for leadership.",
      detail: "Automated follow-up · CRM sync · Post-event ROI report · Pipeline tracking",
    },
  ];
  return (
    <section
      id="how-it-works"
      style={{ background: C.cream, padding: "100px clamp(24px, 5vw, 80px)" }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Label>How It Works</Label>
            <SectionH2>From Names to Conversions in Four Steps</SectionH2>
          </div>
        </Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
            gap: 28,
          }}
        >
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <Card style={{ padding: 36, height: "100%" }} noisy>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: C.terracotta, opacity: 0.25, display: "block", marginBottom: 8 }}>
                  {s.num}
                </span>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: C.charcoal, margin: "0 0 12px" }}>
                  {s.title}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.6, color: C.secondary, margin: "0 0 20px" }}>
                  {s.desc}
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.secondary, letterSpacing: "0.3px", margin: 0, opacity: 0.7 }}>
                  {s.detail}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.5}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            marginTop: 40, padding: "18px 28px", background: C.white,
            borderRadius: 14, border: `1px solid ${C.border}`,
            maxWidth: 620, margin: "40px auto 0",
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="2" y="4" width="18" height="14" rx="2" />
              <polyline points="2,6 11,13 20,6" />
            </svg>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: C.secondary, margin: 0 }}>
              Already sending invitations with <strong style={{ color: C.charcoal }}>Paperless Post</strong>, <strong style={{ color: C.charcoal }}>Greenvelope</strong>, or <strong style={{ color: C.charcoal }}>Luma</strong>? Connect them to Moots and manage everything from one place.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================
   FORMATS
   ================================================================ */
function FormatsSection() {
  const formats = [
    {
      label: "Curated Rooms",
      size: "Breakfasts · Luncheons · Cocktails · Dinners · Galas · Networking events",
      desc: "Every room you curate is an investment. Know each guest's background, objectives, and ideal conversation starters before the first handshake.",
      icon: icons.dinner,
    },
    {
      label: "Branded Houses",
      size: "Multi-day activations at Cannes Lions, Art Basel, SXSW, Davos",
      desc: "Festival activations with rotating guest programs. Manage a curated guest list across multi-day programming with real-time briefings for your team.",
      icon: icons.house,
    },
    {
      label: "Annual Retreats",
      size: "Client appreciation · Partner programs · Recurring summits",
      desc: "Retreats and partner events where deepening existing relationships is the priority. Track engagement history across years of recurring events.",
      icon: icons.retreat,
    },
  ];
  return (
    <section style={{ background: C.white, padding: "100px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Label>Every Format</Label>
            <SectionH2>Built for Every Corporate Event</SectionH2>
          </div>
        </Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 28,
          }}
        >
          {formats.map((f, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <Card style={{ padding: 32, height: "100%", border: `1px solid ${C.border}` }}>
                <div style={{ marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: C.charcoal, margin: "0 0 4px" }}>
                  {f.label}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.terracotta, fontWeight: 600, margin: "0 0 12px" }}>
                  {f.size}
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.55, color: C.secondary, margin: 0 }}>
                  {f.desc}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   DASHBOARD PREVIEW (now includes objective matching + relationship history)
   ================================================================ */
function DashboardPreview() {
  const [activeTab, setActiveTab] = useState("Objective Match");
  const tabs = ["Objective Match", "Guest Intelligence", "Relationship History", "Post-Event"];

  const [expandedGuest, setExpandedGuest] = useState(0);
  const [activeEvent, setActiveEvent] = useState("media");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  /* ---- Event datasets ---- */
  const events = {
    media: {
      name: "Cannes Lions 2026, The Terrace",
      stats: [
        { label: "Guest Pool Evaluated", value: "2,400" },
        { label: "Qualified for Event", value: "583" },
        { label: "Guests Invited", value: "340" },
        { label: "Avg. Relevance Score", value: "86" },
      ],
      objectives: ["Brand decision-makers, $10M+ media budgets", "Creative agency leads", "Luxury vertical partners"],
      guests: [
        { name: "Rachel Torres", title: "VP Global Media", org: "Unilever", score: 96, tag: "Priority",
          sources: ["LinkedIn", "WealthX", "Salesforce CRM", "Past Events (4)"],
          insights: "Controls $340M digital spend. Shifting 30% to creator platforms in 2026. Board member at IAB. Previously at P&G for 12 years. Attended Davos Dinner 2023, Art Basel 2024.",
          talking: "Ask about her creator platform strategy and whether she's evaluating new measurement partners." },
        { name: "James Liu", title: "Exec. Creative Director", org: "Wieden+Kennedy", score: 91, tag: "High Value",
          sources: ["LinkedIn", "Apollo", "Cannes Lions Archive"],
          insights: "Led 4 Grand Prix campaigns. Key influence on client media allocation at W+K Portland. Recently promoted to global ECD role.",
          talking: "Discuss his perspective on AI in creative production and whether W+K is exploring new platform partnerships." },
        { name: "Sophie Arnault", title: "Head of Digital", org: "LVMH Media", score: 87, tag: "Relationship",
          sources: ["LinkedIn", "WealthX", "Past Events (2)"],
          insights: "Piloting short-form video for 6 LVMH maisons with $80M test budget. Moved from Dior Digital to centralized LVMH Media buying role.",
          talking: "Explore her maison-level digital rollout and whether she's open to branded content collaborations." },
        { name: "Marcus Cole", title: "Chief Investment Officer", org: "GroupM", score: 82, tag: "New Contact",
          sources: ["LinkedIn", "Apollo", "Trade Press"],
          insights: "Previously at Dentsu, now leading $5B+ investment portfolio at GroupM. Evaluating programmatic innovation partners.",
          talking: "Introduce Moots positioning around curated event intelligence for media holding companies." },
      ],
      objectiveGuests: [
        { name: "Rachel Torres", title: "VP Global Media", org: "Unilever", objective: "Brand media budgets $10M+", match: 96, reason: "Controls $340M digital spend, shifting 30% to creator platforms" },
        { name: "James Liu", title: "Exec. Creative Director", org: "Wieden+Kennedy", objective: "Creative agency leads", match: 93, reason: "Led 4 Cannes Grand Prix campaigns, influential in client media allocation" },
        { name: "Sophie Arnault", title: "Head of Digital", org: "LVMH Media", objective: "Luxury vertical expansion", match: 89, reason: "Piloting short-form video for 6 maisons, $80M test budget" },
        { name: "David Park", title: "CMO", org: "Rivian", objective: "Brand media budgets $10M+", match: 84, reason: "Tripled digital ad spend in 2025, evaluating new platform partnerships" },
      ],
      historyGuests: [
        { name: "Rachel Torres", title: "VP Global Media", org: "Unilever", events: 4, first: "Davos Dinner 2023", latest: "Art Basel House 2025", note: "Promoted from Director to VP Global Media since first event. Budget authority grew from $40M to $340M." },
        { name: "Sophie Arnault", title: "Head of Digital", org: "LVMH Media", events: 2, first: "Annual Retreat 2024", latest: "Cannes Lions 2025", note: "Moved from Dior Digital to head LVMH Media centralized buying. Controls budgets for all maisons now." },
        { name: "Marcus Cole", title: "Chief Investment Officer", org: "GroupM", events: 1, first: "SXSW House 2025", latest: "SXSW House 2025", note: "First interaction. Previously at Dentsu (attended competitor events). Now Chief Investment Officer at GroupM." },
      ],
      postEvent: [
        { label: "Follow-up Meetings Booked", val: "47", sub: "Within 48 hours" },
        { label: "Pipeline Generated", val: "$8.7M", sub: "Attributed to event" },
        { label: "Follow-up Emails Sent", val: "319", sub: "Personalized sequences" },
      ],
    },
    wealth: {
      name: "SuperReturn North America 2026, Private Dinner",
      stats: [
        { label: "Guest Pool Evaluated", value: "3,500" },
        { label: "Qualified for Event", value: "127" },
        { label: "Guests Invited", value: "24" },
        { label: "Avg. Relevance Score", value: "91" },
      ],
      objectives: ["Exited founders, $50M+ net worth", "High-income earners, $10M+ ordinary income", "COIs with HNW connections"],
      guests: [
        { name: "Jonathan Reeves", title: "Exited Founder & Chairman", org: "Reeves Capital", score: 97, tag: "Priority",
          sources: ["WealthX", "LinkedIn", "YPO Directory", "Past Events (3)"],
          insights: "Sold SaaS company for $420M in 2024. Net worth estimated $180M. Board member at two family offices. Active philanthropist. Attended Client Retreat 2024, Alabama Dinner 2025.",
          talking: "Ask about his post-exit investment strategy and whether he's looking at multi-family office structures." },
        { name: "Catherine Aldrich", title: "Managing Partner", org: "Aldrich & Webb LLP", score: 92, tag: "COI",
          sources: ["LinkedIn", "Apollo", "Martindale-Hubbell"],
          insights: "Estate planning attorney with 40+ UHNW clients. Referred 3 clients to competing firms last year. Expanding trust & estate practice to include founders.",
          talking: "Discuss her founder-focused estate planning expansion and mutual referral opportunities." },
        { name: "Michael Tan", title: "Founder & CEO", org: "NovaBridge Health", score: 89, tag: "High Value",
          sources: ["WealthX", "LinkedIn", "Crunchbase", "3i Directory"],
          insights: "Running $95M ARR health-tech company. Exploring exit options. Ordinary income estimated $14M. First-generation wealth, no current advisory relationship.",
          talking: "Explore his timeline for a potential exit and whether he has succession planning in place." },
        { name: "Linda Okafor", title: "CPA, Partner", org: "Grant Thornton", score: 81, tag: "COI",
          sources: ["LinkedIn", "Apollo", "AICPA Directory"],
          insights: "Leads the HNW tax practice in the Southeast. Manages 60+ clients with $10M+ income. Previously at Deloitte Private for 15 years.",
          talking: "Discuss referral alignment around exited founders who need both tax strategy and wealth management." },
      ],
      objectiveGuests: [
        { name: "Jonathan Reeves", title: "Exited Founder & Chairman", org: "Reeves Capital", objective: "Exited founders, $50M+", match: 97, reason: "Sold SaaS company for $420M, net worth $180M, active investor" },
        { name: "Michael Tan", title: "Founder & CEO", org: "NovaBridge Health", objective: "High-income earners, $10M+", match: 89, reason: "$95M ARR company, exploring exit, $14M ordinary income" },
        { name: "Catherine Aldrich", title: "Managing Partner", org: "Aldrich & Webb LLP", objective: "COIs with HNW connections", match: 92, reason: "Estate planning attorney, 40+ UHNW clients, expanding founder practice" },
        { name: "Linda Okafor", title: "CPA, Partner", org: "Grant Thornton", objective: "COIs with HNW connections", match: 81, reason: "Leads HNW tax practice, 60+ clients with $10M+ income" },
      ],
      historyGuests: [
        { name: "Jonathan Reeves", title: "Exited Founder & Chairman", org: "Reeves Capital", events: 3, first: "Client Retreat 2024", latest: "Alabama Dinner 2025", note: "Net worth grew from $120M to $180M since first event. Now actively seeking co-investment opportunities." },
        { name: "Catherine Aldrich", title: "Managing Partner", org: "Aldrich & Webb LLP", events: 2, first: "SuperReturn Dinner 2025", latest: "Webinar 2025", note: "Expanded practice to include founder exit planning. Referred one new client since last event." },
        { name: "Michael Tan", title: "Founder & CEO", org: "NovaBridge Health", events: 1, first: "SuperReturn NA 2026", latest: "SuperReturn NA 2026", note: "New contact. Currently evaluating advisory firms. No existing wealth management relationship." },
      ],
      postEvent: [
        { label: "Follow-up Meetings Booked", val: "6", sub: "Within 48 hours" },
        { label: "Pipeline Generated", val: "$4.2M", sub: "Attributed to dinner" },
        { label: "Follow-up Emails Sent", val: "18", sub: "Personalized sequences" },
      ],
    },
  };

  const ev = events[activeEvent];
  const guests = ev.guests;
  const objectiveGuests = ev.objectiveGuests;
  const historyGuests = ev.historyGuests;

  const ScoreBar = ({ score, color }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 6, borderRadius: 3, background: C.border, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", borderRadius: 3, background: color || (score >= 90 ? C.terracotta : score >= 80 ? C.gold : C.forest) }} />
      </div>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: C.charcoal }}>
        {score}
      </span>
    </div>
  );

  const TagBadge = ({ tag }) => {
    const colorMap = { Priority: C.terracotta, "High Value": C.gold, Relationship: C.forest };
    const bgMap = { Priority: "rgba(184,117,94,0.08)", "High Value": "rgba(203,182,116,0.12)", Relationship: "rgba(47,79,63,0.08)" };
    return (
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
        color: colorMap[tag] || C.tertiary,
        background: bgMap[tag] || "rgba(142,142,147,0.08)",
        padding: "4px 10px", borderRadius: 6, display: "inline-block",
      }}>
        {tag}
      </span>
    );
  };

  return (
    <>
      {/* === MOBILE FULLSCREEN OVERLAY === */}
      {mobilePreviewOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: C.cream, overflowY: "auto", WebkitOverflowScrolling: "touch",
        }}>
          {/* Sticky header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            background: C.cream, borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
          }}>
            <div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: C.terracotta }}>
                Platform Preview
              </span>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: C.charcoal, margin: "2px 0 0" }}>
                {ev.name}
              </p>
            </div>
            <button
              onClick={() => setMobilePreviewOpen(false)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: C.white, border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 18, color: C.charcoal, flexShrink: 0,
              }}
            >×</button>
          </div>
          <div style={{ padding: "24px 20px" }}>
            {/* Event selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {[
                { key: "media", label: "Cannes Lions 2026" },
                { key: "wealth", label: "SuperReturn NA 2026" },
              ].map((e) => (
                <button
                  key={e.key}
                  onClick={() => { setActiveEvent(e.key); setExpandedGuest(0); }}
                  style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                    color: activeEvent === e.key ? C.white : C.charcoal,
                    background: activeEvent === e.key ? C.terracotta : C.white,
                    border: `1px solid ${activeEvent === e.key ? C.terracotta : C.border}`,
                    padding: "7px 18px", borderRadius: 20, cursor: "pointer",
                  }}
                >{e.label}</button>
              ))}
            </div>
            {/* Stats 2×2 grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
              {ev.stats.map((s) => (
                <div key={s.label} style={{
                  background: C.white, borderRadius: 12, padding: "16px",
                  border: `1px solid ${C.border}`, textAlign: "center",
                }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: C.charcoal, margin: "0 0 4px" }}>{s.value}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.tertiary, letterSpacing: "1px", textTransform: "uppercase", margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
            {/* AI Guest Intelligence: top 2 guests */}
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: C.tertiary, margin: "0 0 14px" }}>
              AI Guest Intelligence
            </p>
            {guests.slice(0, 2).map((g, i) => {
              const mAvatar = [C.terracotta, C.forest];
              const mInit = g.name.split(" ").map(n => n[0]).join("");
              return (
                <div key={g.name} style={{
                  background: C.white, borderRadius: 14, padding: "20px",
                  border: `1px solid ${C.border}`, marginBottom: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${mAvatar[i]}30, ${mAvatar[i]}60)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: mAvatar[i],
                    }}>{mInit}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: C.charcoal, margin: "0 0 2px" }}>{g.name}</p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.secondary, margin: 0 }}>{g.title} · <span style={{ color: C.forest }}>{g.org}</span></p>
                    </div>
                    <TagBadge tag={g.tag} />
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {g.sources.map(s => (
                      <span key={s} style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                        color: C.forest, background: "rgba(47,79,63,0.08)",
                        padding: "3px 8px", borderRadius: 6,
                      }}>{s}</span>
                    ))}
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.secondary, lineHeight: 1.5, margin: "0 0 10px" }}>{g.insights}</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 13, color: C.secondary, lineHeight: 1.45, margin: 0, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>{g.talking}</p>
                </div>
              );
            })}
            {/* Event objectives */}
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: C.tertiary, margin: "20px 0 12px" }}>
              Event Objectives
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {ev.objectives.map((obj) => (
                <span key={obj} style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                  color: C.charcoal, background: C.white, padding: "6px 14px", borderRadius: 8,
                  border: `1px solid ${C.border}`,
                }}>{obj}</span>
              ))}
            </div>
            {/* Post-event outcomes */}
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: C.tertiary, margin: "0 0 12px" }}>
              Post-Event Outcomes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {ev.postEvent.map((m) => (
                <div key={m.label} style={{
                  background: C.white, borderRadius: 12, padding: "16px 20px",
                  border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: C.charcoal, margin: "0 0 2px" }}>{m.label}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.tertiary, margin: 0 }}>{m.sub}</p>
                  </div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: C.terracotta, margin: 0 }}>{m.val}</p>
                </div>
              ))}
            </div>
            {/* Desktop note */}
            <div style={{
              background: "rgba(184,117,94,0.06)", borderRadius: 12, padding: "16px 20px",
              border: `1px solid rgba(184,117,94,0.15)`, textAlign: "center", marginBottom: 24,
            }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.terracotta, fontWeight: 500, margin: 0 }}>
                Full interactive dashboard — Objective Match, Relationship History, and more — available on desktop.
              </p>
            </div>
          </div>
        </div>
      )}
      <section id="platform" style={{ background: C.cream, padding: "100px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Label>Platform Preview</Label>
            <SectionH2>Collaborative Intelligence, One Shared Workspace</SectionH2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, lineHeight: 1.65, color: C.secondary, maxWidth: 620, margin: "16px auto 0" }}>
              AI agents evaluate and rank guest candidates against your event objectives. Invite PR partners, sponsors, or internal stakeholders to collaborate on the curated list when needed. From RSVP to measurable outcomes, Moots tracks the impact.
            </p>
          </div>
        </Reveal>

        {/* ====== MOBILE TEASER (visible on mobile, hidden on desktop) ====== */}
        <div id="dash-teaser">
          <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { key: "media", label: "Cannes Lions 2026" },
              { key: "wealth", label: "SuperReturn NA 2026" },
            ].map((e) => (
              <button
                key={e.key}
                onClick={() => { setActiveEvent(e.key); setExpandedGuest(0); }}
                style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                  color: activeEvent === e.key ? C.white : C.charcoal,
                  background: activeEvent === e.key ? C.terracotta : C.white,
                  border: `1px solid ${activeEvent === e.key ? C.terracotta : C.border}`,
                  padding: "7px 14px", borderRadius: 20, cursor: "pointer",
                }}
              >{e.label}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {ev.stats.map((s) => (
              <div key={s.label} style={{
                background: C.white, borderRadius: 12, padding: "18px 16px",
                border: `1px solid ${C.border}`, textAlign: "center",
              }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.charcoal, margin: "0 0 4px" }}>{s.value}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.tertiary, letterSpacing: "1px", textTransform: "uppercase", margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 28 }}>
            {["Objective Match", "Guest Intelligence", "Relationship History", "Post-Event Outcomes"].map(tag => (
              <span key={tag} style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                color: C.forest, background: "rgba(47,79,63,0.08)",
                padding: "6px 14px", borderRadius: 20,
                border: `1px solid rgba(47,79,63,0.15)`,
              }}>{tag}</span>
            ))}
          </div>
          <button
            onClick={() => setMobilePreviewOpen(true)}
            style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600,
              color: C.white, background: C.terracotta,
              border: "none", padding: "14px 28px", borderRadius: 28,
              cursor: "pointer", width: "100%",
            }}
          >
            Explore Platform Preview →
          </button>
        </div>

        {/* ====== DESKTOP FULL DASHBOARD (hidden on mobile) ====== */}
        <div id="dash-full">
        <Reveal delay={0.15}>
          <Card
            style={{
              padding: 0,
              overflow: "hidden",
              boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.04)",
            }}
            noisy
          >
            {/* Event selector toggle */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 28px", borderBottom: `1px solid ${C.border}`, background: C.cream,
            }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.tertiary, marginRight: 4 }}>
                View event:
              </span>
              {[
                { key: "media", label: "Branded House — Cannes Lions" },
                { key: "wealth", label: "Satellite Dinner — SuperReturn NA" },
              ].map((e) => (
                <button
                  key={e.key}
                  onClick={() => { setActiveEvent(e.key); setExpandedGuest(0); }}
                  style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                    color: activeEvent === e.key ? C.white : C.charcoal,
                    background: activeEvent === e.key ? C.terracotta : C.white,
                    border: `1px solid ${activeEvent === e.key ? C.terracotta : C.border}`,
                    padding: "7px 18px", borderRadius: 20, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>

            {/* Top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: C.charcoal }}>
                  {ev.name}
                </span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                  letterSpacing: "1.5px", textTransform: "uppercase", color: C.terracotta,
                  background: "rgba(184,117,94,0.08)", padding: "4px 10px", borderRadius: 6,
                }}>
                  Live
                </span>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                {tabs.map((t) => (
                  <span
                    key={t}
                    onClick={() => setActiveTab(t)}
                    style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                      color: t === activeTab ? C.terracotta : C.tertiary,
                      cursor: "pointer",
                      borderBottom: t === activeTab ? `2px solid ${C.terracotta}` : "2px solid transparent",
                      paddingBottom: 2,
                      transition: "color 0.2s, border-color 0.2s",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: C.border }}>
              {ev.stats.map((s) => (
                <div key={s.label} style={{ background: C.white, padding: "20px 24px", textAlign: "center" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: C.charcoal, margin: "0 0 4px" }}>
                    {s.value}
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.tertiary, letterSpacing: "1px", textTransform: "uppercase", margin: 0 }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Tab: Guest Intelligence */}
            {activeTab === "Guest Intelligence" && (
              <div style={{ padding: 28 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 0.4fr", gap: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>
                  {["Guest", "Role & Organization", "Score", "Tag", ""].map((h) => (
                    <span key={h} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: C.tertiary }}>
                      {h}
                    </span>
                  ))}
                </div>
                {guests.map((g, i) => {
                  const avatarColors = [C.terracotta, C.forest, C.gold, "#6B7280"];
                  const initials = g.name.split(" ").map(n => n[0]).join("");
                  return (
                  <div key={g.name}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 0.4fr", gap: 12, padding: "14px 0", borderBottom: expandedGuest === i ? "none" : `1px solid ${C.border}`, alignItems: "center", cursor: "pointer" }}
                      onClick={() => setExpandedGuest(expandedGuest === i ? null : i)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          background: `linear-gradient(135deg, ${avatarColors[i % 4]}30, ${avatarColors[i % 4]}60)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: avatarColors[i % 4],
                        }}>{initials}</div>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: C.charcoal }}>{g.name}</span>
                      </div>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.secondary }}>
                        {g.title} <span style={{ color: C.forest, fontWeight: 500 }}>· {g.org}</span>
                      </span>
                      <ScoreBar score={g.score} />
                      <TagBadge tag={g.tag} />
                      <span style={{
                        fontSize: 16, color: C.tertiary, textAlign: "center",
                        transform: expandedGuest === i ? "rotate(180deg)" : "rotate(0)",
                        transition: "transform 0.25s ease",
                      }}>▾</span>
                    </div>
                    {/* Expanded profile */}
                    <div style={{
                      maxHeight: expandedGuest === i ? 300 : 0, overflow: "hidden",
                      transition: "max-height 0.35s ease",
                    }}>
                      <div style={{
                        background: C.cream, borderRadius: 12, padding: "20px 24px", marginBottom: 14,
                        border: `1px solid ${C.border}`,
                      }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                          {g.sources.map((s) => (
                            <span key={s} style={{
                              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                              color: C.forest, background: "rgba(47,79,63,0.08)",
                              padding: "3px 10px", borderRadius: 6,
                            }}>{s}</span>
                          ))}
                        </div>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: C.charcoal, margin: "0 0 6px" }}>
                          AI-Generated Insights
                        </p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.secondary, lineHeight: 1.5, margin: "0 0 14px" }}>
                          {g.insights}
                        </p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: C.charcoal, margin: "0 0 6px" }}>
                          Suggested Talking Points
                        </p>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 14, color: C.secondary, lineHeight: 1.5, margin: 0 }}>
                          {g.talking}
                        </p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* Tab: Objective Match */}
            {activeTab === "Objective Match" && (
              <div style={{ padding: 28 }}>
                {/* Step flow: Define → Score → Act */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
                  {[
                    { step: "1", label: "Define Goals", desc: "Set event objectives and target criteria" },
                    { step: "2", label: "AI Scores Guests", desc: "Every guest candidate ranked against your goals" },
                    { step: "3", label: "Curate & Approve", desc: "Invite waves, seating, introductions" },
                  ].map((s) => (
                    <div key={s.step} style={{
                      background: C.cream, borderRadius: 12, padding: "20px 20px", border: `1px solid ${C.border}`,
                      textAlign: "center",
                    }}>
                      <span style={{
                        fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700,
                        color: C.terracotta, opacity: 0.35, display: "block", marginBottom: 6,
                      }}>{s.step}</span>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: C.charcoal, margin: "0 0 6px", lineHeight: 1.3 }}>{s.label}</p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.secondary, margin: 0, lineHeight: 1.45 }}>{s.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Objective prompt */}
                <div style={{
                  background: C.cream, borderRadius: 12, padding: "16px 20px", marginBottom: 20,
                  border: `1px solid ${C.border}`,
                }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: C.tertiary, margin: "0 0 8px" }}>
                    Event Objectives
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {ev.objectives.map((obj) => (
                      <span key={obj} style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                        color: C.charcoal, background: C.white, padding: "6px 14px", borderRadius: 8,
                        border: `1px solid ${C.border}`,
                      }}>{obj}</span>
                    ))}
                  </div>
                </div>

                {/* Scored guest table */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.7fr 3fr", gap: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>
                  {["Guest", "Matched Objective", "Score", "Why They Match"].map((h) => (
                    <span key={h} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: C.tertiary }}>
                      {h}
                    </span>
                  ))}
                </div>
                {objectiveGuests.map((g, oi) => {
                  const oAvatarColors = [C.terracotta, C.forest, C.gold, "#6B7280"];
                  const oInitials = g.name.split(" ").map(n => n[0]).join("");
                  return (
                  <div key={g.name} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.7fr 3fr", gap: 12, padding: "14px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                        background: `linear-gradient(135deg, ${oAvatarColors[oi % 4]}30, ${oAvatarColors[oi % 4]}60)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: oAvatarColors[oi % 4],
                      }}>{oInitials}</div>
                      <div>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: C.charcoal, display: "block" }}>{g.name}</span>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.secondary }}>{g.title} · <span style={{ color: C.forest, fontWeight: 500 }}>{g.org}</span></span>
                      </div>
                    </div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.forest, fontWeight: 500 }}>{g.objective}</span>
                    <ScoreBar score={g.match} color={C.terracotta} />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.secondary, lineHeight: 1.45 }}>{g.reason}</span>
                  </div>
                  );
                })}

                {/* Downstream impact cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 24 }}>
                  {[
                    { icon: "→", label: "Invite Waves", desc: "Priority guests invited first" },
                    { icon: "⬡", label: "Table Assignments", desc: "Seating optimized by objective" },
                    { icon: "↔", label: "Introductions", desc: "Suggested pairings for hosts" },
                    { icon: "↩", label: "Follow-Up Prompts", desc: "Post-event actions per guest" },
                  ].map((d) => (
                    <div key={d.label} style={{
                      background: C.cream, borderRadius: 10, padding: "14px 12px", textAlign: "center",
                      border: `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontSize: 16, color: C.terracotta, display: "block", marginBottom: 6 }}>{d.icon}</span>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: C.charcoal, margin: "0 0 3px" }}>{d.label}</p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.secondary, margin: 0 }}>{d.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Approval Deck CTA */}
                <div style={{
                  marginTop: 16, background: C.cream, borderRadius: 12, padding: "20px 24px",
                  border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="18" height="16" rx="2" />
                      <line x1="2" y1="8" x2="20" y2="8" />
                      <rect x="5" y="11" width="5" height="3" rx="0.5" />
                      <line x1="13" y1="12" x2="17" y2="12" />
                      <line x1="13" y1="15" x2="16" y2="15" />
                    </svg>
                    <div>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: C.charcoal, margin: "0 0 2px" }}>
                        Approval Deck Ready
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.tertiary, margin: 0 }}>
                        Share with leadership for stakeholder sign-off
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                    color: C.white, background: C.terracotta, padding: "8px 16px", borderRadius: 20,
                    cursor: "pointer",
                  }}>
                    Export Deck
                  </span>
                </div>
              </div>
            )}

            {/* Tab: Relationship History */}
            {activeTab === "Relationship History" && (
              <div style={{ padding: 28 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.5fr 0.5fr 1.1fr 1.1fr 3fr", gap: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>
                  {["Guest", "Events", "First Seen", "Most Recent", "What Changed"].map((h) => (
                    <span key={h} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: C.tertiary }}>
                      {h}
                    </span>
                  ))}
                </div>
                {historyGuests.map((g, hi) => {
                  const hColors = [C.terracotta, C.gold, "#6B7280"];
                  const hInit = g.name.split(" ").map(n => n[0]).join("");
                  return (
                  <div key={g.name} style={{ display: "grid", gridTemplateColumns: "2.5fr 0.5fr 1.1fr 1.1fr 3fr", gap: 12, padding: "14px 0", borderBottom: `1px solid ${C.border}`, alignItems: "start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                        background: `linear-gradient(135deg, ${hColors[hi % 3]}30, ${hColors[hi % 3]}60)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: hColors[hi % 3],
                      }}>{hInit}</div>
                      <div>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: C.charcoal, display: "block" }}>{g.name}</span>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.secondary }}>{g.title} · <span style={{ color: C.forest, fontWeight: 500 }}>{g.org}</span></span>
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: C.terracotta,
                      background: "rgba(184,117,94,0.08)", borderRadius: 8, textAlign: "center", padding: "2px 0",
                    }}>{g.events}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.secondary }}>{g.first}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.secondary }}>{g.latest}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.secondary, lineHeight: 1.45 }}>{g.note}</span>
                  </div>
                  );
                })}
              </div>
            )}

            {/* Tab: Post-Event */}
            {activeTab === "Post-Event" && (
              <div style={{ padding: 28 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
                  {ev.postEvent.map((m) => (
                    <div key={m.label} style={{ background: C.cream, borderRadius: 12, padding: "20px 24px", textAlign: "center" }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: C.terracotta, margin: "0 0 4px" }}>{m.val}</p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: C.charcoal, margin: "0 0 2px" }}>{m.label}</p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.tertiary, margin: 0 }}>{m.sub}</p>
                    </div>
                  ))}
                </div>
                <div style={{
                  background: C.cream, borderRadius: 12, padding: "20px 24px", marginTop: 4,
                  border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14,
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: C.charcoal, margin: "0 0 2px" }}>
                      Post-Event ROI Report
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.tertiary, margin: 0 }}>
                      Full engagement report, deal attribution, and ROI dashboard generated automatically for leadership review.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </Reveal>
        </div>
      </div>
    </section>
    </>
  );
}

/* ================================================================
   MOOT NETWORK
   ================================================================ */
function NetworkSection() {
  return (
    <section style={{ background: C.white, padding: "100px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
        <Reveal>
          <div>
            <Label>The Moots Network</Label>
            <SectionH2 style={{ marginBottom: 20 }}>
              Every Event Builds Your Private Intelligence Network
            </SectionH2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.65, color: C.secondary, margin: "0 0 16px" }}>
              Relationships don't end when the event does. Moots compounds your intelligence over
              time. Every enriched profile, every follow-up, every interaction feeds back into a
              private network that grows more valuable with each event.
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.65, color: C.secondary, margin: 0 }}>
              Host a dinner in Davos, a house at Art Basel, a retreat in Aspen. The same curated
              profiles travel with you. Your second event is smarter than your first. Your tenth
              is transformational.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <Card noisy style={{ padding: 36, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                { n: "1st Event", profiles: 45, connections: 12 },
                { n: "3rd Event", profiles: 189, connections: 67 },
                { n: "6th Event", profiles: 412, connections: 184 },
              ].map((r, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: C.charcoal }}>{r.n}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.tertiary }}>
                      {r.profiles} profiles · {r.connections} active connections
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: C.border, overflow: "hidden" }}>
                    <div style={{ width: `${(r.profiles / 450) * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.terracotta}, ${C.gold})`, transition: "width 1s ease" }} />
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 15, color: C.tertiary, marginTop: 24, marginBottom: 0, textAlign: "center" }}>
              Intelligence compounds. Relationships multiply.
            </p>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================
   USE CASES
   ================================================================ */
function UseCases() {
  const cases = [
    {
      sector: "Corporate Strategy",
      color: C.charcoal,
      scenario: "Branded House at Cannes Lions",
      workflow: "Bulk import RSVPs and walk-in registrations. Real-time scoring and priority alerts for the host team. Day-by-day briefing packets for door staff and executives. Post-event: engagement reports, deal attribution, and ROI dashboard for leadership.",
    },
    {
      sector: "Wealth Advisory & Financial Institutions",
      color: C.forest,
      scenario: "Conference Satellite Dinner",
      workflow: "Import the conference attendee list and vet against net worth, income sources, and COI relationships. Score exited founders and high-net-worth individuals against your criteria. Generate host briefings with personalized talking points. Post-dinner: automated follow-up sequences and meeting requests synced to Salesforce.",
    },
    {
      sector: "Legal & Advisory",
      color: C.terracotta,
      scenario: "Client Retreat",
      workflow: "Upload your invited partner list. Enrich with case history, firm specializations, and shared alumni networks. Build seating-optimized briefing packets for roundtable sessions. Post-event: warm introductions to cross-practice opportunities, tracked in CRM.",
    },
    {
      sector: "Foundations & Nonprofits",
      color: C.gold,
      scenario: "Donor Cultivation Dinner",
      workflow: "Import curated donor prospect list. Enrich with philanthropic history, board affiliations, and giving capacity. Generate personalized conversation guides for each table host. Post-dinner: tailored follow-up with giving proposals, synced to donor management system.",
    },
  ];
  return (
    <section id="use-cases" style={{ background: C.cream, padding: "100px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Label>Use Cases</Label>
            <SectionH2>Intelligence Tailored to Your World</SectionH2>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          {cases.map((c, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <Card style={{ padding: 36, height: "100%" }}>
                <div style={{ display: "inline-block", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: c.color, marginBottom: 12 }}>
                  {c.sector}
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: C.charcoal, margin: "0 0 16px" }}>
                  {c.scenario}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.6, color: C.secondary, margin: 0 }}>
                  {c.workflow}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   ROI METRICS (objective matching moved to dashboard)
   ================================================================ */
function ROISection() {
  const metrics = [
    { value: "90%", label: "Faster Guest Vetting", sub: "From hours per name to seconds" },
    { value: "2hrs", label: "Post-Event Follow-Up", sub: "Instead of 2 weeks" },
    { value: "3.2\u00d7", label: "Meeting Conversion Rate", sub: "Versus unstructured networking" },
    { value: "100%", label: "Leadership Visibility", sub: "Every dollar tracked to outcomes" },
  ];
  return (
    <section id="roi" style={{ background: C.white, padding: "100px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Label>Measurable Impact</Label>
            <SectionH2>The ROI Your Leadership Expects</SectionH2>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, alignItems: "stretch" }}>
          {metrics.map((m, i) => (
            <Reveal key={i} delay={i * 0.1} style={{ display: "flex" }}>
              <Card noisy style={{
                padding: "36px 28px", textAlign: "center", border: `1px solid ${C.border}`,
                height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                width: "100%",
              }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 700, color: C.terracotta, margin: "0 0 8px" }}>
                  {m.value}
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600, color: C.charcoal, margin: "0 0 6px", lineHeight: 1.35, whiteSpace: "nowrap" }}>
                  {m.label}
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.tertiary, margin: 0 }}>
                  {m.sub}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   GUEST EXPERIENCE (THE APP — FROM THE GUEST'S PERSPECTIVE)
   ================================================================ */
function GuestExperienceSection() {
  return (
    <section id="moots-app" style={{ background: C.cream, padding: "100px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Label>The Moots App</Label>
            <SectionH2>An Unforgettable Experience for Your Guests</SectionH2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, lineHeight: 1.65, color: C.secondary, maxWidth: 640, margin: "20px auto 0" }}>
              Every guest receives a carefully crafted mobile experience that makes your event
              feel premium before they even walk through the door.
            </p>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center", marginBottom: 72 }}>
          {/* App mockup */}
          <Reveal delay={0.1}>
            <div style={{
              background: C.charcoal, borderRadius: 44, padding: "10px",
              boxShadow: "0 24px 48px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)",
              width: 280, margin: "0 auto",
            }}>
              {/* Notch */}
              <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{
                  width: 120, height: 28, background: C.charcoal, borderRadius: "0 0 16px 16px",
                  margin: "0 auto", position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                }} />
              </div>
              <div style={{
                background: C.cream, borderRadius: 34, overflow: "hidden",
                paddingBottom: 16,
              }}>
                {/* Status bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px 8px", fontSize: 13, fontWeight: 600, color: C.charcoal }}>
                  <span>9:41</span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <div style={{ width: 16, height: 10, border: `1.5px solid ${C.charcoal}`, borderRadius: 2, position: "relative" }}>
                      <div style={{ position: "absolute", inset: 2, background: C.charcoal, borderRadius: 1 }} />
                    </div>
                  </div>
                </div>
                {/* Event header */}
                <div style={{ padding: "8px 20px 16px" }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", color: C.terracotta, fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                    <span>Back</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, paddingRight: 12 }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: C.charcoal, margin: "0 0 6px", lineHeight: 1.2 }}>
                        Cannes Lions 2026, The Terrace
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: C.secondary, margin: 0, lineHeight: 1.4 }}>
                        Mon Jun 22 · 8:00 PM
                        <br />La Croisette, Cannes
                      </p>
                    </div>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${C.terracotta}40, ${C.gold}40)`, flexShrink: 0 }} />
                  </div>
                </div>
                {/* Tabs */}
                <div style={{ display: "flex", gap: 16, padding: "0 20px 0", borderBottom: `1px solid ${C.border}` }}>
                  {["Leaders", "Matches", "Chat", "Partners"].map((t, i) => (
                    <span key={t} style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: i === 0 ? 600 : 500,
                      color: i === 0 ? C.charcoal : C.tertiary, paddingBottom: 10,
                      borderBottom: i === 0 ? `2px solid ${C.terracotta}` : "2px solid transparent",
                    }}>{t}</span>
                  ))}
                </div>
                {/* Worth Meeting */}
                <div style={{ padding: "12px 20px 0" }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: C.tertiary, margin: "0 0 10px" }}>
                    Worth Meeting
                  </p>
                  <div style={{ display: "flex", gap: 6, overflow: "hidden" }}>
                    {[
                      { name: "Supriya", role: "Head of Product", co: "NOTION", badge: "HOST", badgeBg: "rgba(203,182,116,0.15)", badgeColor: "#8A7A4A" },
                      { name: "Roberto", role: "Sr. Exec", co: "ICALIA", badge: "SPEAKER", badgeBg: "rgba(203,182,116,0.15)", badgeColor: "#8A7A4A" },
                      { name: "Prateik", role: "Founder", co: "HOSHO AI", badge: "INVESTOR", badgeBg: "rgba(47,79,63,0.08)", badgeColor: C.forest },
                    ].map((p) => (
                      <div key={p.name} style={{
                        flex: "0 0 76px", background: C.white, borderRadius: 10, padding: "8px 5px",
                        textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: `1px solid rgba(0,0,0,0.03)`,
                      }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${C.border}, ${C.tertiary}40)`, margin: "0 auto 5px" }} />
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 10, fontWeight: 700, color: C.charcoal, margin: "0 0 1px" }}>{p.name}</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 7, color: C.secondary, margin: "0 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.role}</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 6, fontWeight: 700, color: C.terracotta, letterSpacing: "0.5px", margin: "0 0 4px" }}>{p.co}</p>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", background: p.badgeBg, color: p.badgeColor, padding: "2px 5px", borderRadius: 3 }}>
                          {p.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Text content */}
          <Reveal delay={0.2}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: C.charcoal, margin: "0 0 20px", lineHeight: 1.3 }}>
                Every Detail, Carefully Considered
              </h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.65, color: C.secondary, margin: "0 0 20px" }}>
                The way a Four Seasons greets you at the door, or Hermès wraps a purchase. Moots brings
                that same attention to how your guests are welcomed, guided, and connected. From the moment
                they open the app, every touchpoint feels intentional, personal, and worthy of the room
                you've curated.
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.65, color: C.secondary, margin: 0 }}>
                It begins before the event and lasts well after. Who to meet, why they matter, how to
                follow up. Your guests never wonder what to do next.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Three guest-focused value cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
          <Reveal delay={0.15}>
            <Card style={{ padding: 32, height: "100%", border: `1px solid ${C.border}` }} noisy>
              <div style={{ marginBottom: 16 }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="16" cy="10" r="6" />
                  <path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10" />
                  <path d="M22 6l2 2-2 2" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: C.charcoal, margin: "0 0 12px" }}>
                Guests Arrive Prepared
              </h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.6, color: C.secondary, margin: 0 }}>
                Before the event, each guest sees who will be in the room, why specific people matter to them,
                and what conversations to prioritize. No more walking in blind.
              </p>
            </Card>
          </Reveal>
          <Reveal delay={0.25}>
            <Card style={{ padding: 32, height: "100%", border: `1px solid ${C.border}` }} noisy>
              <div style={{ marginBottom: 16 }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="12" r="4" />
                  <circle cx="22" cy="12" r="4" />
                  <path d="M14 14c1 1.5 2 3 2 5" />
                  <path d="M18 14c-1 1.5-2 3-2 5" />
                  <line x1="10" y1="16" x2="10" y2="24" />
                  <line x1="22" y1="16" x2="22" y2="24" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: C.charcoal, margin: "0 0 12px" }}>
                Introductions That Feel Personal
              </h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.6, color: C.secondary, margin: 0 }}>
                Guests receive carefully curated match suggestions based on shared interests and complementary goals.
                Every introduction feels considered, not random. Like a thoughtful host placed them together.
              </p>
            </Card>
          </Reveal>
          <Reveal delay={0.35}>
            <Card style={{ padding: 32, height: "100%", border: `1px solid ${C.border}` }} noisy>
              <div style={{ marginBottom: 16 }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H9l-4 4V7a2 2 0 012-2h12a2 2 0 012 2z" />
                  <path d="M25 11h2a2 2 0 012 2v14l-4-4H15" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: C.charcoal, margin: "0 0 12px" }}>
                A Community, Not Just an Event
              </h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.6, color: C.secondary, margin: 0 }}>
                After the event, the connections live on. Guests message each other, share context from the evening,
                and stay part of a community tied to your brand. Your events become the place where lasting relationships begin.
              </p>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   FAQ
   ================================================================ */
function FAQSection() {
  const faqs = [
    {
      q: "How is guest data handled and secured?",
      a: "Moots is built with enterprise-grade privacy at its core. All intelligence is processed in isolated, encrypted environments with the highest level of compliance. Your guest data is never shared across organizations. Each member's network remains entirely private.",
    },
    {
      q: "How quickly can we run a pilot?",
      a: "Most organizations are live within one week. We configure your intelligence sources, integrate with your CRM, and run a full enrichment cycle on a sample guest list, typically ahead of your next upcoming event.",
    },
    {
      q: "Can our PR agency or sponsors collaborate on the guest list?",
      a: "Yes. Moots supports role-based collaboration so you can invite PR partners, sponsors, or internal stakeholders to review, suggest, and approve guests directly within the platform. External collaborators see only what you choose to share, while sensitive guest intelligence like relevance scores and financial context stays visible only to your core team.",
    },
    {
      q: "What are post-event briefing reports?",
      a: "After each event, Moots generates comprehensive engagement reports: who attended, quality of interactions, follow-up actions taken, meetings booked, and pipeline attributed. Leadership gets a clear ROI dashboard tied to specific business outcomes.",
    },
    {
      q: "Does Moots work for recurring events?",
      a: "This is where Moots becomes most valuable. Your intelligence compounds over time. Recurring events benefit from historical interaction data, relationship progression tracking, and increasingly refined guest scoring as your network grows.",
    },
    {
      q: "Can I import past guest lists?",
      a: "Yes. Import guest lists from previous events to build a complete relationship history. Moots tracks how guests have evolved over time: role changes, company moves, liquidity events, and shifting priorities. This context makes every future interaction more informed.",
    },
    {
      q: "What intelligence sources does Moots use?",
      a: "Moots aggregates across premium data providers including wealth intelligence platforms, professional networks, corporate databases, and public records. The specific sources are configured to match your industry and event objectives during onboarding.",
    },
    {
      q: "Can Moots integrate with our existing tools?",
      a: "Yes. Moots offers native integrations with Salesforce, HubSpot, and other major CRMs. We also connect with invitation platforms like Paperless Post, Green Envelope, and Luma. CSV import/export, API access, and webhook-based automation are all supported.",
    },
  ];
  const [open, setOpen] = useState(null);
  return (
    <section id="faq" style={{ background: C.white, padding: "100px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Label>Questions</Label>
            <SectionH2>Frequently Asked</SectionH2>
          </div>
        </Reveal>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map((f, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <Card style={{ padding: 0, cursor: "pointer" }}>
                <div
                  onClick={() => setOpen(open === i ? null : i)}
                  style={{ padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, fontWeight: 600, color: C.charcoal, margin: 0 }}>
                    {f.q}
                  </h3>
                  <span style={{
                    fontSize: 20, color: C.tertiary,
                    transform: open === i ? "rotate(45deg)" : "rotate(0)",
                    transition: "transform 0.25s ease", flexShrink: 0, marginLeft: 16,
                  }}>
                    +
                  </span>
                </div>
                <div style={{ maxHeight: open === i ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.6, color: C.secondary, padding: "0 28px 22px", margin: 0 }}>
                    {f.a}
                  </p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   PILOT CTA (Calendly link)
   ================================================================ */
function PilotCTA() {

  return (
    <section id="pilot" style={{ background: C.cream, padding: "100px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <Label>Get Started</Label>
          <SectionH2 style={{ marginBottom: 20 }}>
            See Moots on Your Next Event
          </SectionH2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: C.secondary, lineHeight: 1.65, maxWidth: 540, margin: "0 auto 40px" }}>
            Book a 30-minute call with our team. Tell us about your next event and we'll show you
            how Moots would work on your actual guest list. Most pilots are live within one week.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <PrimaryBtn
            onClick={() => window.open(CALENDLY_URL, "_blank")}
            style={{ fontSize: 18, height: 60, padding: "0 48px" }}
          >
            Book a Demo Call
          </PrimaryBtn>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================
   FOOTER
   ================================================================ */
function Footer() {
  const footerLink = { fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", textDecoration: "none", cursor: "pointer", transition: "color 0.2s" };
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer style={{ background: C.charcoal, padding: "64px clamp(24px, 5vw, 80px) 40px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Top row: logo + nav columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: C.white, display: "block", marginBottom: 12 }}>
              Moots
            </span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.55, margin: 0 }}>
              AI-powered guest intelligence for corporate events. Vet the room before the event. Convert the room after.
            </p>
          </div>

          {/* Platform */}
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 16px" }}>Host Dashboard</p>
            {[
              { label: "How It Works", id: "how-it-works" },
              { label: "Platform Preview", id: "platform" },
              { label: "Follow-Up", id: "follow-up" },
              { label: "ROI & Metrics", id: "roi" },
            ].map((l) => (
              <span key={l.id} onClick={() => scrollTo(l.id)} style={{ ...footerLink, display: "block", marginBottom: 10 }}
                onMouseEnter={(e) => (e.target.style.color = "rgba(255,255,255,0.8)")}
                onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.5)")}
              >{l.label}</span>
            ))}
          </div>

          {/* Resources */}
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 16px" }}>Resources</p>
            {[
              { label: "Use Cases", id: "use-cases" },
              { label: "Guest Experience App", id: "moots-app" },
              { label: "FAQ", id: "faq" },
              { label: "Blog", id: null, comingSoon: true },
            ].map((l) => (
              <span key={l.label} onClick={() => l.id && scrollTo(l.id)} style={{
                ...footerLink, display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                cursor: l.comingSoon ? "default" : "pointer",
              }}
                onMouseEnter={(e) => !l.comingSoon && (e.target.style.color = "rgba(255,255,255,0.8)")}
                onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.5)")}
              >
                {l.label}
                {l.comingSoon && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: C.terracotta, background: "rgba(184,117,94,0.15)", padding: "2px 6px", borderRadius: 4 }}>Soon</span>}
              </span>
            ))}
          </div>

          {/* Company */}
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 16px" }}>Get Started</p>
            <span onClick={() => window.open(CALENDLY_URL, "_blank")} style={{ ...footerLink, display: "block", marginBottom: 10, color: C.terracotta, fontWeight: 600 }}
              onMouseEnter={(e) => (e.target.style.color = "#d49a82")}
              onMouseLeave={(e) => (e.target.style.color = C.terracotta)}
            >Book a Demo</span>
            <span style={{ ...footerLink, display: "block", marginBottom: 10, color: "rgba(255,255,255,0.35)" }}>hello@moots.ai</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, textAlign: "center" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.25)", margin: 0 }}>
            &copy; {new Date().getFullYear()} Muse Financial Technologies Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   INTEGRATIONS STRIP
   ================================================================ */
function IntegrationsStrip() {
  const integrations = [
    { name: "Salesforce", desc: "Bi-directional CRM sync" },
    { name: "HubSpot", desc: "Contact & deal pipeline" },
    { name: "Paperless Post", desc: "Invitation tracking" },
    { name: "Luma", desc: "RSVP management" },
    { name: "Webhooks & API", desc: "Custom automations" },
  ];
  return (
    <section id="integrations" style={{ background: C.white, padding: "72px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Label>Integrations</Label>
            <SectionH2>Connects to Your Existing Stack</SectionH2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.6, color: C.secondary, maxWidth: 560, margin: "14px auto 0" }}>
              Every interaction, enriched profile, and follow-up syncs directly to your CRM.
              No manual data entry. Full visibility for leadership.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            {integrations.map((int) => (
              <div key={int.name} style={{
                background: C.cream, border: `1px solid ${C.border}`, borderRadius: 14,
                padding: "18px 24px", textAlign: "center",
              }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: C.charcoal, margin: "0 0 4px" }}>
                  {int.name}
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.tertiary, margin: 0 }}>
                  {int.desc}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================
   POST-EVENT FOLLOW-UP
   ================================================================ */
function FollowUpSection() {
  const workflows = [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="22" height="18" rx="3" />
          <polyline points="3,8 14,16 25,8" />
        </svg>
      ),
      title: "Automated Outreach in Hours, Not Weeks",
      desc: "Personalized follow-ups go out by email and through the app while the conversation is still warm. Each message references the event context and includes a scheduling link so guests can book a call without the back-and-forth.",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="10" r="5" />
          <path d="M4 24c0-5.5 4.5-10 10-10s10 4.5 10 10" />
          <path d="M19 10l3 3 5-5" />
        </svg>
      ),
      title: "Admin Visibility & Team Tracking",
      desc: "See which team members connected with whom, which follow-ups have been sent, and which guests have responded. One dashboard, full visibility, even if you weren't at the event.",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3v4" />
          <path d="M3 14h4" />
          <path d="M21 14h4" />
          <circle cx="14" cy="14" r="7" />
          <path d="M14 14l3 3" />
        </svg>
      ),
      title: "Every Interaction Logged to Your CRM",
      desc: "Conversations, meeting bookings, and follow-up responses sync directly to Salesforce or HubSpot. Leadership gets a clear picture of what came out of the event without chasing the team for updates.",
    },
  ];
  return (
    <section id="follow-up" style={{ background: C.cream, padding: "100px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Label>After the Event</Label>
            <SectionH2>Follow-Up That Actually Happens</SectionH2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, lineHeight: 1.65, color: C.secondary, maxWidth: 620, margin: "16px auto 0" }}>
              The warmth of a great conversation fades fast. Moots ensures your team follows up
              within hours, personalized, tracked, and synced to your CRM.
            </p>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 28 }}>
          {workflows.map((w, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <Card style={{ padding: 36, height: "100%", border: `1px solid ${C.border}` }}>
                <div style={{ marginBottom: 16 }}>{w.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: C.charcoal, margin: "0 0 12px" }}>
                  {w.title}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.6, color: C.secondary, margin: 0 }}>
                  {w.desc}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SEO HEAD (injects meta tags and schema markup)
   ================================================================ */
function SEOHead() {
  useEffect(() => {
    /* Page title */
    document.title = "Moots — Guest Intelligence for Corporate Events | AI-Powered Event Guest Management";

    /* Meta description */
    const setMeta = (name, content, prop) => {
      let el = document.querySelector(prop ? `meta[property="${name}"]` : `meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); prop ? el.setAttribute("property", name) : el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };

    setMeta("description", "Moots is an AI-powered guest intelligence platform for corporate events. Vet attendee lists, generate host briefings, automate follow-up, and measure event ROI. Trusted by financial institutions, advisory firms, and businesses hosting curated dinners, branded houses, and annual retreats.");
    setMeta("keywords", "corporate event guest management, curated event guest list software, event follow-up automation, AI event networking platform, VIP event guest management, trade show lead capture follow-up, event ROI tracking, host briefing platform, event intelligence software, corporate dinner guest vetting");
    setMeta("author", "Muse Financial Technologies Inc.");
    setMeta("robots", "index, follow");

    /* Open Graph */
    setMeta("og:title", "Moots — Guest Intelligence for Corporate Events", true);
    setMeta("og:description", "Vet the room before the event. Convert the room after. AI-powered guest intelligence for corporate hosts.", true);
    setMeta("og:type", "website", true);
    setMeta("og:url", "https://moots.ai", true);
    setMeta("og:site_name", "Moots", true);

    /* Twitter Card */
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", "Moots — Guest Intelligence for Corporate Events");
    setMeta("twitter:description", "Vet the room before the event. Convert the room after. AI-powered guest intelligence for corporate hosts.");

    /* Canonical */
    let canonical = document.querySelector("link[rel='canonical']");
    if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
    canonical.setAttribute("href", "https://moots.ai");

    /* JSON-LD Schema: SoftwareApplication */
    let schema = document.getElementById("moots-schema");
    if (!schema) {
      schema = document.createElement("script");
      schema.id = "moots-schema";
      schema.type = "application/ld+json";
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Moots",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "AI-powered guest intelligence platform for corporate events. Vet attendee lists, generate host briefings, automate post-event follow-up, and measure ROI.",
      "url": "https://moots.ai",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Private pilot available"
      },
      "creator": {
        "@type": "Organization",
        "name": "Muse Financial Technologies Inc.",
        "url": "https://moots.ai"
      }
    });

    /* JSON-LD Schema: Organization */
    let orgSchema = document.getElementById("moots-org-schema");
    if (!orgSchema) {
      orgSchema = document.createElement("script");
      orgSchema.id = "moots-org-schema";
      orgSchema.type = "application/ld+json";
      document.head.appendChild(orgSchema);
    }
    orgSchema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Moots",
      "legalName": "Muse Financial Technologies Inc.",
      "url": "https://moots.ai",
      "description": "Guest intelligence for high-value corporate events"
    });
  }, []);

  return null;
}

/* ================================================================
   GLOBAL STYLES
   ================================================================ */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
      body { background: ${C.cream}; color: ${C.charcoal}; font-family: 'DM Sans', sans-serif; font-size: 17px; line-height: 1.6; overflow-x: hidden; }
      ::selection { background: rgba(184,117,94,0.2); }
      input::placeholder, textarea::placeholder { color: ${C.tertiary}; }
      /* Hero animation: concentric rings (matching app breathing) */
      @keyframes ringBreath1 {
        0% { transform: scale(0.96); opacity: 0.12; }
        50% { transform: scale(1.04); opacity: 0.20; }
        100% { transform: scale(0.96); opacity: 0.12; }
      }
      @keyframes ringBreath2 {
        0% { transform: scale(0.98); opacity: 0.06; }
        50% { transform: scale(1.06); opacity: 0.10; }
        100% { transform: scale(0.98); opacity: 0.06; }
      }
      @keyframes ringBreath3 {
        0% { transform: scale(0.97); opacity: 0.03; }
        50% { transform: scale(1.04); opacity: 0.06; }
        100% { transform: scale(0.97); opacity: 0.03; }
      }
      .hero-ring { transform-origin: center; }
      .hero-ring-1 { animation: ringBreath1 5s ease-in-out infinite; }
      .hero-ring-2 { animation: ringBreath2 7s ease-in-out infinite 1s; }
      .hero-ring-3 { animation: ringBreath3 9s ease-in-out infinite 2s; }

      /* Hero dots: selected glow and pulse */
      @keyframes dotPulse {
        0%, 100% { opacity: 0.7; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
      }
      @keyframes dotGlow {
        0%, 100% { opacity: 0; }
        30%, 70% { opacity: 0.06; }
      }
      @keyframes dotFade {
        0%, 100% { opacity: 0.25; }
        50% { opacity: 0.45; }
      }
      .hero-dot-selected { animation: dotPulse 4s ease-in-out infinite; }
      .hero-dot-muted { animation: dotFade 6s ease-in-out infinite; }
      .hero-dot-glow { animation: dotGlow 4s ease-in-out infinite; }

      /* Connection lines fade in/out */
      @keyframes linePulse {
        0%, 100% { opacity: 0; }
        20%, 80% { opacity: 0.12; }
      }
      .hero-connection { animation: linePulse 8s ease-in-out infinite; }

      @keyframes navDropIn {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (max-width: 900px) {
        .nav-desktop { display: none !important; }
        .nav-mobile-toggle { display: flex !important; }
      }
      @media (min-width: 901px) {
        .nav-mobile-toggle { display: none !important; }
        .nav-mobile-menu { display: none !important; }
      }

      /* ================================================================
         MOBILE — ≤ 768px (iPhone 13 / 14 / 15 series and smaller)
         ================================================================ */
      @media (max-width: 768px) {

        /* 1 · Horizontal padding */
        section > div { padding-left: 20px !important; padding-right: 20px !important; }

        /* 2 · Vertical section padding: reduce 100px → 56px throughout */
        section { padding-top: 56px !important; padding-bottom: 56px !important; }
        /* Hero: extra top room to clear the fixed 72px nav */
        main > section:first-child { padding-top: 88px !important; padding-bottom: 64px !important; }

        /* 3 · Large stacked gaps: tighten when 2-col layouts collapse to 1-col */
        div[style*="gap: 56px"] { gap: 32px !important; }

        /* 4 · 2-col grids → 1-col */
        div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }

        /* 5 · 3-col grids → 1-col (guest experience cards, step flow, etc.) */
        div[style*="grid-template-columns: repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
        div[style*="grid-template-columns: 1fr 1fr 1fr"] { grid-template-columns: 1fr !important; }

        /* 6 · 4-col grids → 2-col (ROI metrics, dashboard stats, integrations) */
        div[style*="grid-template-columns: repeat(4, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }

        /* 7 · Steps: minmax(460px) exceeds 390px viewport → force 1-col */
        div[style*="minmax(460px"] { grid-template-columns: 1fr !important; }

        /* 8 · Footer 4-col: collapse cleanly to 1-col */
        div[style*="grid-template-columns: 1.5fr 1fr 1fr 1fr"] { grid-template-columns: 1fr 1fr !important; }
        footer > div > div:first-child { grid-template-columns: 1fr !important; gap: 32px !important; }

        /* 9 · Card padding: scale down from desktop-generous to mobile-appropriate */
        div[style*="padding: 36px"] { padding: 24px !important; }
        div[style*="padding: 32px"] { padding: 20px !important; }

        /* 10 · ROI metric cards: remove fixed height and text overflow */
        div[style*="height: 200px"] { height: auto !important; padding: 24px 20px !important; }
        p[style*="white-space: nowrap"] { white-space: normal !important; }

        /* 11 · Dashboard (section#platform) */
        /* Top bar: wrap event title and tab strip onto separate lines */
        section#platform div[style*="justify-content: space-between"][style*="padding: 16px 28px"] {
          flex-wrap: wrap !important;
          gap: 10px !important;
          padding: 14px 16px !important;
        }
        /* Tab strip: horizontal scroll so all tabs remain reachable */
        section#platform div[style*="justify-content: space-between"] > div[style*="gap: 20"] {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
          flex-wrap: nowrap !important;
          padding-bottom: 2px;
        }
        /* Tab panels: horizontal scroll for data-dense table layouts */
        section#platform div[style*="padding: 28px"] {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        /* Minimum widths keep table rows readable inside the scroll container */
        section#platform div[style*="grid-template-columns: 2fr 1.5fr"] { min-width: 560px; }
        section#platform div[style*="grid-template-columns: 2fr 1.2fr"] { min-width: 600px; }
        section#platform div[style*="grid-template-columns: 2.5fr"] { min-width: 640px; }
        /* Objective Match step flow: 3-col → 1-col */
        section#platform div[style*="grid-template-columns: 1fr 1fr 1fr"] { grid-template-columns: 1fr !important; }
        /* Downstream action chips: 4-col → 2-col */
        section#platform div[style*="grid-template-columns: 1fr 1fr 1fr 1fr"] { grid-template-columns: repeat(2, 1fr) !important; }

        /* 12 · Hero animation: soften peripheral elements */
        .hero-animation { opacity: 0.6; }
        .hero-dot-selected, .hero-dot-muted, .hero-dot-glow, .hero-connection { opacity: 0.4; }

        /* 13 · Integrations 5-col grid → 2-col on mobile */
        div[style*="repeat(5, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }
      }

      /* ================================================================
         DASHBOARD: teaser vs full — class-based show/hide
         ================================================================ */
      #dash-teaser { display: none; }
      #dash-full { display: block; }

      @media (max-width: 768px) {
        #dash-teaser { display: block !important; }
        #dash-full { display: none !important; }
      }
    `}</style>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function MootsLanding() {
  const [loginOpen, setLoginOpen] = useState(false);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const openCalendly = () => window.open(CALENDLY_URL, "_blank");

  return (
    <>
      <SEOHead />
      <GlobalStyles />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <Nav onPilotClick={openCalendly} onLoginClick={() => setLoginOpen(true)} />
      <main>
        <Hero onPilotClick={openCalendly} onLearnClick={() => scrollTo("how-it-works")} />
        <ProblemSection />
        <StepsSection />
        <FormatsSection />
        <DashboardPreview />
        <FollowUpSection />
        <ROISection />
        <GuestExperienceSection />
        <UseCases />
        <NetworkSection />
        <IntegrationsStrip />
        <FAQSection />
        <PilotCTA />
      </main>
      <Footer />
    </>
  );
}
