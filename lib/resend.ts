import { Resend } from 'resend';

// Helper function to create a Resend client
// This ensures the client is only created on the server side
let resendInstance: Resend | null = null;

export const getResend = () => {
  // Only create the instance if we're on the server side
  if (typeof window === 'undefined') {
    // Initialize Resend with API key from environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not defined in environment variables');
      throw new Error('Missing Resend API key');
    }
    
    // Create the Resend client if it doesn't exist
    if (!resendInstance) {
      resendInstance = new Resend(resendApiKey);
    }
    
    return resendInstance;
  }
  
  // Return a mock client for client-side that will be replaced at runtime
  return {
    emails: {
      send: () => Promise.resolve({ data: null, error: new Error('Resend can only be used on the server') })
    }
  } as unknown as Resend;
};

// For backward compatibility
export const resend = getResend();

// Helper function to validate email addresses
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to validate an array of email addresses
export const validateEmails = (emails: string[]): { valid: string[]; invalid: string[] } => {
  const valid: string[] = [];
  const invalid: string[] = [];

  emails.forEach((email) => {
    if (validateEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  });

  return { valid, invalid };
};