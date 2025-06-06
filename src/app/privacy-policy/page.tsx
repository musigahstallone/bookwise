
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <ShieldCheck className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
      <div className="prose prose-lg mx-auto text-foreground text-base leading-relaxed space-y-6">
        <p>
          BookWise ("us", "we", or "our") operates the BookWise website (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
        </p>

        <h2 className="font-headline text-2xl text-primary pt-4">Information Collection and Use</h2>
        <p>
          We collect several different types of information for various purposes to provide and improve our Service to you. This may include, but is not limited to, your name, email address, payment information (processed securely by third-party vendors), and browsing activity.
        </p>

        <h2 className="font-headline text-2xl text-primary pt-4">Use of Data</h2>
        <p>
          BookWise uses the collected data for various purposes:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>To provide and maintain our Service</li>
          <li>To notify you about changes to our Service</li>
          <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
          <li>To provide customer support</li>
          <li>To gather analysis or valuable information so that we can improve our Service</li>
          <li>To monitor the usage of our Service</li>
          <li>To detect, prevent and address technical issues</li>
          <li>To process your transactions</li>
        </ul>

        <h2 className="font-headline text-2xl text-primary pt-4">Data Security</h2>
        <p>
          The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
        </p>

        <h2 className="font-headline text-2xl text-primary pt-4">Third-Party Services</h2>
        <p>
          We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), provide the Service on our behalf, perform Service-related services, or assist us in analyzing how our Service is used. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
        </p>
        
        <h2 className="font-headline text-2xl text-primary pt-4">Changes to This Privacy Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
        </p>

        <h2 className="font-headline text-2xl text-primary pt-4">Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us through our <a href="/contact" className="text-accent hover:underline">Contact Page</a>.
        </p>
        <p className="text-sm text-muted-foreground pt-6">
          (This is a placeholder privacy policy. For a real application, consult with a legal professional.)
        </p>
      </div>
    </div>
  );
}
