import axios from 'axios';
import crypto from 'crypto';
import logger from '../middleware/logger.js';

class MpesaService {
  constructor() {
    this.baseURL = process.env.MPESA_BASE_URL;
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.callbackURL = process.env.MPESA_CALLBACK_URL;
    this.accessToken = null;
    this.tokenExpires = null;
  }

  // Ensure essential configuration is present before calling remote APIs
  _ensureConfig(required = []) {
    const missing = [];
    required.forEach((k) => {
      if (!this[k]) missing.push(k);
    });
    if (missing.length) {
      const msg = `M-Pesa configuration missing: ${missing.join(', ')}`;
      logger.error(msg);
      throw new Error(msg);
    }
  }

  // Generate security credentials
  generateSecurityCredentials() {
    const password = Buffer.from(`${this.shortcode}${this.passkey}${this.getTimestamp()}`).toString('base64');
    return password;
  }

  // Get timestamp in required format
  getTimestamp() {
    return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  }

  // Generate unique transaction reference
  generateTransactionReference(prefix = 'ZB') {
    const timestamp = Date.now().toString().slice(-6);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // Get access token
  async getAccessToken() {
    try {
      // basic config checks
      this._ensureConfig(['baseURL', 'consumerKey', 'consumerSecret']);

      // Check if token is still valid
      if (this.accessToken && this.tokenExpires && Date.now() < this.tokenExpires) {
        return this.accessToken;
      }

      const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${credentials}`
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpires = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer

      logger.info('M-Pesa access token generated successfully');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to generate M-Pesa access token:', error.response?.data || error.message);
      // if provider returned structured data include it in the thrown error for easier diagnosis
      const provider = error.response?.data;
      const message = provider?.errorMessage || provider?.error || error.message || 'Failed to authenticate with M-Pesa service';
      const err = new Error(message);
      err.provider = provider;
      throw err;
    }
  }

  // STK Push - Lipa Na M-Pesa
  async initiateSTKPush(phoneNumber, amount, reference, description = 'Zanira BuildLink Payment') {
    try {
      // Validate config & inputs before calling provider
      this._ensureConfig(['baseURL', 'shortcode', 'passkey', 'callbackURL']);

      const accessToken = await this.getAccessToken();

      if (!phoneNumber || !String(phoneNumber).trim()) {
        throw new Error('Phone number is required for STK Push');
      }
      
      const transactionData = {
        BusinessShortCode: this.shortcode,
        Password: this.generateSecurityCredentials(),
        Timestamp: this.getTimestamp(),
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // M-Pesa requires whole numbers
        PartyA: phoneNumber.replace('+', ''),
        PartyB: this.shortcode,
        PhoneNumber: phoneNumber.replace('+', ''),
        CallBackURL: `${this.callbackURL}/stk-callback`,
        AccountReference: reference.substring(0, 12), // Max 12 chars
        TransactionDesc: description.substring(0, 13) // Max 13 chars
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        transactionData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`STK Push initiated for ${phoneNumber}, amount: ${amount}, reference: ${reference}`);

      return {
        success: true,
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID,
        customerMessage: response.data.CustomerMessage,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription
      };
    } catch (error) {
      // Prefer provider response details when available
      const provider = error.response?.data;
      const providerMessage = provider?.errorMessage || provider?.ResponseDescription || provider?.message;
      logger.error('STK Push initiation failed:', provider || error.message);
      return {
        success: false,
        error: providerMessage || error.message || 'STK Push initiation failed',
        provider
      };
    }
  }

  // Query STK Push status
  async querySTKPushStatus(checkoutRequestID) {
    try {
      const accessToken = await this.getAccessToken();

      const queryData = {
        BusinessShortCode: this.shortcode,
        Password: this.generateSecurityCredentials(),
        Timestamp: this.getTimestamp(),
        CheckoutRequestID: checkoutRequestID
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        queryData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc,
        merchantRequestID: response.data.MerchantRequestID,
        checkoutRequestID: response.data.CheckoutRequestID
      };
    } catch (error) {
      logger.error('STK Push query failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Process payment callback
  async processSTKCallback(callbackData) {
    try {
      const result = callbackData.Body.stkCallback;
      const checkoutRequestID = result.CheckoutRequestID;
      const resultCode = result.ResultCode;
      const resultDesc = result.ResultDesc;

      // Check if payment was successful
      if (resultCode === 0) {
        const callbackMetadata = result.CallbackMetadata;
        const items = callbackMetadata.Item;

        // Extract payment details
        const amount = items.find(item => item.Name === 'Amount')?.Value;
        const mpesaReceiptNumber = items.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
        const transactionDate = items.find(item => item.Name === 'TransactionDate')?.Value;
        const phoneNumber = items.find(item => item.Name === 'PhoneNumber')?.Value;

        logger.info(`Payment successful - Receipt: ${mpesaReceiptNumber}, Amount: ${amount}, Phone: ${phoneNumber}`);

        return {
          success: true,
          checkoutRequestID,
          amount,
          mpesaReceiptNumber,
          transactionDate,
          phoneNumber,
          resultCode,
          resultDesc
        };
      } else {
        logger.warn(`Payment failed - RequestID: ${checkoutRequestID}, Reason: ${resultDesc}`);
        return {
          success: false,
          checkoutRequestID,
          resultCode,
          resultDesc
        };
      }
    } catch (error) {
      logger.error('Error processing STK callback:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate payment amount (security measure)
  validatePaymentAmount(amount, expectedAmount, tolerance = 0.01) {
    const difference = Math.abs(amount - expectedAmount);
    const allowedDifference = expectedAmount * tolerance;
    
    return difference <= allowedDifference;
  }

  // Sanitize phone number for M-Pesa
  sanitizePhoneNumber(phoneNumber) {
    // Remove any non-digit characters except leading +
    let sanitized = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with 254
    if (sanitized.startsWith('+')) {
      sanitized = sanitized.substring(1);
    }
    
    if (sanitized.startsWith('0')) {
      sanitized = '254' + sanitized.substring(1);
    }
    
    if (!sanitized.startsWith('254')) {
      sanitized = '254' + sanitized;
    }
    
    return sanitized;
  }
}

// Create singleton instance
const mpesaService = new MpesaService();
export default mpesaService;