import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MpesaFormProps {
    amount: number;
    onSubmit: (phoneNumber: string) => Promise<void>;
    isLoading: boolean;
}

export function MpesaForm({ amount, onSubmit, isLoading }: MpesaFormProps) {
    const [error, setError] = useState<string>();
    const { register, handleSubmit, formState: { errors } } = useForm<{ phoneNumber: string }>();

    const onSubmitForm = async (data: { phoneNumber: string }) => {
        try {
            setError(undefined);
            await onSubmit(data.phoneNumber);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment failed');
        }
    };

    return (
        <Card className="p-6">
            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="phoneNumber">M-Pesa Phone Number</Label>
                    <Input
                        id="phoneNumber"
                        placeholder="254712345678"
                        {...register('phoneNumber', {
                            required: 'Phone number is required',
                            pattern: {
                                value: /^254\d{9}$/,
                                message: 'Please enter a valid Kenyan phone number starting with 254'
                            }
                        })}
                    />
                    {errors.phoneNumber && (
                        <p className="text-sm text-red-500">{errors.phoneNumber.message}</p>
                    )}
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        You will receive a prompt on your phone to pay KES {amount}
                    </p>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Processing...' : 'Pay with M-Pesa'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
