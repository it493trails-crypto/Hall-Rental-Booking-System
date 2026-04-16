/*
const STRIPE_SECRET_KEY = PropertiesService.getScriptProperties().getProperty("StripeKey");
const SECURITY_DEPOSIT_DOLLARS = DepositData.price;
const DEPOSIT_DUE_DAYS = 0;


function sendInvoicesToCustomer(rentalAmount, description, email, row, sheet, reservationDate) {

  // Converts dollars to cents
  const rentalCents = Math.round(Number(rentalAmount) * 100);
  const depositCents = SECURITY_DEPOSIT_DOLLARS * 100;
  console.log("INFO: Rental cents: " + rentalCents + ". Deposit cents: " + depositCents);

  if (!Number.isInteger(rentalCents) || rentalCents < 50) {   // Error handling
    throw new Error('Rental amount must be at least $0.50');
  }

  // Create booking object
  const booking = {
    rental_cents: rentalCents,
    deposit_cents: depositCents,
    currency: 'usd',
    description: description || 'Hall Rental',
    customer_email: email,
    reservation_date: reservationDate  // Used to set the rental invoice due date
  };

  createAndSendInvoices(booking, row, sheet);
}

// Test function. This can be run manually to test Stripe Invoice integration functionality. Console.logs will show when running this function manually.
function testCreateAndSendInvoices () {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
  const test_obj = {rental_cents: 10000, deposit_cents: 25000, currency: "usd", description: "TEST INVOICE", customer_email: "it493trails@gmail.com", reservation_date: new Date("4/20/2026")}
  createAndSendInvoices(test_obj, 20, sheet);
}


function createAndSendInvoices(booking, row, sheet) {
  const customer = createStripeCustomer(booking.customer_email);

  // Determine deposit due date
  const depositDueDate = new Date();
  depositDueDate.setDate(depositDueDate.getDate() + DEPOSIT_DUE_DAYS);
  depositDueDate.setHours(23, 59, 59, 0);
  const depositDueDateUnix = Math.floor(depositDueDate.getTime() / 1000);
  console.log("INFO: Deposit due date: " + depositDueDate + ". UNIX: " + depositDueDateUnix);

  // Determine rental price due date
  const reservationDate = new Date(booking.reservation_date);
  const rentalDueDate = new Date(reservationDate);
  rentalDueDate.setDate(rentalDueDate.getDate() - 1);
  rentalDueDate.setHours(23, 59, 59, 0);
  const rentalDueDateUnix = Math.floor(rentalDueDate.getTime() / 1000);
  console.log("INFO: Rental due date: " + rentalDueDate + ". UNIX: " + rentalDueDateUnix);
 
  // Create the deposit invoice
  const depositInvoice = createInvoice(customer.id, depositDueDateUnix, { row });
  createInvoiceItem(customer.id, booking.deposit_cents, booking.currency, booking.description + ' - Security Deposit', depositInvoice.id);
  const finalizedDepositInvoice = finalizeInvoice(depositInvoice.id);
  console.log("INFO: Deposit invoice created. Invoice ID: " + depositInvoice.id);
  sheet.getRange(row, COL_DEPOSIT_ID).setValue(depositInvoice.id);

  // Create the rental invoice
  const rentalInvoice = createInvoice(customer.id, rentalDueDateUnix, {row});
  createInvoiceItem(customer.id, booking.rental_cents, booking.currency, booking.description + " - Rental Fee", rentalInvoice.id);
  const finalizedRentalInvoice = finalizeInvoice(rentalInvoice.id);
  console.log("INFO: Rental invoice created. Invoice ID: " + rentalInvoice.id);
  sheet.getRange(row, COL_RENTAL_ID).setValue(rentalInvoice.id);

  // Send invoice email
  sendInvoiceEmail(
    booking.customer_email,
    booking.rental_cents,
    booking.deposit_cents,
    booking.currency,
    depositDueDate,
    rentalDueDate,
    finalizedDepositInvoice.hosted_invoice_url,
    finalizedRentalInvoice.hosted_invoice_url
  );
  console.log("INFO: Invoice email sent to: " + booking.customer_email);
}

// Create a Stripe customer
function createStripeCustomer(email, name) {
  console.log("INFO: createStripeCustomer() called");

  if (!email || typeof email != "string" || !email.includes("@")) {
    throw new Error("ERR: Invalid or missing email: " + email);
  }

  let customer;
  try {
    customer = stripePost('https://api.stripe.com/v1/customers', STRIPE_SECRET_KEY, {
      email: email.trim(),
      name: name || ''
    });
  } catch (err) {
    throw new Error("ERR: Stripe API call failed for " + email + ": " + err.message);
  }

  if (!customer || !customer.id) {
    throw new Error("ERR: Stripe returned an invalid customer object: " + JSON.stringify(customer));
  }

  console.log("INFO: Stripe customer created. ID: " + customer.id + ". Email: " + customer.email);
  return customer;
}

// Create invoice item
function createInvoiceItem(customerId, amountCents, currency, description, invoiceId) {
  const payload = {
    customer: customerId,
    amount: String(amountCents),
    currency: currency,
    description: description
  }

  if (invoiceId) {
    payload.invoice = invoiceId;
  }

  return stripePost('https://api.stripe.com/v1/invoiceitems', STRIPE_SECRET_KEY, payload);
}

// Create invoice
function createInvoice(customerId, dueDateUnix, metadata) {
  return stripePost('https://api.stripe.com/v1/invoices', STRIPE_SECRET_KEY, {
    customer: customerId,
    collection_method: 'send_invoice',  // Stripe emails the invoice to the customer
    due_date: String(dueDateUnix),
    auto_advance: false,
    'metadata[row]': String(metadata.row || '')
  });
}

// Finalize invoice
function finalizeInvoice(invoiceId) {
  return stripePost(
    'https://api.stripe.com/v1/invoices/' + invoiceId + '/finalize',
    STRIPE_SECRET_KEY,
    {}
  );
}

// Send invoice. Not used. Unreliable
function sendInvoice(invoiceId) {
  return stripePost(
    'https://api.stripe.com/v1/invoices/' + invoiceId + '/send',
    STRIPE_SECRET_KEY,
    {}
  );
}


function doPost(e) {
  console.log("INFO: Post received!");

  try {
    const payload = JSON.parse(e.postData.contents);

    // If invoice.paid event
    if (payload.type === "invoice.paid") {
      const invoice = payload.data.object;
      const row = parseInt(invoice.metadata?.row, 10);
      const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
      const amountPaid = invoice.amount_paid;
      const DEPOSIT_CENTS = SECURITY_DEPOSIT_DOLLARS * 100;
      console.log(DEPOSIT_CENTS);

      // Error checking
      if (isNaN(row) || row < 1) {
        console.log("ERR: Invalid row in invoice metadata: " + row);
        return ContentService.createTextOutput("Error").setMimeType(ContentService.MimeType.TEXT);
      }

      console.log("INFO: invoice.paid received for row " + row + ", amount: " + amountPaid);

      if (amountPaid === DEPOSIT_CENTS) {
        // Deposit invoice was paid — log only, booking status unchanged until rental is paid
        console.log("INFO: Deposit paid for row " + row);

        // Mark as paid in the sheet and potentially call payQuote
        switch (getPaymentStatus(row)) {
          case "Booked": sheet.getRange(row, COL_STATUS).setValue('Deposit Paid'); break;
          case "Deposit Paid": throw new Error("ERR: Deposit paid twice! Row: " + row); break;
          case "Rental Paid": sheet.getRange(row, COL_STATUS).setValue('Fully Paid'); payQuote(row); break;
          default: throw new Error("ERR: Unsupported payment status for row " + row); break;
        }
      } else {
        // Rental invoice was paid — mark the booking as fully paid
        console.log("INFO: Rental paid for row " + row + ", calling payQuote");
        
        switch (getPaymentStatus(row)) {
          case "Booked": sheet.getRange(row, COL_STATUS).setValue('Rental Paid'); break;
          case "Deposit Paid": sheet.getRange(row, COL_STATUS).setValue('Fully Paid'); payQuote(row); break;
          case "Rental Paid": throw new Error("ERR: Rental paid twice! Row: " + row); break; 
          default: throw new Error("ERR: Unsupported payment status for row " + row); break;
        }
      }
    }

    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    console.log("ERR: Stripe Webhook Error: " + err.message);
    return ContentService.createTextOutput("Error").setMimeType(ContentService.MimeType.TEXT);
  }
}


function testDoPost(amount, row) {
  const mockBody = JSON.stringify({
    type: "invoice.paid",
    data: {
      object: {
        id: "in_test_deposit123",
        amount_paid: amount ?? 25000,  // Must match SECURITY_DEPOSIT_DOLLARS * 100
        metadata: {
          row: row ?? 20  // Change this to a real row number in your sheet
        }
      }
    }
  });

  const e = {
    postData: {
      contents: mockBody,
      type: "application/json"
    },
    headers: {
      'Stripe-Signature': 'test'  // If you add signature verification, you'll need a real sig here
    }
  };

  const result = doPost(e);
  console.log("Result: " + result.getContent());
}

function sendInvoiceEmail(email, rentalCents, depositCents, currency, depositDueDate, rentalDueDate, depositUrl, rentalUrl) {

  // Convert cents to dollars
  const rentalFormatted  = (rentalCents  / 100).toFixed(2);
  const depositFormatted = (depositCents / 100).toFixed(2);

  // Format both due dates as readable strings (e.g., "Monday, June 4, 2025")
  const dateFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const depositDueDateFormatted = depositDueDate.toLocaleDateString('en-US', dateFormatOptions);
  const rentalDueDateFormatted  = rentalDueDate.toLocaleDateString('en-US', dateFormatOptions);

  // Define subject and body
  const subject = 'Lorton VFD Hall Booking — Payment Links';
  const body =
`Hello,

Your hall booking has been APPROVED. Please use the links below to complete your payments.

---------------------------------------------
PAYMENT 1 OF 2 — Security Deposit (Due by ${depositDueDateFormatted})
---------------------------------------------
Amount: $${depositFormatted}
Pay here: ${depositUrl}

Note: This deposit must be paid by the due date above to secure your booking.
It will be refunded after your event provided there are no damages.

---------------------------------------------
PAYMENT 2 OF 2 — Rental Fee (Due by ${rentalDueDateFormatted})
---------------------------------------------
Amount: $${rentalFormatted}
Pay here: ${rentalUrl}

Note: This payment must be completed before your reservation date.

If you have any questions, please reply to this email.

Thank you,
Hall Booking Team
Lorton Volunteer Fire Department`;

  // Send the above email
  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body
  });
}
*/




