
import { FileText } from 'lucide-react';

export default function TermsConditionsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <FileText className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary sm:text-5xl">
          Terms and Conditions
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
      <div className="prose prose-lg mx-auto text-foreground text-base leading-relaxed space-y-6">
        <p>
          Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the BookWise website (the "Service") operated by BookWise ("us", "we", or "our").
        </p>
        <p>
          Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.
        </p>

        <h2 className="font-headline text-2xl text-primary pt-4">Purchases</h2>
        <p>
          If you wish to purchase any product or service made available through the Service ("Purchase"), you may be asked to supply certain information relevant to your Purchase including, without limitation, your credit card number, the expiration date of your credit card, your billing address, and your shipping information (if applicable). All book purchases provide access to a PDF download.
        </p>

        <h2 className="font-headline text-2xl text-primary pt-4">Content</h2>
        <p>
          Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness. (This section would be more relevant if users could upload content, which is not currently a feature).
        </p>
        
        <h2 className="font-headline text-2xl text-primary pt-4">Intellectual Property</h2>
        <p>
          The Service and its original content (excluding Content provided by users), features, and functionality are and will remain the exclusive property of BookWise and its licensors. The books offered for sale are the intellectual property of their respective authors and publishers. Your purchase grants you a license to download and use the PDF for personal, non-commercial use.
        </p>

        <h2 className="font-headline text-2xl text-primary pt-4">Links To Other Web Sites</h2>
        <p>
          Our Service may contain links to third-party web sites or services that are not owned or controlled by BookWise. BookWise has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third-party web sites or services.
        </p>

        <h2 className="font-headline text-2xl text-primary pt-4">Termination</h2>
        <p>
          We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </p>
        
        <h2 className="font-headline text-2xl text-primary pt-4">Governing Law</h2>
        <p>
          These Terms shall be governed and construed in accordance with the laws of Your Jurisdiction, without regard to its conflict of law provisions.
        </p>

        <h2 className="font-headline text-2xl text-primary pt-4">Changes</h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect.
        </p>

        <h2 className="font-headline text-2xl text-primary pt-4">Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us via our <a href="/contact" className="text-accent hover:underline">Contact Page</a>.
        </p>
        <p className="text-sm text-muted-foreground pt-6">
          (This is a placeholder Terms and Conditions page. For a real application, consult with a legal professional.)
        </p>
      </div>
    </div>
  );
}
