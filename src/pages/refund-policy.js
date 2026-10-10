import Link from 'next/link'
import LegalPage, { SUPPORT_EMAIL } from '../components/LegalPage'

const LAST_UPDATED = '10 October 2026'

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    body: (
      <>
        <p>
          Most of PawVerse is free — creating an account, posting, chatting, listing pets for adoption and listing products
          cost nothing. This Refund & Cancellation Policy applies to the paid parts of PawVerse: <strong>vet consultation
          bookings</strong> and <strong>marketplace purchases</strong>.
        </p>
        <p>All payments are processed securely by Razorpay in Indian Rupees (₹).</p>
      </>
    ),
  },
  {
    id: 'vet-consultations',
    title: 'Vet Consultation Bookings',
    body: (
      <>
        <p><strong>Cancellation by you</strong></p>
        <ul>
          <li>Cancelled <strong>24 hours or more</strong> before the appointment — <strong>100% refund</strong> of the consultation fee.</li>
          <li>Cancelled <strong>less than 24 hours</strong> before the appointment — <strong>50% refund</strong>.</li>
          <li>No-show without cancelling — <strong>no refund</strong>.</li>
        </ul>
        <p><strong>Cancellation by the vet or clinic</strong></p>
        <ul>
          <li>If the vet rejects, cancels or fails to attend the appointment, you will receive a <strong>100% refund</strong>, or you may choose to reschedule at no extra cost.</li>
        </ul>
        <p><strong>Rescheduling</strong></p>
        <ul>
          <li>You may request to reschedule once, free of charge, at least 24 hours before the appointment, subject to the vet's availability.</li>
        </ul>
        <p>
          Refunds are for the booking fee only. PawVerse is not responsible for the medical outcome of a consultation;
          concerns about treatment should be raised with the vet directly.
        </p>
      </>
    ),
  },
  {
    id: 'marketplace',
    title: 'Marketplace Purchases',
    body: (
      <>
        <p>
          Products and services on the PawVerse marketplace are sold by independent sellers. Each seller is responsible
          for their own returns and refunds, but at a minimum:
        </p>
        <ul>
          <li>If an item arrives <strong>damaged, defective, expired or materially different</strong> from its listing, report it within <strong>48 hours of delivery</strong> with photos to be eligible for a replacement or full refund.</li>
          <li>Perishable items (food, treats), opened hygiene products, medicines and customised items are <strong>not returnable</strong> unless damaged or incorrect.</li>
          <li>If an order is not delivered, you are entitled to a full refund.</li>
          <li>If a seller does not respond within 48 hours, contact us and we will help mediate.</li>
        </ul>
        <p>For purchases arranged directly with a seller outside PawVerse's payment system, the refund is between you and the seller.</p>
      </>
    ),
  },
  {
    id: 'non-refundable',
    title: 'Non-Refundable Items',
    body: (
      <ul>
        <li><strong>PawCoins</strong> — these are free reward points with no cash value and cannot be refunded or exchanged for money.</li>
        <li><strong>Adoption</strong> — PawVerse does not charge any fee for adoption. Any money exchanged between a lister and an adopter is outside PawVerse and not covered by this policy. Never pay in advance for a pet you have not met.</li>
        <li>Consultations that have already taken place.</li>
      </ul>
    ),
  },
  {
    id: 'how-to-request',
    title: 'How to Request a Refund',
    body: (
      <>
        <p>Email <a href={`mailto:${SUPPORT_EMAIL}?subject=Refund%20Request`}>{SUPPORT_EMAIL}</a> from your registered email address with:</p>
        <ul>
          <li>Your name and registered email</li>
          <li>The Razorpay Payment ID or Booking ID (found in your confirmation email)</li>
          <li>The reason for the refund, with photos if the request relates to a product</li>
        </ul>
        <p>We will acknowledge your request within 24 hours and confirm whether the refund is approved within 3 business days.</p>
      </>
    ),
  },
  {
    id: 'processing',
    title: 'Refund Processing Time',
    body: (
      <>
        <p>
          Approved refunds are issued to the <strong>original payment method</strong> (card, UPI, net banking or wallet)
          through Razorpay. Refunds usually reflect in your account within <strong>5–7 business days</strong>, depending on
          your bank.
        </p>
        <p>If you haven't received your refund after 10 business days, please contact us with your Payment ID and we will follow up with Razorpay.</p>
      </>
    ),
  },
  {
    id: 'failed-payments',
    title: 'Failed or Duplicate Payments',
    body: (
      <p>
        If money was debited but your booking was not confirmed, or you were charged twice for the same booking, the amount
        is automatically refunded by Razorpay, typically within 5–7 business days. If it is not, contact us with the
        transaction details and we will resolve it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes & Contact',
    body: (
      <p>
        We may update this policy from time to time; the "Last updated" date shows the latest version. This policy should
        be read together with our <Link href="/terms-and-conditions">Terms & Conditions</Link>. For any questions, write to
        {' '}<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    ),
  },
]

export default function RefundPolicy() {
  return (
    <LegalPage
      current="/refund-policy"
      title="Refund & Cancellation Policy"
      subtitle="Clear, fair rules for vet bookings and marketplace orders on PawVerse."
      lastUpdated={LAST_UPDATED}
      sections={sections}
      seo={{
        title: 'Refund & Cancellation Policy | PawVerse',
        description: 'PawVerse refund and cancellation policy for vet consultation bookings and marketplace purchases, including timelines and how to request a refund.',
        keywords: 'PawVerse refund policy, vet booking cancellation, pet marketplace refund, Razorpay refund',
        canonical: 'https://pawversesocial.com/refund-policy',
      }}
    />
  )
}

export async function getStaticProps() {
  return { props: {} }
}
