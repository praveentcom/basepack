import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', 'test.env') });

/**
 * Check if required credentials are configured
 * 
 * @param provider - Messaging provider name
 * @param requiredEnvVars - Array of required environment variable names
 * @returns True if credentials are configured, false otherwise
 */
export const hasCredentials = (provider: string, requiredEnvVars: string[]): boolean => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Skipping ${provider} integration tests - missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
};

/**
 * Provider-specific credential checkers
 */
export const credentialCheckers = {
  sns: () => hasCredentials('SNS', ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION']),
  twilio: () => hasCredentials('Twilio', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']),
  meta: () => hasCredentials('Meta', ['META_ACCESS_TOKEN', 'META_PHONE_NUMBER_ID']),
  msg91: () => hasCredentials('MSG91', ['MSG91_AUTH_KEY', 'MSG91_SENDER_ID', 'MSG91_FLOW_ID']),
  vonage: () => hasCredentials('Vonage', ['VONAGE_API_KEY', 'VONAGE_API_SECRET']),
  plivo: () => hasCredentials('Plivo', ['PLIVO_AUTH_ID', 'PLIVO_AUTH_TOKEN']),
  messagebird: () => hasCredentials('MessageBird', ['MESSENGERBIRD_ACCESS_KEY']),
};
