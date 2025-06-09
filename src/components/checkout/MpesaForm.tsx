
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react'; // Added AlertTriangle

interface MpesaFormProps {
    amount: number; // Expected to be in KES
    onSubmit: (phoneNumber: string) => Promise<void>;
    isLoading: boolean;
}

export function MpesaForm({ amount, onSubmit, isLoading }: MpesaFormProps) {
    const [error, setError] = useState<string>();
    const { register, handleSubmit, formState: { errors, isValid } } = useForm<{ phoneNumber: string }>({
        mode: 'onChange', 
    });

    const onSubmitForm = async (data: { phoneNumber: string }) => {
        try {
            setError(undefined);
            await onSubmit(data.phoneNumber);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment failed');
        }
    };

    // Regex to allow various Kenyan formats: 07..., 01..., 254..., +254...
    // Actual normalization to 254XXXXXXXXX happens in PaymentHandler before API call
    const kenyanPhoneRegex = /^(?:\+?254|0)?(7\d{8}|1\d{8})$/;

    return (
        <Card className="p-4 sm:p-6 border-green-500 border">
            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="phoneNumberMpesa" className="text-sm sm:text-base">M-Pesa Phone Number</Label>
                    <Input
                        id="phoneNumberMpesa"
                        type="tel"
                        placeholder="e.g., 0712345678 or 254712345678"
                        className="text-sm sm:text-base"
                        {...register('phoneNumber', {
                            required: 'Phone number is required',
                            pattern: {
                                value: kenyanPhoneRegex,
                                message: 'Enter a valid Kenyan number (07xx, 01xx, 254xx, +254xx)'
                            }
                        })}
                        disabled={isLoading}
                    />
                    {errors.phoneNumber && (
                        <p className="text-xs sm:text-sm text-destructive flex items-center">
                            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1"/> {errors.phoneNumber.message}
                        </p>
                    )}
                </div>

                {error && (
                    <Alert variant="destructive" className="text-xs sm:text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        You will receive an STK push to pay <span className="font-semibold text-foreground">KES {amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>.
                        Enter your M-Pesa PIN when prompted.
                    </p>
                    <Button 
                        type="submit" 
                        className="w-full text-sm sm:text-base py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 text-white" 
                        disabled={isLoading || !isValid}
                    >
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : `Pay KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
