// M-Pesa Integration Logic (Safaricom Daraja API)
// This module provides functions to obtain an access token and initiate an STK Push payment.
// You can later import and use these functions in your API routes or server actions.

import axios from "axios";

// Types for clarity
export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string; // Business Short Code
  passkey: string; // Lipa Na Mpesa Online Passkey
  callbackUrl: string;
  environment?: "sandbox" | "production";
}

export interface StkPushRequest {
  phoneNumber: string; // Format: 2547XXXXXXXX
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

// Helper to get base URL
function getMpesaBaseUrl(env: "sandbox" | "production" = "sandbox") {
  return env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

// 1. Get M-Pesa Access Token
export async function getMpesaAccessToken(
  config: MpesaConfig
): Promise<string> {
  const url = `${getMpesaBaseUrl(
    config.environment
  )}/oauth/v1/generate?grant_type=client_credentials`;
  const auth = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");
  const res = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return res.data.access_token;
}

// 2. Initiate STK Push (Lipa Na Mpesa Online)
export async function initiateStkPush(
  config: MpesaConfig,
  request: StkPushRequest
): Promise<StkPushResponse> {
  const accessToken = await getMpesaAccessToken(config);
  const url = `${getMpesaBaseUrl(
    config.environment
  )}/mpesa/stkpush/v1/processrequest`;

  // Timestamp in format yyyyMMddHHmmss
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:Z.]/g, "")
    .slice(0, 14);

  // Password: base64(shortcode + passkey + timestamp)
  const password = Buffer.from(
    config.shortCode + config.passkey + timestamp
  ).toString("base64");

  const payload = {
    BusinessShortCode: config.shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: request.amount,
    PartyA: request.phoneNumber,
    PartyB: config.shortCode,
    PhoneNumber: request.phoneNumber,
    CallBackURL: config.callbackUrl,
    AccountReference: request.accountReference,
    TransactionDesc: request.transactionDesc,
  };

  const res = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

// Example usage (not to be run directly, just for reference):
// const config: MpesaConfig = {
//   consumerKey: process.env.MPESA_CONSUMER_KEY!,
//   consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
//   shortCode: process.env.MPESA_SHORTCODE!,
//   passkey: process.env.MPESA_PASSKEY!,
//   callbackUrl: 'https://yourdomain.com/api/mpesa-callback',
//   environment: 'sandbox',
// };
// const response = await initiateStkPush(config, {
//   phoneNumber: '2547XXXXXXXX',
//   amount: 100,
//   accountReference: 'BookWise',
//   transactionDesc: 'Book purchase',
// });
