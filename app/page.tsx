'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const BRAND = 'Moots'

// Update these links:
const PRIMARY_CTA_HREF = 'https://calendly.com/moots/demo'
const SECONDARY_CTA_HREF = '#how-it-works'

export default function Page() {
  const router = useRouter()

  // Guard: Redirect to dashboard home when in dashboard mode
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_MODE === 'dashboard') {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <main className="page">
      {/* Top nav */}
      <header className="nav">
        <div className="container navInner">
          <div className="brand">{BRAND}</div>
          <div className="navActions">
            <a className="link" href="#faq">FAQ</a>
            <a className="btn btnPrimary" href={PRIMARY_CTA_HREF}>
              Request a Private Pilot
            </a>
          </div>
        </div>
      </header>

      {/* Hero (dark) */}
      <section className="hero">
        <div className="container heroInner">
          <p className="eyebrow">Outcome-driven guest experience</p>

          <h1 className="h1">Make sure the right people meet in the room.</h1>

          <p className="subhead">
            {BRAND} helps hosts curate meaningful connections between their guests, ensuring every interaction adds real value during the event and beyond.
          </p>

          <div className="ctaRow">
            <a className="btn btnPrimary" href={PRIMARY_CTA_HREF}>
              Request a Private Pilot
            </a>
            <a className="btn btnSecondary" href={SECONDARY_CTA_HREF}>
              How it works
            </a>
          </div>

          {/* Credibility row (shorter: single-line on laptop) */}
          <div className="cred">
            <div className="credLabel">Used for curated side events at</div>
            <div className="credPills" aria-label="Examples of gatherings">
              <span className="pill">CES</span>
              <span className="pill">Cannes Lions</span>
              <span className="pill">Davos</span>
              <span className="pill">UN Week</span>
            </div>
            <div className="credNote">
              Also used for standalone client, partner, and community gatherings not tied to major moments.
            </div>
          </div>
        </div>
      </section>

      {/* Light section with higher contrast */}
      <section className="section light" id="breaks">
        <div className="container">
          <h2 className="h2">What breaks in high-quality gatherings</h2>

          <div className="cards2">
            <div className="cardLight">
              <p className="cardText">
                The right people attend, but guests don’t know who matters for them.
              </p>
            </div>
            <div className="cardLight">
              <p className="cardText">
                Meaningful connections depend on luck, timing, or social confidence.
              </p>
            </div>
            <div className="cardLight">
              <p className="cardText">
                Guests leave without a clean way to follow up with the right people.
              </p>
            </div>
            <div className="cardLight">
              <p className="cardText">
                The host has no structured way to extend the experience beyond the event.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dark section */}
      <section className="section dark" id="how-it-works">
        <div className="container">
          <h2 className="h2 h2OnDark">How {BRAND} adds value to your guests</h2>
          <p className="proseOnDark">
            Guests don’t attend curated events just to listen to speakers. They come because the room itself creates value with the collective presence, conversations, and potential connections that matter as much as what happens on stage.
            {` ${BRAND}`} reinforces that every guest counts and makes it easier for people to connect with those they genuinely want to meet.
          </p>

          <div className="triptych">
            <div className="cardDark">
              <div className="kicker">Before</div>
              <h3 className="h3">Arrive with intent</h3>
              <p className="cardBody">
                Guests see who is attending and who they should prioritize based on the guest’s goals for the event and the guest’s role.
              </p>
            </div>

            <div className="cardDark">
              <div className="kicker">During</div>
              <h3 className="h3">Meet the right people</h3>
              <p className="cardBody">
                Guests use a lightweight flow in our app to connect in the moment without awkward “what do you do?” loops or losing names in a crowded room.
              </p>
            </div>

            <div className="cardDark">
              <div className="kicker">After</div>
              <h3 className="h3">Keep continuity for 30 days</h3>
              <p className="cardBody">
                For 30 days, guests can follow up with the people they met and connect with the people they did not reach so the room keeps working after the event.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Light section with stronger contrast */}
      <section className="section light" id="fit">
        <div className="container">
          <h2 className="h2">Built for hosts who curate relationships</h2>

          <div className="grid2">
            <div className="panelLight">
              <div className="panelTitle">Designed for</div>
              <ul className="list">
                <li>Invite-only breakfasts, luncheons, dinners and private talks</li>
                <li>Networking cocktails, demo days, forums and fundraising events</li>
                <li>Client, partner and donor events that repeat over time</li>
                <li>LP meetings, Company offsites and retreats</li>
              </ul>
            </div>

            <div className="panelLight">
              <div className="panelTitle">Not built for</div>
              <ul className="list">
                <li>Mass conferences and trade shows</li>
                <li>High-volume ticketing-first events</li>
                <li>Events where scale matters more than who meets</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Dark pricing */}
      <section className="section dark" id="pilots">
        <div className="container">
          <h2 className="h2 h2OnDark">Private pilots</h2>

          <div className="proseOnDark">
            <p className="pOnDark">
              {BRAND} partners with a limited number of hosts who design gatherings with care.
            </p>
            <p className="pOnDark">
              Engagements starts from <strong>$2,000</strong> per gathering, depending on event duration, size of the invited community and if a white-glove on-site activation is requested.
            </p>
          </div>

          <div className="ctaRow">
            <a className="btn btnPrimary" href={PRIMARY_CTA_HREF}>
              Request a Private Pilot
            </a>
            <a className="btn btnSecondary" href="#faq">
              Read FAQs
            </a>
          </div>
        </div>
      </section>

      {/* FAQ (light, high contrast) */}
      <section className="section light" id="faq">
        <div className="container">
          <h2 className="h2">FAQ</h2>

          <div className="faq">
            <details>
              <summary>Is this an RSVP or ticketing tool?</summary>
              <p>
                No. {BRAND} complements your invitation flow by focusing on the guest experience: who meets, how conversations begin, and how continuity is maintained after the gathering.
              </p>
            </details>

            <details>
              <summary>Do guests need to download an app?</summary>
              <p>
                iOS guests get the full experience in-app. For guests who don’t install, you can still deliver key touchpoints by email or text (confirmation, QR code, and pre-event context).
              </p>
            </details>

            <details>
              <summary>How fast can we run a pilot?</summary>
              <p>
                Typically within days. If you have a guest list, we can set up a pilot quickly.
              </p>
            </details>

            <details>
              <summary>What does the host get after the event?</summary>
              <p>
                A concise brief on participation and connection patterns, so you can refine guest curation and improve the next gathering.
              </p>
            </details>

            <details>
              <summary>What does the name Moots mean?</summary>
              <p>
                The name comes from the idea of a moot: a gathering convened to discuss matters of consequence. Historically, moots were spaces where decisions were shaped through dialogue among peers. Moots exists to bring that spirit into modern professional gatherings using technology to quietly support conversations that matter.
              </p>
            </details>
          </div>

          <div className="footerCta">
            <p className="footerLine">
              If you host gatherings where who meets matters—let’s talk.
            </p>
            <a className="btn btnPrimary" href={PRIMARY_CTA_HREF}>
              Request a Private Pilot
            </a>
          </div>

          <footer className="footer">
            <div className="footerInner">
              <div>{BRAND}</div>
              <div>New York · 2026</div>
            </div>
          </footer>
        </div>
      </section>

      <style jsx>{`
        :global(html, body) { padding: 0; margin: 0; }
        :global(body) {
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
          color: #0b0b0f;
          background: #0a0a0d;
        }
        :global(*) { box-sizing: border-box; }
        :global(a) { color: inherit; text-decoration: none; }

        .page { min-height: 100vh; }

        .container {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 22px;
        }

        /* Nav */
        .nav {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(16,16,20,0.88);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(10px);
        }
        .navInner {
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .brand {
          font-weight: 700;
          letter-spacing: 0.2px;
          color: rgba(255,255,255,0.92);
        }
        .navActions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .link {
          font-size: 13px;
          color: rgba(255,255,255,0.75);
          padding: 10px 10px;
          border-radius: 10px;
        }
        .link:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1;
          border: 1px solid transparent;
          transition: transform 140ms ease, background 140ms ease, border-color 140ms ease, opacity 140ms ease;
          user-select: none;
          white-space: nowrap;
        }
        .btn:hover { transform: translateY(-1px); }
        .btnPrimary {
          background: #ffffff;
          color: #0b0b0f;
          border-color: rgba(255,255,255,0.9);
        }
        .btnPrimary:hover { opacity: 0.92; }
        .btnSecondary {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.92);
          border-color: rgba(255,255,255,0.14);
        }
        .btnSecondary:hover { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.18); }

        .ctaRow {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
        }

        /* Hero */
        .hero {
          background: radial-gradient(1200px 650px at 20% 20%, rgba(120,90,255,0.20), transparent 55%),
                      radial-gradient(900px 520px at 80% 25%, rgba(0,200,255,0.10), transparent 60%),
                      linear-gradient(180deg, #0a0a0d 0%, #07070a 100%);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 78px 0 54px;
        }
        .heroInner { padding-top: 8px; }
        .eyebrow {
          margin: 0 0 14px;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.62);
        }
        .h1 {
          margin: 0 0 14px;
          font-size: clamp(42px, 5.2vw, 64px);
          line-height: 1.03;
          letter-spacing: -0.03em;
          color: rgba(255,255,255,0.96);
          font-weight: 750;
          max-width: 980px;
        }
        .subhead {
          margin: 0;
          margin-top: 6px;
          font-size: 16px;
          line-height: 1.7;
          color: rgba(255,255,255,0.72);
          max-width: 820px;
        }

        /* Credibility row */
        .cred {
          margin-top: 22px;
          padding: 16px 16px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          max-width: 980px;
        }
        .credLabel {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.62);
          margin-bottom: 10px;
        }
        .credPills {
          display: flex;
          flex-wrap: nowrap; /* keep on one row */
          overflow-x: auto;  /* safe on smaller screens */
          gap: 8px;
          padding-bottom: 2px;
        }
        .pill {
          flex: 0 0 auto;
          font-size: 12px;
          color: rgba(255,255,255,0.82);
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(0,0,0,0.18);
          padding: 6px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .credNote {
          margin-top: 10px;
          font-size: 13px;
          color: rgba(255,255,255,0.68);
        }

        /* Sections */
        .section { padding: 64px 0; }
        .dark {
          background: linear-gradient(180deg, #0b0b0f 0%, #08080b 100%);
          border-top: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .light {
          background: #f6f7fb; /* higher contrast than plain white */
          border-top: 1px solid rgba(0,0,0,0.06);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          color: #0b0b0f;
        }

        .h2 {
          margin: 0 0 14px;
          font-size: 26px;
          letter-spacing: -0.02em;
          font-weight: 750;
        }
        .h2OnDark {
          color: rgba(255,255,255,0.94);
        }
        .proseOnDark {
          max-width: 900px;
          color: rgba(255,255,255,0.72);
          font-size: 15px;
          line-height: 1.75;
          margin-top: 6px;
        }
        .pOnDark { margin: 0 0 10px; }

        /* Light cards (higher contrast) */
        .cards2 {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          max-width: 980px;
        }
        .cardLight {
          background: #ffffff;
          border: 1px solid rgba(15,15,20,0.14);
          box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.06);
          border-radius: 16px;
          padding: 16px 16px;
        }
        .cardText {
          margin: 0;
          color: rgba(10,10,14,0.88);
          font-size: 14px;
          line-height: 1.65;
          font-weight: 520;
        }

        /* Dark triptych */
        .triptych {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .cardDark {
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          border-radius: 18px;
          padding: 18px;
        }
        .kicker {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.60);
          margin-bottom: 10px;
        }
        .h3 {
          margin: 0 0 10px;
          font-size: 16px;
          font-weight: 750;
          letter-spacing: -0.01em;
          color: rgba(255,255,255,0.92);
        }
        .cardBody {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          color: rgba(255,255,255,0.72);
        }

        /* Panels (light, higher contrast) */
        .grid2 {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          max-width: 980px;
        }
        .panelLight {
          background: #ffffff;
          border: 1px solid rgba(15,15,20,0.14);
          box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.06);
          border-radius: 18px;
          padding: 18px;
        }
        .panelTitle {
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(10,10,14,0.55);
          margin-bottom: 12px;
          font-weight: 700;
        }
        .list {
          margin: 0;
          padding-left: 18px;
          color: rgba(10,10,14,0.86);
          line-height: 1.75;
          font-size: 14px;
          font-weight: 520;
        }
        .list li { margin: 8px 0; }

        /* FAQ (light) */
        .faq {
          margin-top: 14px;
          max-width: 920px;
        }
        details {
          background: #ffffff;
          border: 1px solid rgba(15,15,20,0.14);
          border-radius: 16px;
          padding: 14px 16px;
          margin-bottom: 10px;
          box-shadow: 0 1px 0 rgba(0,0,0,0.03);
        }
        summary {
          cursor: pointer;
          font-weight: 750;
          letter-spacing: -0.01em;
          list-style: none;
          outline: none;
          color: rgba(10,10,14,0.92);
        }
        details p {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.7;
          color: rgba(10,10,14,0.78);
        }

        /* Footer CTA */
        .footerCta {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 920px;
        }
        .footerLine {
          margin: 0;
          font-size: 14px;
          color: rgba(10,10,14,0.70);
          font-weight: 520;
        }

        .footer {
          margin-top: 28px;
          padding-top: 16px;
          border-top: 1px solid rgba(0,0,0,0.08);
        }
        .footerInner {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: rgba(10,10,14,0.62);
          padding-bottom: 10px;
        }

        /* Responsive */
        @media (max-width: 980px) {
          .triptych { grid-template-columns: 1fr; }
          .grid2 { grid-template-columns: 1fr; }
          .cards2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 780px) {
          .navActions .link { display: none; }
        }
      `}</style>
    </main>
  )
}
