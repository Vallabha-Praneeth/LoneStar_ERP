const EFFECTIVE_DATE = "April 23, 2026";
const SUPPORT_EMAIL = "support@quantum-ops.com";
const COMPANY = "QuantumOps Inc.";
const COMPANY_ADDRESS = "1630 W Prosper Trl Ste 410, Prosper, TX 75078-3742";

export default function PrivacyDriver() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-12">
      <article className="space-y-6 text-foreground leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm">
        <h1>LoneStar Fleet — Driver Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Effective {EFFECTIVE_DATE}</p>

        <p>
          This policy describes how {COMPANY} ("QuantumOps", "we") handles
          personal information in the LoneStar Fleet driver mobile application.
          It applies to drivers who sign in to the app to carry out delivery
          campaigns on behalf of a carrier that uses the LoneStar Fleet
          platform.
        </p>

        <h2>1. Information we collect</h2>
        <ul>
          <li>
            <strong>Account profile.</strong> Username, display name, email,
            and the role assigned to you by your carrier (driver). This is
            provisioned by your carrier's administrator and stored in our
            authentication system.
          </li>
          <li>
            <strong>Location data (foreground and background).</strong>
            {" "}
            While a shift is active, the app reads your device's GPS location
            — including when the app is in the background or the screen is
            off — and sends it to your dispatcher. Location collection stops
            automatically when you end your shift or sign out. Location is
            never collected when no shift is active.
          </li>
          <li>
            <strong>Photos you upload.</strong> Proof-of-delivery photos you
            capture in the app are uploaded to our storage. Each photo is
            associated with the specific stop on your route.
          </li>
          <li>
            <strong>Operational metadata.</strong> Shift start and end
            timestamps, per-stop completion timestamps, and the app version
            and OS platform you are using. We use this to keep records and
            to triage bugs.
          </li>
        </ul>

        <h2>2. How we use your information</h2>
        <ul>
          <li>
            Coordinate your shift with your dispatcher in real time
            (position updates, stop completions).
          </li>
          <li>
            Provide your carrier with audit evidence that a campaign was
            delivered as contracted (timestamps, photos, route coverage).
          </li>
          <li>
            Diagnose problems and improve the app (crash reports, basic
            error logs).
          </li>
        </ul>
        <p>
          We do not use your data for advertising, profiling, credit
          decisions, or any purpose unrelated to the delivery operations you
          perform for your carrier.
        </p>

        <h2>3. How we share your information</h2>
        <p>
          We do <strong>not</strong> sell or share your personal information
          with advertisers, data brokers, or any third party for their own
          marketing or monetization.
        </p>
        <ul>
          <li>
            <strong>Your carrier's administrators.</strong> Dispatchers and
            admins at your carrier can see your current position during an
            active shift, your uploaded photos, and your completion
            timestamps. This is the core purpose of the app.
          </li>
          <li>
            <strong>Supabase (processor).</strong> We use Supabase, Inc. to
            host our database, authentication, and photo storage. Supabase
            processes your data on our behalf under a data processing
            agreement and does not use it for any independent purpose.
          </li>
          <li>
            <strong>Legal disclosures.</strong> We may disclose information
            if we are required to by law (valid subpoena, court order) or
            to protect the safety of people or property.
          </li>
        </ul>

        <h2>4. Background location — specific notice</h2>
        <p>
          The app requests the Android{" "}
          <code>ACCESS_BACKGROUND_LOCATION</code> permission and the iOS
          equivalent so that your dispatcher can see your position while
          the app is closed during an active shift. Before the system
          permission dialog is shown, we present a disclosure screen inside
          the app explaining what the permission is for.
        </p>
        <ul>
          <li>
            Background location collection starts only when you start a
            shift, and stops automatically when you end it.
          </li>
          <li>
            You can decline the permission and still use the app — in that
            case position updates stop when the app is backgrounded.
          </li>
          <li>
            You can revoke the permission at any time in your device's
            Settings.
          </li>
        </ul>

        <h2>5. Data retention</h2>
        <p>
          We retain personal data only as long as needed for the purposes
          above and to meet our contractual and legal obligations to
          carriers:
        </p>
        <ul>
          <li>Account profile: until the account is deactivated by the carrier.</li>
          <li>Location history and shift records: up to 12 months for audit.</li>
          <li>Photos: per the carrier's retention contract (typically up to 24 months).</li>
          <li>Error logs: up to 90 days.</li>
        </ul>
        <p>You can request earlier deletion using the contact details in section 9.</p>

        <h2>6. Your rights</h2>
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>Access the personal information we hold about you.</li>
          <li>Request a copy of your data in a portable format.</li>
          <li>Ask us to correct inaccurate data.</li>
          <li>Ask us to delete your data.</li>
          <li>Withdraw consent for background location at any time (by revoking the permission in your device settings).</li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We will
          respond within 30 days.
        </p>

        <h2>7. Children</h2>
        <p>
          LoneStar Fleet is a workforce app for adult drivers operating
          under a carrier contract. It is not directed to children, and we
          do not knowingly collect information from anyone under 18.
        </p>

        <h2>8. Security</h2>
        <p>
          Data is transmitted over TLS and stored encrypted at rest.
          Database access is governed by row-level security policies that
          restrict each driver's visibility to their own shifts and
          campaigns. We rotate credentials on a regular cadence and
          immediately on any suspected exposure.
        </p>

        <h2>9. Contact</h2>
        <address className="not-italic">
          {COMPANY}
          <br />
          {COMPANY_ADDRESS}
          <br />
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </address>

        <h2>10. Changes to this policy</h2>
        <p>
          If we make material changes to this policy we will update the
          effective date above and notify drivers on next sign-in. Continued
          use of the app after a change constitutes acceptance of the
          updated policy.
        </p>
      </article>
    </main>
  );
}
