
'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setEmailSent(false);

    if (!email) {
      setError('Please enter your email address.');
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setEmailSent(true);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your inbox (and spam folder) for a link to reset your password.',
      });
    } catch (firebaseError: any) {
      let errorMessage = 'Failed to send password reset email. Please try again.';
      if (firebaseError.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      console.error("Firebase password reset error:", firebaseError);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="text-center space-y-4 py-6">
        <Mail className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="text-xl font-semibold text-foreground">Email Sent!</h3>
        <p className="text-muted-foreground">
          A password reset link has been sent to <strong className="text-primary">{email}</strong>.
          Please check your inbox and spam folder.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email-forgot" className="text-base">Email Address</Label>
        <Input
          id="email-forgot" 
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
          className="text-base"
          autoComplete="email"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Sending Email...
          </>
        ) : (
          'Send Reset Link'
        )}
      </Button>
    </form>
  );
}