const STRIPE_SECRET_KEY = PropertiesService.getScriptProperties().getProperty("StripeKey");
const SECURITY_DEPOSIT_DOLLARS = Number(DepositData.price);
const DEPOSIT_DUE_DAYS = 0;

/**
 * Creates the 2 customer choices:
 * 1) deposit only
 * 2) full payment
 *
 * Uses current sheet columns:
 * - COL_DEPOSIT_ID = Q
 * - COL_RENTAL_ID  = R  (reused as "second invoice id")
 */
function sendInvoicesToCustomer(rentalAmount, description, email, row, sheet, reservationDate) {
  const rentalCents = Math.round(Number(rentalAmount) * 100);
  const depositCents = Math.round(Number(SECURITY_DEPOSIT_DOLLARS) * 100);
  const fullCents = rentalCents + depositCents;

  console.log(
    "INFO: rentalCents=" + rentalCents +
    ", depositCents=" + depositCents +
    ", fullCents=" + fullCents
  );

  if (!Number.isFinite(rentalCents) || rentalCents < 50) {
    throw new Error("Rental amount must be at least $0.50");
  }

  if (!Number.isFinite(depositCents) || depositCents < 50) {
    throw new Error("Deposit amount must be at least $0.50");
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new Error("Invalid or missing customer email: " + email);
  }

  const parsedReservationDate = new Date(reservationDate);
  if (isNaN(parsedReservationDate.getTime())) {
    throw new Error("Invalid reservation date: " + reservationDate);
  }

  const booking = {
    rental_cents: rentalCents,
    deposit_cents: depositCents,
    full_cents: fullCents,
    currency: "usd",
    description: description || "Hall Rental",
    customer_email: email.trim(),
    reservation_date: parsedReservationDate
  };

  createAndSendPaymentOptions(booking, row, sheet);
}

