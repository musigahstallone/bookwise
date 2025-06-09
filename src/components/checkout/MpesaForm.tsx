
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface MpesaFormProps {
    amount: number; // Expected to be in KES
    onSubmit: (phoneNumber: string) => Promise<void>;
    isLoading: boolean;
}

export function MpesaForm({ amount, onSubmit, isLoading }: MpesaFormProps) {
    const [error, setError] = useState<string>();
    const { register, handleSubmit, formState: { errors, isValid } } = useForm<{ phoneNumber: string }>({
        mode: 'onChange', // Validate on change to enable/disable button
    });

    const onSubmitForm = async (data: { phoneNumber: string }) => {
        try {
            setError(undefined);
            await onSubmit(data.phoneNumber);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment failed');
        }
    };

    // Regex to allow 07..., 01..., 2547..., 2541..., +2547..., +2541...
    // This is for initial validation, actual normalization happens in PaymentHandler
    const kenyanPhoneRegex = /^(?:\+?254|0)?(7\d{8}|1\d{8})$/;


    return (
        <Card className="p-6">
            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="phoneNumber">M-Pesa Phone Number</Label>
                    <Input
                        id="phoneNumber"
                        placeholder="e.g., 0712345678 or 254712345678"
                        {...register('phoneNumber', {
                            required: 'Phone number is required',
                            pattern: {
                                value: kenyanPhoneRegex,
                                message: 'Enter a valid Kenyan phone number (e.g., 07xxxxxxxx, 254xxxxxxxxx)'
                            }
                        })}
                    />
                    {errors.phoneNumber && (
                        <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                    )}
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        You will receive an STK push on your phone to pay <span className="font-semibold">KES {amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>.
                        Ensure the request is from <span className="font-semibold text-primary">BOOKWISE STORES GLOBAL</span> before entering your M-Pesa PIN.
                    </p>
                    <Button type="submit" className="w-full" disabled={isLoading || !isValid}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : `Pay KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} with M-Pesa`}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

