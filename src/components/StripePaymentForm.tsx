import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { processClientSidePayment } from '../services/stripe';
import { toast } from 'sonner';

interface StripePaymentFormProps {
  invoice: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripePaymentForm({ invoice, onSuccess, onCancel }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    try {
      // In a real implementation, you would create a PaymentIntent on the server
      // and confirm it here. Since we are doing a client-side fallback:
      
      // 1. Create a payment method (mocking the real flow)
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement as any,
      });

      if (error) {
        setErrorMessage(error.message || 'Errore durante il pagamento');
        setIsProcessing(false);
        return;
      }

      // 2. Process the payment in Firestore (Client-side fallback)
      await processClientSidePayment(invoice, paymentMethod.id);
      
      toast.success('Pagamento completato con successo!');
      onSuccess();
    } catch (err: any) {
      console.error("Payment error:", err);
      setErrorMessage(err.message || 'Si è verificato un errore imprevisto.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#334155', // Note: in a real app you might want to dynamically change this based on theme
                '::placeholder': {
                  color: '#94a3b8',
                },
              },
              invalid: {
                color: '#ef4444',
              },
            },
          }}
        />
      </div>

      {errorMessage && (
        <div className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 py-3 px-4 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            `Paga € ${invoice.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
          )}
        </button>
      </div>
    </form>
  );
}
