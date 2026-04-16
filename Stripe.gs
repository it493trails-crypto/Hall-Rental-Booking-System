// This script contains the legacy Stripe payment link integration

/************************************************************
 * STRIPE PAYMENT LINK WORKFLOW WITH SECURITY DEPOSIT
 * GOOGLE APPS SCRIPT VERSION
 *
 * FLOW:
 *   Rental Amount (dynamic)
 *   + $250 Security Deposit (fixed)
 *   → Stripe Product(s)
 *   → Stripe Price(s)
 *   → Stripe Payment Link (2 line items)
 *   → Email Customer
 *
 * NOTES:
 * - Deposit is charged upfront (Option A)
 * - Deposit must be refunded manually later via Stripe
 * - All integers sent to Stripe are STRINGS
 * - Uses application/x-www-form-urlencoded
 ************************************************************/

/**
 * ENTRY POINT
 * Call this when a booking is approved.
 *
 * @param {number} rentalAmount Rental fee in dollars (e.g., 500)
 * @param {string} description Description of rental
 * @param {string} email Customer email
 * @returns {Object} Stripe Payment Link object
 */
//const STRIPE_SECRET_KEY = "sk_test_51SjuXQEJGr1PCsUwuqQAvwUKvaFaUyZ6J95xUcHuw8llxboxi3pnvkKfH9CRCyaUXPF59R1kDq1OfvjU2LWlwRvB00K1qIa80g";
/*
function sendPaymentLinkToCustomer(rentalAmount, description, email, row, sheet) {

  const stripe = {
    secretKey: STRIPE_SECRET_KEY
  };

  const SECURITY_DEPOSIT_DOLLARS = 250;

  // Convert dollars → cents (Stripe requires integer cents)
  const rentalCents = Math.round(Number(rentalAmount) * 100);
  const depositCents = SECURITY_DEPOSIT_DOLLARS * 100;

  if (!Number.isInteger(rentalCents) || rentalCents < 50) {
    throw new Error('Rental amount must be at least $0.50');
  }

  const booking = {
    rental_cents: rentalCents,
    deposit_cents: depositCents,
    currency: 'usd',
    description: description || 'Hall Rental',
    customer_email: email || 'test@example.com'
  };

  const paymentLink = createPaymentLinkAndEmail(stripe, booking, row, sheet);

  Logger.log('Payment Link URL: ' + paymentLink.url);
  return paymentLink;
}


/**
 * Orchestrates:
 *  - Create rental product + price
 *  - Create deposit product + price
 *  - Create payment link with two line items
 *  - Email customer
 *
 * @param {Object} stripe Stripe configuration
 * @param {Object} booking Booking details
 * @returns {Object} Stripe Payment Link object
 */
/*
function createPaymentLinkAndEmail(stripe, booking, row, sheet) {

  // === RENTAL PRODUCT ===
  const rentalProduct = createProduct(stripe.secretKey, booking.description);

  const rentalPrice = createPriceFromInteger(stripe.secretKey, rentalProduct.id, booking.rental_cents, booking.currency);

  // === SECURITY DEPOSIT PRODUCT ===
  const depositProduct = createProduct(stripe.secretKey, booking.description + ' - Security Deposit');

  const depositPrice = createPriceFromInteger(stripe.secretKey, depositProduct.id, booking.deposit_cents, booking.currency);

  // === CREATE PAYMENT LINK WITH 2 LINE ITEMS ===
  const paymentLink = createPaymentLinkFromPrices(stripe.secretKey, rentalPrice.id, depositPrice.id, row, sheet);

  // === EMAIL CUSTOMER ===
  sendPaymentEmail(booking.customer_email, booking.rental_cents, booking.deposit_cents, booking.currency, paymentLink.url);

  return paymentLink;
}


/**
 * Creates a Stripe Product.
 *
 * @param {string} secretKey Stripe secret key
 * @param {string} name Product name
 * @returns {Object} Stripe Product
 */
/*
function createProduct(secretKey, name) {
  return stripePost(
    'https://api.stripe.com/v1/products',
    secretKey,
    {
      name: name || 'Custom payment'
    }
  );
}


/**
 * Creates a Stripe Price from an integer amount in cents.
 *
 * @param {string} secretKey Stripe secret key
 * @param {string} productId Stripe Product ID
 * @param {number} amountCents Amount in cents (integer)
 * @param {string} currency Currency code (e.g., "usd")
 * @returns {Object} Stripe Price
 */
