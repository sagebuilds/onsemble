import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Onsemble" },
      {
        name: "description",
        content:
          "The rules for using Onsemble: accounts, rooms, acceptable use, streaming services and account termination.",
      },
      { property: "og:title", content: "Terms of Service — Onsemble" },
      {
        property: "og:description",
        content: "The rules for using Onsemble rooms, video chat and synced playback.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="11 September 2026"
      intro="These terms are an agreement between you and Onsemble. By creating an account, joining a room or installing the Onsemble browser extension, you agree to them. If you don't agree, please don't use Onsemble."
    >
      <section>
        <h2>1. Who can use Onsemble</h2>
        <p>
          You must be at least 18 years old, and old enough to form a binding contract where you
          live. If you use Onsemble on behalf of an organisation, you confirm you're allowed to
          accept these terms for it.
        </p>
      </section>

      <section>
        <h2>2. Your account</h2>
        <p>
          You're responsible for the accuracy of your account details and for everything that
          happens under your account. Keep your password private, and tell us straight away if you
          think someone else has access.
        </p>
      </section>

      <section>
        <h2>3. Rooms and shared content</h2>
        <p>
          Rooms are shared spaces. Anything you add — bookshelf items, notes, photos, room names and
          preferences — is visible to every member of that room, and members can copy or download it
          outside Onsemble. Guest rooms joined by code are open to anyone who has the code.
        </p>
        <p>
          You keep ownership of what you upload. You give us permission to store, process and
          display it so that we can run the service for you and the other members of your rooms.
        </p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>upload content you don't have the rights to, or that is illegal or abusive;</li>
          <li>harass, threaten or impersonate other people;</li>
          <li>record or share other members' camera, microphone or screen without their consent;</li>
          <li>attempt to break, overload, scrape or reverse engineer the service;</li>
          <li>use Onsemble to circumvent any paywall, region lock or copy protection.</li>
        </ul>
      </section>

      <section>
        <h2>5. Streaming services and the extension</h2>
        <p>
          Onsemble is not affiliated with YouTube, Netflix, Disney+, Apple TV+ or Prime Video. The
          extension only sends play, pause and seek signals between browsers that are already
          watching. It does not stream, copy, decrypt or redistribute video. Every member needs
          their own valid subscription, and you remain bound by each service's own terms.
        </p>
      </section>

      <section>
        <h2>6. Video and screen sharing</h2>
        <p>
          Camera, microphone and screen sharing run peer-to-peer between members. Only share a
          screen or window you're comfortable with everyone in the room seeing, and remember that
          other members may capture what they see with tools outside Onsemble.
        </p>
      </section>

      <section>
        <h2>7. Availability</h2>
        <p>
          Onsemble is provided "as is". We may change, suspend or discontinue features at any time,
          and we can't promise the service will be uninterrupted, or that calls will connect on
          every network.
        </p>
      </section>

      <section>
        <h2>8. Suspension and deletion</h2>
        <p>
          We may suspend or remove accounts that break these terms or put other members at risk. You
          can stop using Onsemble at any time; deleting your account removes your profile and the
          content you own, subject to short-lived backups.
        </p>
      </section>

      <section>
        <h2>9. Liability</h2>
        <p>
          To the extent the law allows, Onsemble isn't liable for indirect or consequential losses,
          lost data, or content shared by other members of your rooms.
        </p>
      </section>

      <section>
        <h2>10. Changes and contact</h2>
        <p>
          We'll update this page when these terms change and adjust the date at the top. Questions
          about these terms can be sent to sage@sagefranch.com.
        </p>
      </section>
    </LegalPage>
  );
}
