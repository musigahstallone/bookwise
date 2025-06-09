
// M-Pesa Integration Logic (Safaricom Daraja API)
// This module provides functions to obtain an access token and initiate an STK Push payment.

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
  phoneNumber: string; // Expected format: 2547XXXXXXXX (PartyA & PhoneNumber)
  amount: number; // Integer amount
  accountReference: string; // Max 12 alphanumeric characters for some shortcodes
  transactionDesc: string; // Max 100 characters
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
  // Basic Authentication: Base64 encode "ConsumerKey:ConsumerSecret"
  const auth = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");

  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (res.data && res.data.access_token) {
      return res.data.access_token;
    }
    throw new Error("M-Pesa access token not found in response.");
  } catch (error: any) {
    console.error("Error fetching M-Pesa access token:", error.response?.data || error.message);
    throw new Error(`Failed to get M-Pesa access token: ${error.response?.data?.errorMessage || error.message}`);
  }
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

  // Timestamp in format YYYYMMDDHHMMSS
  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  // Password: base64(shortcode + passkey + timestamp)
  const password = Buffer.from(
    config.shortCode + config.passkey + timestamp
  ).toString("base64");

  const payload = {
    BusinessShortCode: config.shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline", // Or "CustomerBuyGoodsOnline" depending on your shortcode
    Amount: Math.round(request.amount), // Ensure amount is an integer
    PartyA: request.phoneNumber, // Customer's phone number: 2547XXXXXXXX
    PartyB: config.shortCode, // Your Paybill or Till Number
    PhoneNumber: request.phoneNumber, // Customer's phone number: 2547XXXXXXXX
    CallBackURL: config.callbackUrl, // Must be HTTPS and publicly accessible
    AccountReference: request.accountReference, // Max 12 alphanumeric characters for some paybills
    TransactionDesc: request.transactionDesc, // Max 100 characters
  };

  try {
    const res = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // Safaricom API returns 200 OK even for some business logic errors,
    // so check ResponseCode in the body.
    if (res.data && (res.data.ResponseCode === "0" || res.data.errorCode)) { // errorCode for some sandbox errors
        if(res.data.errorCode && res.data.ResponseCode === undefined) { // Adapt for some sandbox error formats
            return {
                MerchantRequestID: payload.BusinessShortCode + payload.Timestamp, // Mock it if missing
                CheckoutRequestID: 'N/A', // Mock it
                ResponseCode: res.data.errorCode,
                ResponseDescription: res.data.errorMessage,
                CustomerMessage: res.data.errorMessage,
            }
        }
      return res.data as StkPushResponse;
    }
    // If ResponseCode is not "0" and not a known error structure, treat as failure
    throw new Error(res.data.ResponseDescription || res.data.CustomerMessage || "Unknown M-Pesa STK Push error");

  } catch (error: any) {
    console.error("Error initiating M-Pesa STK Push:", error.response?.data || error.message);
    const errorData = error.response?.data;
    const errorMessage = errorData?.errorMessage || errorData?.fault?.faultstring || errorData?.CustomerMessage || errorData?.ResponseDescription || error.message || "M-Pesa STK Push request failed";
    // Construct a StkPushResponse-like object for errors to be handled consistently
    return {
        MerchantRequestID: errorData?.MerchantRequestID || 'ERROR_ID',
        CheckoutRequestID: errorData?.CheckoutRequestID || 'ERROR_ID',
        ResponseCode: errorData?.ResponseCode || errorData?.errorCode || 'ERROR_UNKNOWN',
        ResponseDescription: errorMessage,
        CustomerMessage: errorMessage,
    }
  }
}