/*
function createPriceFromInteger(secretKey, productId, amountCents, currency) {
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new Error('Amount must be a positive integer (in cents)');
  }

  return stripePost(
    'https://api.stripe.com/v1/prices',
    secretKey,
    {
      unit_amount: String(amountCents), // MUST be string
      currency: currency,
      product: productId
    }
  );
}


/**
 * Creates a Stripe Payment Link with:
 *  - Rental line item
 *  - Security deposit line item
 *
 * @param {string} secretKey Stripe secret key
 * @param {string} rentalPriceId Stripe Price ID for rental
 * @param {string} depositPriceId Stripe Price ID for deposit
 * @returns {Object} Stripe Payment Link
 */
/*
function createPaymentLinkFromPrices(secretKey, rentalPriceId, depositPriceId, row) {
  return stripePost(
    'https://api.stripe.com/v1/payment_links',
    secretKey,
    {
      'line_items[0][price]': rentalPriceId,
      'line_items[0][quantity]': '1',
      'line_items[1][price]': depositPriceId,
      'line_items[1][quantity]': '1',
      'metadata[row]': row
    }
  );
}


/**
 * Sends payment email to customer with cost breakdown.
 *
 * @param {string} email Customer email
 * @param {number} rentalCents Rental fee in cents
 * @param {number} depositCents Deposit amount in cents
 * @param {string} currency Currency code
 * @param {string} paymentUrl Stripe payment link URL
 */
/*
function sendPaymentEmail(email, rentalCents, depositCents, currency, paymentUrl) {

  const rentalFormatted = (rentalCents / 100).toFixed(2);
  const depositFormatted = (depositCents / 100).toFixed(2);
  const totalFormatted = ((rentalCents + depositCents) / 100).toFixed(2);

  const subject = 'Lorton VFD Payment Link';

  const body =
`Hello,

Your booking has been APPROVED. Please complete your payment using the link below:

${paymentUrl}

Rental Fee: $${rentalFormatted}
Security Deposit: $${depositFormatted}

Total Due Today: $${totalFormatted}

Note: The $250 security deposit will be refunded after your event
provided there are no damages.

Thank you,
Hall Booking Team`;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body
  });
}


/**
 * Shared Stripe POST helper (Apps Script compatible).
 *
 * @param {string} url Stripe API endpoint
 * @param {string} secretKey Stripe secret key
 * @param {Object} payload Form-encoded payload
 * @returns {Object} Parsed Stripe API response
 */
/*
function stripePost(url, secretKey, payload) {

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    headers: {
      Authorization: 'Bearer ' + secretKey
    },
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText());

  if (status >= 400) {
    throw new Error(
      'Stripe API Error: ' + JSON.stringify(body, null, 2)
    );
  }

  return body;
}

/************************************************************
 * REFUND SECURITY DEPOSIT FUNCTION
 *
 * Refunds $250 security deposit from a completed payment.
 *
 * REQUIREMENT:
 * - You must pass the Stripe PaymentIntent ID
 *   (example: "pi_3NkabcXYZ...")
 *
 * - Store this ID in AppSheet when payment succeeds.
 ************************************************************/

/**
 * Refunds the $250 security deposit from a Stripe payment.
 *
 * @param {string} paymentIntentId Stripe PaymentIntent ID
 * @returns {Object} Stripe Refund object
 */
// Currently not implemented. Not in scope.
/*
function refundSecurityDeposit(paymentIntentId) {

  const stripe = {
    secretKey: STRIPE_SECRET_KEY
  };

  const SECURITY_DEPOSIT_DOLLARS = 250;
  const depositCents = SECURITY_DEPOSIT_DOLLARS * 100;

  if (!paymentIntentId) {
    throw new Error('PaymentIntent ID is required to issue refund.');
  }

  // Create refund for deposit amount only
  const refund = stripePost(
    'https://api.stripe.com/v1/refunds',
    stripe.secretKey,
    {
      payment_intent: paymentIntentId,
      amount: String(depositCents), // MUST be string
      reason: 'requested_by_customer'
    }
  );

  Logger.log('Deposit refunded successfully.');
  Logger.log('Refund ID: ' + refund.id);

  return refund;
}

// This function is called when the user pays a quote
function doPost (e) {
  Logger.log("INFO: Post recieved!");

  try {
    const payload = JSON.parse(e.postData.contents);

    if (payload.type === "checkout.session.completed") {
      const session = payload.data.object;
      const customerEmail = session.customer_details?.email;
      const amountTotal = session.amount_total;
      const row = parseInt(session.metadata?.row, 10);

      if (isNaN(row) || row < 1) {
        return ContentService.createTextOutput("Error").setMimeType(ContentService.MimeType.TEXT);
      }

      payQuote(row);
    }

    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    Logger.log("ERR: Stripe Webhook Error: " + err.message);
    return ContentService.createTextOutput("Error").setMimeType(ContentService.MimeType.TEXT);
  }
}

*/
