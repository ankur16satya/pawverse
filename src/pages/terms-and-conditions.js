import Link from 'next/link'
import LegalPage, { SUPPORT_EMAIL } from '../components/LegalPage'

const LAST_UPDATED = '10 October 2026'

const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    body: (
      <>
        <p>
          These Terms & Conditions ("<strong>Terms</strong>") govern your use of the PawVerse website and app at
          {' '}<a href="https://pawversesocial.com">pawversesocial.com</a>, operated by PawVerse Social ("PawVerse", "we",
          "us"). By creating an account or using PawVerse, you agree to these Terms, our{' '}
          <Link href="/privacy-policy">Privacy Policy</Link> and our <Link href="/refund-policy">Refund Policy</Link>.
        </p>
        <p>If you do not agree, please do not use PawVerse.</p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Eligibility & Accounts',
    body: (
      <ul>
        <li>You must be at least 18 years old, or use PawVerse with the consent and supervision of a parent or legal guardian.</li>
        <li>You must provide accurate information when signing up and keep it up to date.</li>
        <li>You are responsible for keeping your password confidential and for all activity under your account.</li>
        <li>One person may not maintain multiple accounts to evade restrictions or mislead others.</li>
        <li>Vet accounts must belong to registered veterinary practitioners and remain inactive until verification is complete. Uploading forged or someone else's credentials will result in permanent suspension and may be reported to authorities.</li>
        <li>Supplier accounts must provide truthful business information and comply with all applicable laws.</li>
      </ul>
    ),
  },
  {
    id: 'services',
    title: 'Our Services',
    body: (
      <>
        <p>PawVerse provides:</p>
        <ul>
          <li>A social feed, reels, comments, friends and chat for pet lovers.</li>
          <li>An adoption board connecting people rehoming pets with potential adopters.</li>
          <li>A marketplace where independent suppliers and service providers list pet products and services.</li>
          <li>Vet consultation listings and appointment booking with online payment.</li>
          <li>A pet health tracker for vaccinations, weight and medical history.</li>
          <li>PawCoins, a rewards programme.</li>
        </ul>
        <p>We may add, change, suspend or discontinue any feature at any time.</p>
      </>
    ),
  },
  {
    id: 'user-content',
    title: 'Your Content',
    body: (
      <>
        <p>
          You own the photos, videos, posts, comments and other content you share ("<strong>Content</strong>"). By
          posting Content, you grant PawVerse a non-exclusive, royalty-free, worldwide licence to host, store, display,
          reproduce and distribute it for the purpose of operating, promoting and improving PawVerse. This licence ends
          when you delete the Content or your account, except where it has been shared by others or must be retained by law.
        </p>
        <p>You confirm you have the rights to everything you post and that it does not infringe anyone else's rights.</p>
      </>
    ),
  },
  {
    id: 'prohibited',
    title: 'Prohibited Conduct',
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Post content showing or promoting animal cruelty, abuse, illegal breeding, dog fighting or neglect.</li>
          <li>Buy, sell or list wildlife, protected or endangered species, or any animal in violation of the Wildlife (Protection) Act, 1972, the Prevention of Cruelty to Animals Act, 1960 or related rules.</li>
          <li>Sell pets for profit through the adoption board, or charge "adoption fees" that are actually sales.</li>
          <li>Post content that is obscene, hateful, harassing, defamatory, misleading or violates anyone's privacy.</li>
          <li>Impersonate any person, vet, clinic or business.</li>
          <li>Spam, scam, phish or solicit payments outside the platform under false pretences.</li>
          <li>Upload viruses or malicious code, scrape data, or try to access accounts or systems without permission.</li>
          <li>Use PawVerse for any unlawful purpose.</li>
        </ul>
        <p>We may remove content and suspend or terminate accounts that violate these rules, with or without notice.</p>
      </>
    ),
  },
  {
    id: 'adoption',
    title: 'Pet Adoption',
    body: (
      <ul>
        <li>PawVerse only connects people. We do not own, inspect, house or guarantee any animal listed for adoption.</li>
        <li>Listers must provide honest information about the pet's health, temperament, vaccination and history.</li>
        <li>Adopters are responsible for meeting the pet and the lister, verifying information, and making their own decision.</li>
        <li>Never send money in advance to someone you have not met. Report suspicious listings to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</li>
        <li>PawVerse is not liable for any dispute, injury, illness or loss arising from an adoption.</li>
      </ul>
    ),
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    body: (
      <ul>
        <li>Products and services on the marketplace are listed by independent sellers. PawVerse is an intermediary platform and is not the seller.</li>
        <li>Sellers are solely responsible for the accuracy of their listings, product quality, legality, pricing, delivery and after-sales support.</li>
        <li>Sellers must comply with the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020, including displaying accurate prices and their contact details.</li>
        <li>Returns and refunds for marketplace purchases are handled as described in our <Link href="/refund-policy">Refund Policy</Link>.</li>
      </ul>
    ),
  },
  {
    id: 'vet-consultations',
    title: 'Vet Consultations',
    body: (
      <ul>
        <li>Vets on PawVerse are independent practitioners. PawVerse does not provide veterinary advice and is not responsible for any diagnosis, treatment or outcome.</li>
        <li>Content on PawVerse (including blogs, posts and the health tracker) is for general information only and is not a substitute for professional veterinary care.</li>
        <li>In an emergency, contact your nearest veterinary clinic immediately.</li>
        <li>Consultation fees are set by the vet and paid through Razorpay. Cancellations and refunds follow our <Link href="/refund-policy">Refund Policy</Link>.</li>
      </ul>
    ),
  },
  {
    id: 'pawcoins',
    title: 'PawCoins',
    body: (
      <ul>
        <li>PawCoins are promotional reward points with no cash value. They cannot be bought, sold, transferred or exchanged for money.</li>
        <li>We may change how PawCoins are earned, their value, available rewards or end the programme at any time.</li>
        <li>PawCoins earned through fraud, abuse or errors may be removed. Unused PawCoins are forfeited when an account is deleted or terminated.</li>
      </ul>
    ),
  },
  {
    id: 'payments',
    title: 'Payments',
    body: (
      <p>
        All online payments are processed securely by Razorpay. By making a payment you also agree to Razorpay's terms.
        Prices are in Indian Rupees (₹) and include applicable taxes unless stated otherwise. PawVerse does not store your
        card or bank details.
      </p>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    body: (
      <p>
        The PawVerse name, logo, design, software and all content created by us are owned by PawVerse Social and protected
        by law. You may not copy, modify, distribute or create derivative works from them without our written permission.
      </p>
    ),
  },
  {
    id: 'disclaimer',
    title: 'Disclaimers & Limitation of Liability',
    body: (
      <>
        <p>
          PawVerse is provided "as is" and "as available" without warranties of any kind. We do not guarantee that the
          service will be uninterrupted, error-free or secure, or that information posted by users is accurate.
        </p>
        <p>
          To the maximum extent permitted by law, PawVerse and its team will not be liable for any indirect, incidental,
          special or consequential damages, or for any loss arising from your dealings with other users, sellers, adopters or
          vets. Our total liability for any claim shall not exceed the amount you paid to PawVerse in the three months before
          the claim arose.
        </p>
      </>
    ),
  },
  {
    id: 'indemnity',
    title: 'Indemnity',
    body: (
      <p>
        You agree to indemnify and hold PawVerse harmless from any claims, losses or expenses (including legal fees)
        arising from your Content, your use of PawVerse, or your violation of these Terms or any law.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    body: (
      <p>
        You can stop using PawVerse and request deletion of your account at any time from our{' '}
        <Link href="/delete-account">Delete Account</Link> page. We may suspend or terminate your access if you violate these
        Terms, if required by law, or to protect PawVerse or its users.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law & Disputes',
    body: (
      <p>
        These Terms are governed by the laws of India. Any dispute will be subject to the exclusive jurisdiction of the
        courts at Dehradun, Uttarakhand. Before going to court, we encourage you to contact us so we can try to resolve the
        issue informally.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    body: (
      <p>
        We may update these Terms from time to time. The "Last updated" date shows the latest revision. Continued use of
        PawVerse after changes take effect means you accept the updated Terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact & Grievances',
    body: (
      <p>
        For questions, complaints or to report content, contact our Grievance Officer at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> (PawVerse Social, Dehradun, Uttarakhand, India). We will
        acknowledge complaints within 24 hours and aim to resolve them within 15 days.
      </p>
    ),
  },
]

export default function TermsAndConditions() {
  return (
    <LegalPage
      current="/terms-and-conditions"
      title="Terms & Conditions"
      subtitle="The rules of the pack — what you can expect from PawVerse and what we expect from you."
      lastUpdated={LAST_UPDATED}
      sections={sections}
      seo={{
        title: 'Terms & Conditions | PawVerse',
        description: 'Read the PawVerse Terms & Conditions covering accounts, content, pet adoption, marketplace, vet consultations, PawCoins and payments.',
        keywords: 'PawVerse terms and conditions, PawVerse terms of service, pet adoption rules, pet marketplace terms',
        canonical: 'https://pawversesocial.com/terms-and-conditions',
      }}
    />
  )
}

export async function getStaticProps() {
  return { props: {} }
}