/**
 * Manual test
 */
function testCreateAndSendInvoices() {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
  const testObj = {
    rental_cents: 34375,
    deposit_cents: 25000,
    full_cents: 59375,
    currency: "usd",
    description: "TEST INVOICE",
    customer_email: "it493trails@gmail.com",
    reservation_date: new Date("2026-04-20")
  };
  createAndSendPaymentOptions(testObj, 20, sheet);
}

/**
 * Create:
 * - deposit-only invoice -> Q
 * - full-payment invoice -> R
 */
function createAndSendPaymentOptions(booking, row, sheet) {
  const customer = createStripeCustomer(booking.customer_email);

  // Deposit due date
  const depositDueDate = new Date();
  depositDueDate.setDate(depositDueDate.getDate() + DEPOSIT_DUE_DAYS);
  depositDueDate.setHours(23, 59, 59, 0);
  const depositDueDateUnix = Math.floor(depositDueDate.getTime() / 1000);

  // Final/full due date = day before reservation
  const reservationDate = new Date(booking.reservation_date);
  const finalDueDate = new Date(reservationDate);
  finalDueDate.setDate(finalDueDate.getDate() - 1);
  finalDueDate.setHours(23, 59, 59, 0);
  const finalDueDateUnix = Math.floor(finalDueDate.getTime() / 1000);

  console.log("INFO: deposit due = " + depositDueDate);
  console.log("INFO: final due   = " + finalDueDate);

  // 1) Deposit-only option invoice -> Q
  const depositInvoice = createInvoice(customer.id, depositDueDateUnix, {
    row: row,
    payment_type: "deposit_option"
  });

  createInvoiceItem(
    customer.id,
    booking.deposit_cents,
    booking.currency,
    booking.description + " - Security Deposit",
    depositInvoice.id
  );

  const finalizedDepositInvoice = finalizeInvoice(depositInvoice.id);
  sheet.getRange(row, COL_DEPOSIT_ID).setValue(depositInvoice.id);
  console.log("INFO: Deposit option invoice stored in COL_DEPOSIT_ID: " + depositInvoice.id);

  // 2) Full payment option invoice -> R
  const fullInvoice = createInvoice(customer.id, finalDueDateUnix, {
    row: row,
    payment_type: "full_option"
  });

  createInvoiceItem(
    customer.id,
    booking.full_cents,
    booking.currency,
    booking.description + " - Full Payment",
    fullInvoice.id
  );

  const finalizedFullInvoice = finalizeInvoice(fullInvoice.id);
  sheet.getRange(row, COL_RENTAL_ID).setValue(fullInvoice.id);
  console.log("INFO: Full option invoice stored in COL_RENTAL_ID: " + fullInvoice.id);

  sendInitialPaymentOptionsEmail(
    booking.customer_email,
    booking.deposit_cents,
    booking.full_cents,
    depositDueDate,
    finalDueDate,
    finalizedDepositInvoice.hosted_invoice_url,
    finalizedFullInvoice.hosted_invoice_url
  );

  console.log("INFO: Initial payment options email sent to " + booking.customer_email);
}

