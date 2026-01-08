'use client'



const BRAND = "Moots";

// Update these links:
const PRIMARY_CTA_HREF = "https://calendly.com/moots/demo";
const SECONDARY_CTA_HREF = "#how-it-works";



export default function Page() {
  return (
    <main className="page">
      <header className="nav">
        <div className="navInner">
          <div className="brand">{BRAND}</div>
          <div className="navActions">
            <a className="link" href="#faq">FAQ</a>
            <a className="btn btnPrimary" href={PRIMARY_CTA_HREF}>
              Request a Private Pilot
            </a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <p className="eyebrow">Private experience infrastructure</p>

          <h1 className="h1">Where meaningful encounters begin.</h1>
          <p className="subhead">
            A private experience layer for gatherings where who meets matters.
          </p>

          <div className="ctaRow">
            <a className="btn btnPrimary" href={PRIMARY_CTA_HREF}>
              Request a Private Pilot
            </a>
            <a className="btn btnGhost" href={SECONDARY_CTA_HREF}>
              How it works
            </a>
          </div>

          <p className="fineprint">
            Built for curated dinners, salons, and professional gatherings—moments designed for impact.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="h2">An experience, not a tool</h2>
          <div className="prose">
            <p>
              Some gatherings are designed for scale. Others are designed for impact.
            </p>
            <p>
              {BRAND} is built for the latter.
            </p>
            <p>
              We work with brands and communities who host private dinners, salons, and curated gatherings—moments where the people in the room matter as much as the setting.
            </p>
            <p>
              {BRAND} becomes the invisible layer that shapes what happens between guests, before, during, and after they come together.
            </p>
          </div>
        </div>
      </section>

      <section className="section muted">
        <div className="container">
          <h2 className="h2">The challenge with high-level gatherings</h2>
          <ul className="bullets">
            <li>The right people are in the room, but context is missing</li>
            <li>Conversations stay surface-level or repetitive</li>
            <li>Valuable encounters happen by chance</li>
            <li>Once the gathering ends, momentum fades</li>
          </ul>
          <p className="note">
            The result is a beautiful moment that could have gone further.
          </p>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="container">
          <h2 className="h2">{BRAND} designs the conditions for meaningful encounters</h2>
          <div className="prose">
            <p>
              We don’t “facilitate networking.” We curate the conditions that allow the right relationships to emerge.
            </p>
            <p>
              {BRAND} helps participants understand who is present, why certain encounters matter, and how conversations can continue beyond the moment—so guests don’t simply attend. They leave changed.
            </p>
          </div>

          <div className="triptych">
            <div className="card">
              <h3 className="h3">Before the gathering</h3>
              <p className="cardTitle">Context replaces chance.</p>
              <p className="cardBody">
                Participants receive thoughtful guidance ahead of the event—clarity on who will be present and which encounters may be most meaningful.
                They arrive prepared, not hopeful.
              </p>
            </div>

            <div className="card">
              <h3 className="h3">During the gathering</h3>
              <p className="cardTitle">Presence, without friction.</p>
              <p className="cardBody">
                {BRAND} lives quietly alongside the moment: a seamless arrival, a private space to continue conversations, and an effortless way to break the ice.
                Nothing distracts from the experience. Everything supports it.
              </p>
            </div>

            <div className="card">
              <h3 className="h3">After the gathering</h3>
              <p className="cardTitle">The moment doesn’t dissolve.</p>
              <p className="cardBody">
                Connections don’t disappear when the room empties. Participants retain clarity on who they met and why it mattered.
                Hosts gain insight into how relationships formed. Continuity stays alive until the next gathering.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section muted">
        <div className="container">
          <h2 className="h2">For hosts who curate with intention</h2>
          <div className="grid2">
            <div className="prose">
              <p>{BRAND} is designed for:</p>
              <ul className="bullets compact">
                <li>brands with private communities</li>
                <li>leadership and founder communities</li>
                <li>cultural and professional collectives</li>
                <li>organizations that host repeatedly, not occasionally</li>
              </ul>
            </div>
            <div className="panel">
              <p className="panelTitle">A clear filter</p>
              <p className="panelBody">
                If your gatherings are built on trust, relevance, and long-term relationships, {BRAND} fits naturally.
                If scale matters more than substance, it doesn’t.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="h2">From gathering to continuity</h2>
          <div className="prose">
            <p>
              A single gathering is a moment. A series of gatherings becomes continuity.
            </p>
            <p>
              When {BRAND} is used over time, participants recognize one another across cities and moments, conversations resume instead of restarting,
              and gatherings begin to feel like membership—without the overhead.
            </p>
            <p>The experience compounds.</p>
          </div>
        </div>
      </section>

      <section className="section muted">
        <div className="container">
          <h2 className="h2">Understanding what truly happened</h2>
          <div className="prose">
            <p>
              After each gathering, hosts receive a concise engagement brief that reflects the experience—not vanity metrics.
            </p>
          </div>
          <ul className="bullets">
            <li>participation and presence</li>
            <li>conversational activity</li>
            <li>signals of connection and influence</li>
            <li>insight to shape what comes next</li>
          </ul>
          <p className="note">Not analytics for reporting. Insight for curation.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="h2">Why this matters</h2>
          <div className="prose">
            <p>People may forget the menu. They may forget the venue. They may forget the photographer.</p>
            <p>
              They won’t forget who they met, what that relationship unlocked, and how that moment influenced their path.
            </p>
            <p>
              {BRAND} exists to make those encounters intentional—and enduring.
            </p>
          </div>
        </div>
      </section>

      <section className="section muted">
        <div className="container">
          <h2 className="h2">Private pilots</h2>
          <div className="prose">
            <p>
              {BRAND} partners with a limited number of hosts who design gatherings with care.
            </p>
            <p>
              Engagements typically range from <strong>$2,000 to $5,000</strong> per gathering, depending on format and scale.
            </p>
          </div>

          <div className="ctaRow">
            <a className="btn btnPrimary" href={PRIMARY_CTA_HREF}>
              Request a Private Pilot
            </a>
            <a className="btn btnGhost" href="#faq">
              Read FAQs
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="faq">
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
                iOS guests get the full experience in-app. For guests who don’t install, you can still deliver key touchpoints by email (confirmation, QR code, and pre-event context).
              </p>
            </details>

            <details>
              <summary>Is this for professional gatherings only?</summary>
              <p>
                Yes—{BRAND} is designed for business-focused communities where the right encounters create long-term value.
              </p>
            </details>

            <details>
              <summary>How fast can we run a pilot?</summary>
              <p>
                Typically within days. If you have a guest list, we can set up a pilot quickly.
              </p>
            </details>
          </div>

          <div className="footerCta">
            <p className="footerLine">If you host gatherings where who meets matters—let’s talk.</p>
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
          background: #ffffff;
        }
        :global(a) { color: inherit; text-decoration: none; }
        :global(*) { box-sizing: border-box; }

        .page { min-height: 100vh; }

        .nav {
          position: sticky;
          top: 0;
          z-index: 10;
          backdrop-filter: blur(10px);
          background: rgba(255,255,255,0.85);
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .navInner {
          max-width: 1040px;
          margin: 0 auto;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .brand {
          letter-spacing: 0.2px;
          font-weight: 600;
        }
        .navActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .link {
          font-size: 14px;
          opacity: 0.8;
          padding: 8px 10px;
          border-radius: 10px;
        }
        .link:hover { background: rgba(0,0,0,0.04); opacity: 1; }

        .container {
          max-width: 1040px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .hero {
          padding: 78px 0 42px;
        }
        .eyebrow {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          opacity: 0.7;
          margin: 0 0 14px;
        }
        .h1 {
          font-size: clamp(38px, 5vw, 56px);
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin: 0 0 14px;
          font-weight: 650;
        }
        .subhead {
          font-size: 18px;
          line-height: 1.6;
          max-width: 720px;
          opacity: 0.85;
          margin: 0 0 22px;
        }

        .ctaRow {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin: 14px 0 16px;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 14px;
          line-height: 1;
          border: 1px solid rgba(0,0,0,0.10);
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
          user-select: none;
          white-space: nowrap;
        }
        .btn:hover { transform: translateY(-1px); border-color: rgba(0,0,0,0.16); }
        .btnPrimary {
          background: #0b0b0f;
          color: #fff;
          border-color: #0b0b0f;
        }
        .btnPrimary:hover { background: #14141a; border-color: #14141a; }
        .btnGhost {
          background: rgba(0,0,0,0.02);
        }

        .fineprint {
          font-size: 13px;
          opacity: 0.7;
          max-width: 760px;
          margin: 10px 0 0;
        }

        .section { padding: 56px 0; }
        .muted { background: rgba(0,0,0,0.02); border-top: 1px solid rgba(0,0,0,0.04); border-bottom: 1px solid rgba(0,0,0,0.04); }

        .h2 {
          font-size: 26px;
          letter-spacing: -0.02em;
          margin: 0 0 14px;
          font-weight: 650;
        }
        .h3 {
          margin: 0 0 10px;
          font-size: 16px;
          font-weight: 650;
          letter-spacing: -0.01em;
        }
        .prose p {
          margin: 0 0 12px;
          font-size: 16px;
          line-height: 1.75;
          opacity: 0.9;
          max-width: 860px;
        }

        .bullets {
          margin: 14px 0 0;
          padding-left: 18px;
          max-width: 860px;
        }
        .bullets li {
          margin: 8px 0;
          line-height: 1.6;
          opacity: 0.9;
        }
        .bullets.compact li { margin: 6px 0; }

        .note {
          margin: 14px 0 0;
          font-size: 14px;
          opacity: 0.75;
        }

        .triptych {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .card {
          border: 1px solid rgba(0,0,0,0.08);
          background: #fff;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 1px 0 rgba(0,0,0,0.02);
        }
        .cardTitle {
          margin: 0 0 10px;
          font-size: 14px;
          opacity: 0.75;
        }
        .cardBody {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          opacity: 0.9;
        }

        .grid2 {
          display: grid;
          grid-template-columns: 1.4fr 0.9fr;
          gap: 14px;
          align-items: start;
          margin-top: 10px;
        }
        .panel {
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 18px;
          background: #fff;
        }
        .panelTitle {
          margin: 0 0 10px;
          font-size: 14px;
          opacity: 0.75;
        }
        .panelBody {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          opacity: 0.9;
        }

        .faq {
          margin-top: 14px;
          max-width: 860px;
        }
        details {
          border: 1px solid rgba(0,0,0,0.08);
          background: #fff;
          border-radius: 16px;
          padding: 14px 16px;
          margin-bottom: 10px;
        }
        summary {
          cursor: pointer;
          font-weight: 600;
          letter-spacing: -0.01em;
          list-style: none;
          outline: none;
        }
        details p {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.7;
          opacity: 0.9;
        }

        .footerCta {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .footerLine {
          margin: 0;
          font-size: 14px;
          opacity: 0.8;
        }

        .footer {
          margin-top: 26px;
          padding: 18px 0 0;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .footerInner {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          opacity: 0.75;
          padding-bottom: 10px;
        }

        @media (max-width: 900px) {
          .triptych { grid-template-columns: 1fr; }
          .grid2 { grid-template-columns: 1fr; }
          .navActions .link { display: none; }
        }
      `}</style>
    </main>
  );
}
