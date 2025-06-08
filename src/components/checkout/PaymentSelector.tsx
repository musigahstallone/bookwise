import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PaymentMethod } from '@/lib/payment-service';
import Image from 'next/image';

interface PaymentSelectorProps {
    onSelect: (method: PaymentMethod) => void;
    selectedMethod?: PaymentMethod;
}

export function PaymentSelector({ onSelect, selectedMethod }: PaymentSelectorProps) {
    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Select Payment Method</h3>
            <RadioGroup
                defaultValue={selectedMethod}
                onValueChange={(value) => onSelect(value as PaymentMethod)}
                className="space-y-4"
            >
                <div className="flex items-center space-x-4 rounded-lg border p-4 cursor-pointer hover:bg-slate-50">
                    <RadioGroupItem value="stripe" id="stripe" />
                    <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <span>Credit/Debit Card</span>
                            <div className="flex space-x-2">
                                <Image src="/visa.svg" alt="Visa" width={32} height={20} />
                                <Image src="/mastercard.svg" alt="Mastercard" width={32} height={20} />
                            </div>
                        </div>
                    </Label>
                </div>

                <div className="flex items-center space-x-4 rounded-lg border p-4 cursor-pointer hover:bg-slate-50">
                    <RadioGroupItem value="mpesa" id="mpesa" />
                    <Label htmlFor="mpesa" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <span>M-Pesa</span>
                            <Image src="/mpesa.svg" alt="M-Pesa" width={64} height={32} />
                        </div>
                    </Label>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <div className="flex items-center space-x-4 rounded-lg border p-4 cursor-pointer hover:bg-slate-50">
                        <RadioGroupItem value="mock" id="mock" />
                        <Label htmlFor="mock" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                                <span>Test Payment (Mock)</span>
                                <span className="text-sm text-muted-foreground">Development Only</span>
                            </div>
                        </Label>
                    </div>
                )}
            </RadioGroup>
        </Card>
    );
}
