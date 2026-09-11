import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Onsemble" },
      {
        name: "description",
        content:
          "How Onsemble handles your account details, room content, photos, video calls and browser extension data.",
      },
      { property: "og:title", content: "Privacy Policy — Onsemble" },
      {
        property: "og:description",
        content: "What Onsemble collects, why, how long it's kept and the choices you have.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="11 September 2026"
      intro="This page explains what Onsemble collects, why we collect it, who can see it and what choices you have. We only collect what we need to run rooms, calls and synced playback."
    >
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details</strong> — your email address, display name and avatar. If you
            sign in with Google, we receive your name, email and profile picture from Google.
          </li>
          <li>
            <strong>Room content</strong> — room names, membership, invite codes, preferences, watch
            history entries, bookshelf items and notes, and the photos and captions you upload.
          </li>
          <li>
            <strong>Technical data</strong> — basic logs needed to keep the service running and
            secure, such as errors and connection failures.
          </li>
        </ul>
      </section>

      <section>
        <h2>What we don't collect</h2>
        <p>
          We don't record your video calls. Camera, microphone and screen streams travel directly
          between members' browsers; where a direct connection isn't possible, encrypted traffic is
          passed through a relay server that cannot read it. Nothing from a call is stored on our
          servers.
        </p>
        <p>
          We don't sell your data, and we don't use it for advertising or third-party ad tracking.
        </p>
      </section>

      <section>
        <h2>The browser extension</h2>
        <p>
          The Onsemble extension reads the playback state of the video on a supported streaming
          page — playing, paused and the current position — and passes it to the members of your
          room so playback stays in step. It doesn't read page content, browsing history, passwords
          or anything from other tabs, and it doesn't copy or store video.
        </p>
      </section>

      <section>
        <h2>Who can see your content</h2>
        <p>
          Photos, bookshelf items, notes and history in a saved room are visible to the members of
          that room, and to nobody else. Photo files are held in private storage and served through
          short-lived links to signed-in members. Anyone with a guest room code can join that room
          while it's active.
        </p>
      </section>

      <section>
        <h2>Where your data is stored</h2>
        <p>
          Account and room data is stored in our managed database and file storage, protected by
          access rules that check your membership on every request. Data may be processed on servers
          outside your country.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Room content stays until you or another member deletes it, or the room is deleted. When
          you delete your account we remove your profile and the content you own, apart from
          short-lived backups that expire on their own.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>Edit or remove your display name and avatar from your account page at any time.</li>
          <li>Delete individual photos, bookshelf items and history entries from a room.</li>
          <li>Leave a room to stop sharing with it.</li>
          <li>
            Ask for a copy of your data, or for it to be deleted, by emailing hello@onsemble.app.
          </li>
          <li>Remove the extension from your browser to stop all playback sync.</li>
        </ul>
      </section>

      <section>
        <h2>Cookies and local storage</h2>
        <p>
          We use cookies and browser storage only for essentials: keeping you signed in and
          remembering preferences such as your chosen camera and microphone. There are no
          advertising cookies.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>Onsemble isn't intended for children under 13, and we don't knowingly collect their data.</p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          We'll update this page when our practices change and adjust the date at the top. Privacy
          questions can be sent to hello@onsemble.app.
        </p>
      </section>
    </LegalPage>
  );
}