/**
 * Create Stripe customer
 */
function createStripeCustomer(email, name) {
  console.log("INFO: createStripeCustomer() called");

  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new Error("ERR: Invalid or missing email: " + email);
  }

  const customer = stripePost("https://api.stripe.com/v1/customers", STRIPE_SECRET_KEY, {
    email: email.trim(),
    name: name || ""
  });

  if (!customer || !customer.id) {
    throw new Error("ERR: Stripe returned invalid customer object: " + JSON.stringify(customer));
  }

  console.log("INFO: Stripe customer created. ID: " + customer.id);
  return customer;
}

/**
 * Create invoice item
 */
function createInvoiceItem(customerId, amountCents, currency, description, invoiceId) {
  const payload = {
    customer: customerId,
    amount: String(Math.round(Number(amountCents))),
    currency: currency,
    description: description
  };

  if (invoiceId) {
    payload.invoice = invoiceId;
  }

  return stripePost("https://api.stripe.com/v1/invoiceitems", STRIPE_SECRET_KEY, payload);
}

/**
 * Create invoice
 */
function createInvoice(customerId, dueDateUnix, metadata) {
  return stripePost("https://api.stripe.com/v1/invoices", STRIPE_SECRET_KEY, {
    customer: customerId,
    collection_method: "send_invoice",
    due_date: String(dueDateUnix),
    auto_advance: false,
    "metadata[row]": String(metadata.row || ""),
    "metadata[payment_type]": String(metadata.payment_type || "")
  });
}

/**
 * Finalize invoice
 */
function finalizeInvoice(invoiceId) {
  return stripePost(
    "https://api.stripe.com/v1/invoices/" + invoiceId + "/finalize",
    STRIPE_SECRET_KEY,
    {}
  );
}

/**
 * Optional helper if you want to void unused invoice
 */
function voidInvoice(invoiceId) {
  return stripePost(
    "https://api.stripe.com/v1/invoices/" + invoiceId + "/void",
    STRIPE_SECRET_KEY,
    {}
  );
}

