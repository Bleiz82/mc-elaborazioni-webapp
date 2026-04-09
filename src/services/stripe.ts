import { loadStripe, Stripe } from '@stripe/stripe-js';
import { db } from '../lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    const key = (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn("VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe payments will be disabled.");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

// 1. Cloud Function Approach (If deployed)
export const createCheckoutSession = async (invoice: any) => {
  try {
    // Assuming a callable function named 'createStripeCheckout' exists
    // const { getFunctions, httpsCallable } = await import('firebase/functions');
    // const functions = getFunctions();
    // const createCheckout = httpsCallable(functions, 'createStripeCheckout');
    // const response = await createCheckout({ invoice });
    // const { sessionId } = response.data as any;
    // const stripe = await getStripe();
    // await stripe?.redirectToCheckout({ sessionId });
    throw new Error("Cloud Functions not available in this environment. Using client-side fallback.");
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
};

// 2. Client-Side Fallback Approach
export const processClientSidePayment = async (invoice: any, paymentMethodId: string = 'mock_pm_123') => {
  try {
    // 1. Update invoice status
    const invoiceRef = doc(db, 'invoices', invoice.id);
    await updateDoc(invoiceRef, {
      status: 'pagata',
      paid_at: new Date().toISOString(),
      payment_method: 'carta'
    });

    // 2. Create payment record
    await addDoc(collection(db, 'payments'), {
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      amount: invoice.totalAmount,
      method: 'carta',
      status: 'completed',
      date: new Date().toISOString(),
      stripePaymentMethodId: paymentMethodId
    });

    // 3. Create notification for admin
    await addDoc(collection(db, 'notifications'), {
      userId: 'admin',
      title: 'Nuovo Pagamento Ricevuto',
      message: `Pagamento di €${invoice.totalAmount} per la parcella ${invoice.invoiceNumber}`,
      type: 'pagamento',
      isRead: false,
      createdAt: new Date().toISOString(),
      link: '/admin/payments'
    });

    return true;
  } catch (error) {
    console.error("Error processing client-side payment:", error);
    throw error;
  }
};
