
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PaymentMethod } from '@/lib/payment-service';
import Image from 'next/image';
import { CreditCard, Smartphone, Layers } from 'lucide-react'; // Added Layers for Mock

interface PaymentSelectorProps {
    onSelect: (method: PaymentMethod) => void;
    selectedMethod?: PaymentMethod;
    disabled?: boolean;
}

const paymentOptions = [
    { 
        value: "stripe" as PaymentMethod, 
        id: "stripe", 
        label: "Credit/Debit Card", 
        icons: [
            { src: "/payment-providers/stripe.svg", alt: "Stripe", width: 50, height: 20 } // Updated path
        ],
        lucideIcon: <CreditCard className="h-5 w-5 text-primary mr-2" />
    },
    { 
        value: "mpesa" as PaymentMethod, 
        id: "mpesa", 
        label: "M-Pesa", 
        icons: [{ src: "/payment-providers/mpesa.jpg", alt: "M-Pesa", width: 70, height: 20 }], // Updated path & dimensions
        lucideIcon: <Smartphone className="h-5 w-5 text-green-600 mr-2" />
    },
];

if (process.env.NODE_ENV === 'development') {
    paymentOptions.push({
        value: "mock" as PaymentMethod,
        id: "mock",
        label: "Test Payment (Mock)",
        description: "Development Only",
        icons: [],
        lucideIcon: <Layers className="h-5 w-5 text-gray-500 mr-2" /> // Changed icon for mock
    });
}


export function PaymentSelector({ onSelect, selectedMethod, disabled }: PaymentSelectorProps) {
    return (
        <Card className="p-4 sm:p-6">
            <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4">Select Payment Method</h3>
            <RadioGroup
                value={selectedMethod}
                onValueChange={(value) => onSelect(value as PaymentMethod)}
                className="space-y-3"
                disabled={disabled}
            >
                {paymentOptions.map((option) => (
                    <Label 
                        key={option.id}
                        htmlFor={option.id} 
                        className={`flex items-center space-x-3 rounded-lg border p-3 sm:p-4 cursor-pointer transition-colors hover:bg-muted/50 ${selectedMethod === option.value ? 'border-primary ring-2 ring-primary' : 'border-border'} ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        <RadioGroupItem value={option.value} id={option.id} disabled={disabled} />
                        {option.lucideIcon}
                        <div className="flex-1">
                            <span className="font-medium text-sm sm:text-base">{option.label}</span>
                            {option.description && <p className="text-xs text-muted-foreground">{option.description}</p>}
                        </div>
                        <div className="flex space-x-1.5 items-center h-6"> {/* Set fixed height for icon container */}
                            {option.icons.map(icon => (
                                <Image key={icon.alt} src={icon.src} alt={icon.alt} width={icon.width} height={icon.height} style={{ objectFit: 'contain' }} />
                            ))}
                        </div>
                    </Label>
                ))}
            </RadioGroup>
        </Card>
    );
}

