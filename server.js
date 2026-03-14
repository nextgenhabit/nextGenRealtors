/**
 * NextGen Realtors — SMS OTP Proxy Server
 * 
 * Runs on port 3001. Proxies OTP requests to Fast2SMS server-side
 * so the browser avoids CORS restrictions.
 * 
 * Usage:
 *   node server.js
 * 
 * Endpoint:
 *   GET /send-otp?phone=9876543210&otp=123456
 */

const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// ---- Your Fast2SMS API Key ----
const FAST2SMS_API_KEY = 'G2Odr3luxCqjJ7cUnwbBv5gfVyLFzQM91Hie0oskIWaDYNXh6mUnloSROW5kGiPA19hyJQKpETmMgDBZ';

// ---- Allow CORS from the frontend (port 3000) ----
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ---- Health check ----
app.get('/', (req, res) => {
  res.json({ status: 'NextGen Realtors SMS Proxy is running ✅' });
});

// ---- Send OTP endpoint ----
app.get('/send-otp', async (req, res) => {
  const { phone, otp } = req.query;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: 'Missing phone or otp parameter.' });
  }

  // Fast2SMS expects a 10-digit number (no country code)
  let tenDigitPhone = phone.replace(/[^0-9]/g, '');
  if (tenDigitPhone.startsWith('91') && tenDigitPhone.length === 12) {
    tenDigitPhone = tenDigitPhone.slice(2);
  }

  if (tenDigitPhone.length !== 10) {
    return res.status(400).json({ success: false, error: `Invalid phone number: ${phone}` });
  }

  const message = encodeURIComponent(`Your NextGen Realtors OTP is: ${otp}. Valid for 10 minutes. Do not share this with anyone.`);
  const smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_API_KEY}&route=v3&sender_id=FTWSMS&message=${message}&language=english&flash=0&numbers=${tenDigitPhone}`;

  try {
    console.log(`[SMS] Sending OTP to ${tenDigitPhone}...`);
    const response = await fetch(smsUrl, { method: 'GET' });
    const result = await response.json();

    console.log('[Fast2SMS Response]', JSON.stringify(result));

    if (result.return === true) {
      console.log(`[SMS] ✅ OTP sent successfully to ${tenDigitPhone}`);
      return res.json({ success: true });
    } else {
      console.error('[SMS] ❌ Fast2SMS error:', result);
      return res.status(500).json({ success: false, error: result.message || 'Fast2SMS rejected the request.' });
    }
  } catch (err) {
    console.error('[SMS] ❌ Network error calling Fast2SMS:', err.message);
    return res.status(500).json({ success: false, error: 'Network error reaching SMS provider.' });
  }
});

// ---- Start server ----
app.listen(PORT, () => {
  console.log('');
  console.log('  ✅ NextGen Realtors SMS Proxy');
  console.log(`  🚀 Listening on http://localhost:${PORT}`);
  console.log('  📱 Fast2SMS API key loaded');
  console.log('');
});
