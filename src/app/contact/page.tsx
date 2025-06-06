
import { Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <Mail className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary sm:text-5xl">
          Contact Us
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Have questions or feedback? We&apos;d love to hear from you!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Send us a Message</CardTitle>
            <CardDescription>Fill out the form and we&apos;ll get back to you shortly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="#" method="POST" className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-base">Full Name</Label>
                <Input type="text" name="name" id="name" autoComplete="name" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email" className="text-base">Email Address</Label>
                <Input type="email" name="email" id="email" autoComplete="email" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="subject" className="text-base">Subject</Label>
                <Input type="text" name="subject" id="subject" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="message" className="text-base">Message</Label>
                <Textarea name="message" id="message" rows={4} className="mt-1" />
              </div>
              <div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  Send Message
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center">
                <Mail className="h-6 w-6 mr-3 text-primary" />
                Email Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                For general inquiries, support, or feedback:
              </p>
              <a href="mailto:support@bookwise.example.com" className="text-primary hover:underline text-lg font-medium">
                support@bookwise.example.com
              </a>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center">
                <Phone className="h-6 w-6 mr-3 text-primary" />
                Call Us (Placeholder)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our phone lines are open Mon-Fri, 9am-5pm.
              </p>
              <p className="text-primary text-lg font-medium">
                +1 (555) 123-4567
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
