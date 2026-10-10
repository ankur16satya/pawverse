import Link from 'next/link'
import LegalPage, { SUPPORT_EMAIL } from '../components/LegalPage'

const LAST_UPDATED = '10 October 2026'

const sections = [
  {
    id: 'introduction',
    title: 'Introduction',
    body: (
      <>
        <p>
          PawVerse Social ("<strong>PawVerse</strong>", "we", "us", "our") operates the website and progressive web app at
          {' '}<a href="https://pawversesocial.com">pawversesocial.com</a> — a social network for pet parents, pet lovers,
          veterinarians and pet suppliers in India.
        </p>
        <p>
          This Privacy Policy explains what personal data we collect, why we collect it, who we share it with and the
          choices you have. It is published in accordance with the Information Technology Act, 2000, the Information
          Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011
          and the Digital Personal Data Protection Act, 2023.
        </p>
        <p>By creating an account or using PawVerse, you agree to the practices described in this policy.</p>
      </>
    ),
  },
  {
    id: 'data-we-collect',
    title: 'Information We Collect',
    body: (
      <>
        <p><strong>Information you give us</strong></p>
        <ul>
          <li><strong>Account details</strong> — email address, password (stored securely in hashed form by our authentication provider), your name and the account type you choose (Pet Parent, Pet Lover, Vet or Supplier).</li>
          <li><strong>Pet profile</strong> — pet name, type, breed, photos, bio and general location.</li>
          <li><strong>Content you post</strong> — photos, videos, reels, captions, comments, likes, and blog interactions.</li>
          <li><strong>Messages</strong> — chats you exchange with friends and other users, including shared media.</li>
          <li><strong>Pet health records</strong> — vaccinations, weight logs, vet visits and other details you add to the Health tracker.</li>
          <li><strong>Adoption listings</strong> — pet details plus the contact details you choose to share (name, phone, WhatsApp, email, preferred contact method).</li>
          <li><strong>Marketplace & services</strong> — product or service listings, prices, city and business details.</li>
          <li><strong>Vet verification</strong> — veterinary license or registration certificates uploaded by vets.</li>
          <li><strong>Appointments</strong> — the clinic, date, time slot, pet name, your name and email when you book a vet consultation.</li>
        </ul>
        <p><strong>Information collected automatically</strong></p>
        <ul>
          <li><strong>Usage and device data</strong> — pages visited, features used, browser type, device type, IP address and approximate location derived from it.</li>
          <li><strong>Push notification tokens</strong> — if you allow notifications, a subscription token for your browser/device.</li>
          <li><strong>Local storage & cookies</strong> — used to keep you signed in and remember preferences. We do not use third-party advertising cookies.</li>
        </ul>
        <p><strong>Payment information</strong></p>
        <p>
          Payments are processed by <strong>Razorpay</strong>. Your card, UPI, net-banking or wallet details are entered
          directly with Razorpay and are never stored on PawVerse servers. We only receive and keep the order ID, payment
          ID, amount and payment status. Where you pay by UPI transfer, we may store the UTR/reference number you provide.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Information',
    body: (
      <ul>
        <li>To create and manage your account and pet profiles.</li>
        <li>To show your posts, reels and profile to other users according to the platform's features.</li>
        <li>To enable chats, friend requests, comments and notifications (in-app, email and push).</li>
        <li>To connect adopters with people listing pets for adoption.</li>
        <li>To let you book and pay for vet consultations and send booking confirmations to you and the vet.</li>
        <li>To verify veterinarians before activating vet accounts.</li>
        <li>To run the PawCoins rewards programme.</li>
        <li>To keep PawVerse safe — detecting spam, fraud, abuse and violations of our <Link href="/terms-and-conditions">Terms & Conditions</Link>.</li>
        <li>To improve and develop the product, and to comply with legal obligations.</li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: 'How Your Information Is Shared',
    body: (
      <>
        <p><strong>We do not sell your personal data.</strong> We share it only in these situations:</p>
        <ul>
          <li><strong>With other users</strong> — your profile, pet details, posts and reels are visible to other PawVerse users. Contact details on adoption or marketplace listings are visible to people viewing those listings.</li>
          <li><strong>With vets you book</strong> — your name, email, pet name and appointment details are shared with the vet or clinic.</li>
          <li>
            <strong>With service providers</strong> who help us run PawVerse, under confidentiality obligations:
            <ul>
              <li>Supabase — database, authentication and file storage</li>
              <li>Cloudinary — image and video hosting</li>
              <li>Razorpay — payment processing</li>
              <li>Vercel — website hosting</li>
              <li>Email and browser push-notification delivery services</li>
            </ul>
          </li>
          <li><strong>For legal reasons</strong> — when required by law, court order or government authority, or to protect the rights, safety and property of PawVerse, our users or the public.</li>
          <li><strong>Business transfers</strong> — if PawVerse is involved in a merger, acquisition or sale of assets, your data may transfer as part of that transaction, subject to this policy.</li>
        </ul>
        <p>Some of these providers may store data on servers outside India. We take reasonable steps to ensure your data receives an adequate level of protection.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Data Retention',
    body: (
      <>
        <p>We keep your personal data for as long as your account is active or as needed to provide our services.</p>
        <ul>
          <li>When you delete your account, we delete or anonymise your personal data within <strong>30 days</strong> of verifying the request.</li>
          <li>Payment and appointment records may be retained for up to <strong>8 years</strong> where required under tax, accounting or other applicable laws.</li>
          <li>Residual copies may remain in encrypted backups for a limited period before being overwritten.</li>
          <li>Messages you sent to other users may remain visible in their conversation history in anonymised form.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your Rights & Choices',
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access</strong> the personal data we hold about you.</li>
          <li><strong>Correct</strong> inaccurate or incomplete data — most of it can be edited directly from your profile.</li>
          <li><strong>Erase</strong> your account and personal data — see our <Link href="/delete-account">Delete Account</Link> page.</li>
          <li><strong>Withdraw consent</strong> for optional processing such as push notifications (via your browser settings) at any time.</li>
          <li><strong>Nominate</strong> another person to exercise your rights in the event of your death or incapacity.</li>
          <li><strong>Raise a grievance</strong> with our Grievance Officer (see below), and, if unresolved, with the Data Protection Board of India.</li>
        </ul>
        <p>To exercise any of these rights, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your registered email address.</p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Data Security',
    body: (
      <p>
        We use reasonable security practices, including encrypted connections (HTTPS), hashed passwords, access controls
        and row-level database security, to protect your data. However, no method of transmission or storage is 100%
        secure, and we cannot guarantee absolute security. Please keep your password confidential and let us know
        immediately if you suspect unauthorised access to your account.
      </p>
    ),
  },
  {
    id: 'children',
    title: "Children's Privacy",
    body: (
      <p>
        PawVerse is intended for users aged 18 and above. Users under 18 may use PawVerse only with the consent and
        supervision of a parent or legal guardian. We do not knowingly collect personal data from children without
        verifiable parental consent. If you believe a child has provided us data without such consent, contact us and we
        will delete it.
      </p>
    ),
  },
  {
    id: 'third-party-links',
    title: 'Third-Party Links',
    body: (
      <p>
        PawVerse may contain links to third-party websites or services (for example, payment pages or links shared by
        users). We are not responsible for the privacy practices of those third parties, and we encourage you to read
        their policies.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    body: (
      <p>
        We may update this Privacy Policy from time to time. The "Last updated" date at the top shows when it was last
        revised. If changes are significant, we will notify you through the app or by email. Continued use of PawVerse
        after changes means you accept the updated policy.
      </p>
    ),
  },
  {
    id: 'grievance-officer',
    title: 'Grievance Officer & Contact',
    body: (
      <>
        <p>In accordance with the Information Technology Act, 2000 and rules made thereunder, you may contact our Grievance Officer:</p>
        <p>
          <strong>Grievance Officer, PawVerse Social</strong><br />
          Dehradun, Uttarakhand, India<br />
          Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p>We will acknowledge your complaint within 24 hours and aim to resolve it within 15 days.</p>
      </>
    ),
  },
]

export default function PrivacyPolicy() {
  return (
    <LegalPage
      current="/privacy-policy"
      title="Privacy Policy"
      subtitle="How PawVerse collects, uses and protects your information — and your pet's."
      lastUpdated={LAST_UPDATED}
      sections={sections}
      seo={{
        title: 'Privacy Policy | PawVerse',
        description: 'Read the PawVerse Privacy Policy — what data we collect, how we use it, who we share it with, and your rights under Indian data protection law.',
        keywords: 'PawVerse privacy policy, pet social network privacy, data protection India, DPDP Act',
        canonical: 'https://pawversesocial.com/privacy-policy',
      }}
    />
  )
}

export async function getStaticProps() {
  return { props: {} }
}