/**
 * Stripe webhook
 *
 * Logic:
 * - deposit_option paid:
 *     status -> Deposit Paid
 *     create remaining balance invoice
 *     overwrite COL_RENTAL_ID with remaining balance invoice id
 *     email customer remaining balance link
 *
 * - full_option paid:
 *     call payQuote(row) -> processPaid() sets Paid + sends confirmations
 *
 * - remaining_balance paid:
 *     call payQuote(row)
 */
function doPost(e) {
  console.log("INFO: Stripe webhook POST received");

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing POST body");
    }

    const payload = JSON.parse(e.postData.contents);

    if (payload.type !== "invoice.paid") {
      console.log("INFO: Ignoring event type: " + payload.type);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    const invoice = payload.data && payload.data.object ? payload.data.object : null;
    if (!invoice) {
      throw new Error("Missing invoice object");
    }

    const row = parseInt(invoice.metadata && invoice.metadata.row, 10);
    const paymentType = String(invoice.metadata && invoice.metadata.payment_type || "").trim();

    if (isNaN(row) || row < 1) {
      throw new Error("Invalid row in metadata: " + row);
    }

    if (!paymentType) {
      throw new Error("Missing payment_type metadata on invoice " + invoice.id);
    }

    const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
    const currentStatus = getPaymentStatus(row);

    console.log(
      "INFO: invoice.paid row=" + row +
      ", paymentType=" + paymentType +
      ", currentStatus=" + currentStatus +
      ", invoiceId=" + invoice.id
    );

    switch (paymentType) {
      case "deposit_option":
        handleDepositOptionPaid(invoice, row, sheet, currentStatus);
        break;

      case "full_option":
        handleFullOptionPaid(invoice, row, sheet, currentStatus);
        break;

      case "remaining_balance":
        handleRemainingBalancePaid(row, sheet, currentStatus);
        break;

      default:
        throw new Error("Unknown payment_type: " + paymentType);
    }

    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    console.log("ERR: Stripe Webhook Error: " + err.message);
    return ContentService.createTextOutput("Error").setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Deposit paid:
 * - mark Deposit Paid
 * - create remaining balance invoice
 * - overwrite COL_RENTAL_ID
 * - send email with balance link
 */
function handleDepositOptionPaid(invoice, row, sheet, currentStatus) {
  if (currentStatus === "Deposit Paid" || currentStatus === "Paid") {
    console.log("INFO: Deposit option already handled for row " + row);
    return;
  }

  if (currentStatus !== "Booked") {
    throw new Error("Unsupported status for deposit payment on row " + row + ": " + currentStatus);
  }

  sheet.getRange(row, COL_STATUS).setValue("Deposit Paid");

  const range = sheet.getRange(row, 1, 1, sheet.getLastColumn());
  const values = range.getValues()[0];

  const email = String(values[COL_EMAIL - 1] || "").trim();
  const reservationDate = new Date(values[COL_DATE - 1]);
  const totalStored = Number(values[COL_PRICE - 1]);
  const rentalDollars = totalStored - SECURITY_DEPOSIT_DOLLARS;
  const rentalCents = Math.round(rentalDollars * 100);

  if (!email) {
    throw new Error("Missing customer email for row " + row);
  }

  if (!Number.isFinite(rentalCents) || rentalCents < 50) {
    throw new Error("Invalid remaining rental amount for row " + row + ": " + rentalDollars);
  }

  const customerId = invoice.customer;
  const description = "Hall Booking - Remaining Balance";

  const balanceInvoiceData = createRemainingBalanceInvoice(
    customerId,
    row,
    description,
    rentalCents,
    reservationDate
  );

  // Overwrite R with remaining balance invoice id
  sheet.getRange(row, COL_RENTAL_ID).setValue(balanceInvoiceData.invoiceId);

  sendDepositPaidEmail(
    email,
    invoice.amount_paid,
    rentalCents,
    balanceInvoiceData.dueDate,
    balanceInvoiceData.url
  );

  console.log("INFO: Deposit-paid email with remaining balance link sent to " + email);
}

/**
 * Full payment paid:
 * final booking complete
 */
function handleFullOptionPaid(invoice, row, sheet, currentStatus) {
  if (currentStatus === "Paid") {
    console.log("INFO: Full payment already handled for row " + row);
    return;
  }

  if (currentStatus !== "Booked" && currentStatus !== "Deposit Paid") {
    throw new Error("Unsupported status for full payment on row " + row + ": " + currentStatus);
  }

  payQuote(row);
  console.log("INFO: payQuote called from full payment for row " + row);
}

/**
 * Remaining balance paid:
 * final booking complete
 */
function handleRemainingBalancePaid(row, sheet, currentStatus) {
  if (currentStatus === "Paid") {
    console.log("INFO: Remaining balance already handled for row " + row);
    return;
  }

  if (currentStatus !== "Deposit Paid") {
    throw new Error("Unsupported status for remaining balance on row " + row + ": " + currentStatus);
  }

  payQuote(row);
  console.log("INFO: payQuote called from remaining balance for row " + row);
}

/**
 * Create remaining balance invoice after deposit payment
 */
function createRemainingBalanceInvoice(customerId, row, description, rentalCents, reservationDate) {
  const finalDueDate = new Date(reservationDate);
  finalDueDate.setDate(finalDueDate.getDate() - 1);
  finalDueDate.setHours(23, 59, 59, 0);
  const finalDueDateUnix = Math.floor(finalDueDate.getTime() / 1000);

  const invoice = createInvoice(customerId, finalDueDateUnix, {
    row: row,
    payment_type: "remaining_balance"
  });

  createInvoiceItem(
    customerId,
    rentalCents,
    "usd",
    description,
    invoice.id
  );

  const finalizedInvoice = finalizeInvoice(invoice.id);

  return {
    invoiceId: invoice.id,
    url: finalizedInvoice.hosted_invoice_url,
    dueDate: finalDueDate
  };
}

/**
 * Test webhook logic
 */
function testDoPost(paymentType, row) {
  const mockBody = JSON.stringify({
    type: "invoice.paid",
    data: {
      object: {
        id: "in_test_" + (paymentType || "deposit_option") + "_123",
        amount_paid: paymentType === "deposit_option" ? Math.round(SECURITY_DEPOSIT_DOLLARS * 100) : 50000,
        customer: "cus_test_123",
        metadata: {
          row: String(row || 20),
          payment_type: paymentType || "deposit_option"
        }
      }
    }
  });

  const e = {
    postData: {
      contents: mockBody,
      type: "application/json"
    },
    headers: {
      "Stripe-Signature": "test"
    }
  };

  const result = doPost(e);
  console.log("Result: " + result.getContent());
}

/**
 * First email: customer chooses ONE option
 */
function sendInitialPaymentOptionsEmail(email, depositCents, fullCents, depositDueDate, fullDueDate, depositUrl, fullUrl) {
  const depositFormatted = (Number(depositCents) / 100).toFixed(2);
  const fullFormatted = (Number(fullCents) / 100).toFixed(2);

  const depositDueDateFormatted = formatDateLong(depositDueDate);
  const fullDueDateFormatted = formatDateLong(fullDueDate);

  const subject = "Lorton VFD Hall Booking — Payment Options";
  const body =
`Hello,

Your hall booking has been APPROVED.

Please choose ONE of the payment options below.

---------------------------------------------
OPTION 1 — Pay Security Deposit Only
---------------------------------------------
Amount: $${depositFormatted}
Due by: ${depositDueDateFormatted}
Pay here: ${depositUrl}

This secures your booking.
If you choose this option, the remaining balance must be paid before the final due date.

---------------------------------------------
OPTION 2 — Pay Full Amount Now
---------------------------------------------
Amount: $${fullFormatted}
Due by: ${fullDueDateFormatted}
Pay here: ${fullUrl}

This completes your payment in full now.

Please choose only one option above.

If you have any questions, please reply to this email.

Thank you,
Hall Booking Team
Lorton Volunteer Fire Department`;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body
  });
}

/**
 * Second email: after deposit is paid
 */
function sendDepositPaidEmail(email, depositPaidCents, remainingBalanceCents, dueDate, balanceUrl) {
  const depositFormatted = (Number(depositPaidCents) / 100).toFixed(2);
  const remainingFormatted = (Number(remainingBalanceCents) / 100).toFixed(2);
  const dueDateFormatted = formatDateLong(dueDate);

  const subject = "Lorton VFD Hall Booking — Deposit Received";
  const body =
`Hello,

We have successfully received your security deposit payment of $${depositFormatted}.

Your booking is now secured.

Please note that the remaining balance of $${remainingFormatted} must be paid by ${dueDateFormatted}.

Remaining balance payment link:
${balanceUrl}

If you have any questions, please reply to this email.

Thank you,
Hall Booking Team
Lorton Volunteer Fire Department`;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body
  });
}

function formatDateLong(dateObj) {
  return Utilities.formatDate(
    new Date(dateObj),
    Session.getScriptTimeZone(),
    "EEEE, MMMM d, yyyy"
  );
}
