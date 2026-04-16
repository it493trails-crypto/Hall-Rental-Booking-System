// This script contains utility functions used by the String Invoices integration code

function stripePost(url, secretKey, payload) {

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    headers: {
      Authorization: 'Bearer ' + secretKey
    },
    muteHttpExceptions: true  // Prevents Apps Script from throwing on HTTP errors — handled below
  });

  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText());

  if (status >= 400) {
    throw new Error('Stripe API Error ' + status + ': ' + JSON.stringify(body, null, 2));
  }

  return body;
}

// Verifys all Stripe POST data
function verifyStripeSignature (body, sigHeader, secret) {
  const parts = sigHeader.split(",");
  const timestamp = parts.find(p => p.startsWith("t=")).slice(2);
  const sig = parts.find(p => p.startsWith("v1=")).slice(3);
  const signed = timestamp + "." + body;
  const expected = computeHmacSha256(secret, signed);
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) throw new Error("Webhook timestamp too old");
  if (expected !== sig) throw new Error("Invalid signature");
}
