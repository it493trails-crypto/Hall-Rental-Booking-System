// This script contains most of the business logic (submission, approvals, denials, payment, etc)

/***** CONFIG *****/
const CALENDAR_ID = 'c_48d4950d978108c45e596b787ed8fa2092922776ef33454c11de97c9c1470597@group.calendar.google.com';
const SHEET_NAME = 'Hall Rental';
const ADMIN_EMAIL = 'gmu@lortonvfd.com';
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzPp2AH190BEF1Hhobp7Dgrz8uW5PAov534dtMSN9uq3tvTLJUz9to3wf0g8UQqsAzo/exec";
const SS_ID = "1-felAx0Fr9zL_pBQ2jdeocsBKP_4GujiOU_boQSqBI4";

const COL_TIMESTAMP = 1, COL_NAME = 2, COL_EMAIL = 3, COL_PHONE = 4, COL_DATE = 5, COL_START = 6, COL_END = 7, COL_HALL_OPTION = 8, COL_TOUR_OPTION = 9, COL_EVENT_DESCRIPTION = 10, COL_AGREEMENT = 11, COL_INTERNAL = 12, COL_KITCHEN_ADDON = 13, COL_STATUS = 14, COL_EVENT_ID = 15, COL_PRICE = 16, COL_DEPOSIT_ID = 17, COL_RENTAL_ID = 18;


// -------------------------------------------------------------
// 1. FORM SUBMISSION HANDLER
// Triggered automatically when a new booking form is submitted.
// Checks for calendar conflicts, creates a tentative calendar event,
// sets status to Pending, and emails the admin for approval.
// -------------------------------------------------------------
function onFormSubmit(e) {
  console.log("INFO: onFormSubmit called");

  if (!e) {
    console.error("ERR: Environment attribute not provided to the onFormSubmit function");
    return;
  }

  const sheet = e.range.getSheet();

  console.log("INFO: Entering form submission lock");

  // Prevents a race condition if two submissions arrive simultaneously
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const row = e.range.getRow();
    const range = sheet.getRange(row, 1, 1, sheet.getLastColumn());
    const values = range.getValues()[0];
    const displayValues = range.getDisplayValues()[0];

    const name         = values[COL_NAME - 1];
    const email        = values[COL_EMAIL - 1];
    const phone        = values[COL_PHONE - 1];
    const date         = values[COL_DATE - 1];
    const startTimeStr = displayValues[COL_START - 1];
    const endTimeStr   = displayValues[COL_END - 1];
    const hallOption       = values[COL_HALL_OPTION - 1];
    const tourOption       = values[COL_TOUR_OPTION - 1];
    const eventDescription = values[COL_EVENT_DESCRIPTION - 1];
    const agreement        = values[COL_AGREEMENT - 1];
    const kitchenAddon     = values[COL_KITCHEN_ADDON - 1];

const startDateTime = combineDateAndTimeString(date, startTimeStr);
const endDateTime   = combineDateAndTimeString(date, endTimeStr);
   const now = new Date();

// Invalid datetime
if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
  console.log("ERR: Invalid start or end datetime");
  rejectInvalidSubmission(sheet, row, email, name, "The submitted date or time was invalid.");
  return;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const bookingDay = new Date(startDateTime);
bookingDay.setHours(0, 0, 0, 0);

// No same-day bookings allowed
if (bookingDay.getTime() === today.getTime()) {
  console.log("ERR: Same-day bookings are not allowed");
  rejectInvalidSubmission(sheet, row, email, name, "Same-day bookings are not allowed. Please choose a future date.");
  return;
}

// Must be future
if (startDateTime <= now) {
  console.log("ERR: Start time is not in the future");
  rejectInvalidSubmission(sheet, row, email, name, "The requested start time must be in the future.");
  return;
}

// End must be after start
if (endDateTime <= startDateTime) {
  console.log("ERR: End time must be after start time");
  rejectInvalidSubmission(sheet, row, email, name, "The end time must be after the start time.");
  return;
}

    console.log(`Submission Data:\nName:\t\t${name}\nEmail:\t\t${email}\nDate:\t\t${date}\nStart:\t\t${startDateTime}\nEnd:\t\t${endDateTime}`);

    const cal       = CalendarApp.getCalendarById(CALENDAR_ID);
    const title     = 'Hall Booking - ' + name;
    const conflicts = cal.getEvents(startDateTime, endDateTime);

    // If a time conflict exists, decline automatically and notify the customer
    if (conflicts && conflicts.length > 0) {
      sheet.getRange(row, COL_STATUS).setValue('Time Unavailable');
      sendConflictEmail(email, name, date, startDateTime, endDateTime);
      sendAdminConflictEmail(name, email, phone, date, startDateTime, endDateTime, row);
     // processDecline(sheet, row);
      return;
    }

    // Create a tentative calendar event pending admin approval
    const event = cal.createEvent(title, startDateTime, endDateTime, {
      description: 'TENTATIVE hall booking – awaiting admin approval.\n\nName: ' + name + '\nEmail: ' + email + '\nPhone: ' + phone + '\nStatus: Pending',
      guests: email,
      sendInvites: false
    });

    sheet.getRange(row, COL_STATUS).setValue('Pending');
    sheet.getRange(row, COL_EVENT_ID).setValue(event.getId());

    sendReceptionEmail(email, name, date, startDateTime, endDateTime);

    if (customerRequestedTour(values)) {
      sendTourRequestEmail(email, name);
    }

    // Email the admin with Approve / Decline buttons
    if (WEB_APP_URL && ADMIN_EMAIL) {
      const approveUrl = WEB_APP_URL + '?row=' + row + '&action=approve';
      const declineUrl = WEB_APP_URL + '?row=' + row + '&action=decline';
      const htmlAdmin =
        '<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;">' +
        '<h2 style="margin-bottom:10px;">New hall booking request</h2>' +
        '<p><b>Name:</b> ' + name + '<br>' +
        '<b>Email:</b> ' + email + '<br>' +
        '<b>Phone:</b> ' + phone + '<br>' +
        '<b>Date:</b> ' + formatDate(date) + '<br>' +
        '<b>Time:</b> ' + formatTime(startDateTime) + ' - ' + formatTime(endDateTime) + '<br>' +
        '<b>Hall Selected:</b> ' + (hallOption || 'N/A') + '<br>' +
        '<b>Kitchen Add-on:</b> ' + (kitchenAddon || 'N/A') + '<br>' +
        '<b>Tour Requested:</b> ' + (tourOption || 'N/A') + '<br>' +
        '<b>Event Description:</b> ' + (eventDescription || 'None provided') + '</p>' +
        '<p><a href="' + approveUrl + '" style="padding:10px 18px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:4px;">Approve</a> ' +
        '<a href="' + declineUrl + '" style="padding:10px 18px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:4px;margin-left:8px;">Decline</a></p>';
      MailApp.sendEmail({ to: ADMIN_EMAIL, subject: 'New hall booking request (row ' + row + ')', htmlBody: htmlAdmin });
    }

    console.log("INFO: Admin approval request sent");

  } finally {
    lock.releaseLock();
  }
}



// -------------------------------------------------------------
// 2. PROCESS APPROVAL
// Called when the admin approves a booking via the email link or
// by manually setting the status column to "Approved" in the sheet.
//
// - Updates the calendar event to green/confirmed
// - Calculates pricing and stores it in the sheet
// - Sends both Stripe invoices via sendInvoicesToCustomer()
//   which also sends our branded MailApp email with both payment links
// -------------------------------------------------------------
function processApproval(sheet, row) {
  console.log("INFO: Reservation approved");

  const range         = sheet.getRange(row, 1, 1, sheet.getLastColumn());
  const values        = range.getValues()[0];
  const displayValues = range.getDisplayValues()[0];

  const name      = values[COL_NAME - 1];
  const email     = values[COL_EMAIL - 1];
  const date      = values[COL_DATE - 1];
  const eventId   = values[COL_EVENT_ID - 1];
  const rowStatus = values[COL_STATUS - 1];

  const startDateTime = combineDateAndTimeString(date, displayValues[COL_START - 1]);
  const endDateTime   = combineDateAndTimeString(date, displayValues[COL_END - 1]);

  console.log(`Reservation Data:\nName: ${name}\nEmail: ${email}\nDate: ${date}\nEvent ID: ${eventId}\nStart: ${startDateTime}\nEnd: ${endDateTime}`);
/*
  // Guard against double-approvals
  if (rowStatus === "Booked" || rowStatus === "Approved" || rowStatus === "Paid") {
    console.log("INFO: Approval already sent, skipping");
    return;
  }
  */
  if (rowStatus === "Booked" || rowStatus === "Approved" || rowStatus === "Deposit Paid" || rowStatus === "Paid") {
  console.log("INFO: Approval already sent, skipping");
  return;
}
  if (rowStatus === "Declined") {
    console.log("WARN: Cannot approve a declined reservation");
    return;
  }

  // Update the calendar event to green if it exists
  const cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (eventId) {
    try {
      const event = cal.getEventById(eventId);
      if (event) {
        event.setDescription('BOOKED hall event.\n\nName: ' + name + '\nStatus: Approved.');
        event.setColor(CalendarApp.EventColor.GREEN);
      }
    } catch (err) {
      Logger.log('WARN: Calendar event not found: ' + eventId);
    }
  }
  console.log("INFO: Calendar status updated (if found)");

  // Calculate rental price and apply any add-ons
  const hallType           = values[COL_HALL_OPTION - 1];
  const baseRentalCents    = calculateTotalCents(hallType, date, startDateTime, endDateTime);
  const baseRentalDollars  = baseRentalCents / 100;
  const finalRentalDollars = applyAddonsToRentalDollars(baseRentalDollars, values);

  // Store the total (rental + deposit) in the sheet for reference
  sheet.getRange(row, COL_PRICE).setValue(finalRentalDollars + SECURITY_DEPOSIT_DOLLARS);

  const description = buildBookingDescription(hallType, name, date, startDateTime, endDateTime, values);

  // Create and send both Stripe invoices.
  // This also sends the branded MailApp email with both payment links.
  console.log("INFO: Calling sendInvoicesToCustomer()");
  sendInvoicesToCustomer(finalRentalDollars, description, email, row, sheet, date);
  console.log("INFO: Invoices sent to customer");

  sheet.getRange(row, COL_STATUS).setValue('Booked');
}


// -------------------------------------------------------------
// 3. PROCESS DECLINE
// Called when the admin declines a booking via the email link,
// by manually setting status to "Declined", or automatically
// when a calendar conflict is detected on form submission.
//
// - Deletes the calendar event if it exists
// - Sets status to Declined
// - Sends rejection email to customer
// -------------------------------------------------------------
function processDecline(sheet, row) {
  if (isNaN(row) || row < 1) {
    console.log("ERR: Row is not valid: " + row);
    return;
  }

  const range         = sheet.getRange(row, 1, 1, sheet.getLastColumn());
  const values        = range.getValues()[0];
  const displayValues = range.getDisplayValues()[0];

  const name          = values[COL_NAME - 1];
  const email         = values[COL_EMAIL - 1];
  const date          = values[COL_DATE - 1];
  const eventId       = values[COL_EVENT_ID - 1];
  const startDateTime = combineDateAndTimeString(date, displayValues[COL_START - 1]);
  const endDateTime   = combineDateAndTimeString(date, displayValues[COL_END - 1]);

  const cal = CalendarApp.getCalendarById(CALENDAR_ID);

  // Delete the calendar event if it exists
  if (eventId) {
    try {
      const event = cal.getEventById(eventId);
      if (event) event.deleteEvent();
    } catch (err) {
      console.warn("WARNING: Event with eventID: " + eventId + " does not exist");
    }
  }

  sheet.getRange(row, COL_STATUS).setValue('Declined');
  sendRejectionEmail(email, name, date, startDateTime, endDateTime);
}

function rejectInvalidSubmission(sheet, row, email, name, reason) {
  sheet.getRange(row, COL_STATUS).setValue('Declined');

  MailApp.sendEmail({
    to: email,
    subject: 'Hall booking request could not be processed',
    body:
`Hello ${name},

Your hall booking request could not be processed for the following reason:

${reason}

Please submit the form again with corrected information.

Thank you,
Hall Booking Team
Lorton Volunteer Fire Department`
  });
}
// -------------------------------------------------------------
// 4. PROCESS PAID
// Called when the rental invoice is paid via the Stripe webhook
// (through payQuote), or when the status is manually set to "Paid".
//
// - Sets status to Paid
// - Updates the calendar event to blue
// - Sends confirmation emails to both the admin and the customer
//
// NOTE: Do NOT call sendConfirmedBookingEmail or sendPaymentConfirmationEmail
// anywhere else — this is the single place those emails are sent.
// -------------------------------------------------------------
function processPaid(sheet, row) {
  try {
    if (!sheet || !row || row < 1) {
      console.log("ERR: Invalid sheet or row in processPaid");
      return;
    }

    const range         = sheet.getRange(row, 1, 1, sheet.getLastColumn());
    const values        = range.getValues()[0];
    const displayValues = range.getDisplayValues()[0];
    const currentStatus = String(values[COL_STATUS -1] || "").trim();

    if (currentStatus === "Paid") {
      console.log("Row is already paid");
      return;
    }

    const name       = values[COL_NAME - 1];
    const email      = String(values[COL_EMAIL - 1] || '').trim();
    const date       = values[COL_DATE - 1];
    const hallOption = values[COL_HALL_OPTION - 1];
    const kitchen    = values[COL_KITCHEN_ADDON - 1];
    const tour       = values[COL_TOUR_OPTION - 1];
    const eventId    = values[COL_EVENT_ID - 1];

    if (!email) {
      console.log("ERR: No customer email found for row " + row);
      return;
    }

    const startDateTime = combineDateAndTimeString(date, displayValues[COL_START - 1]);
    const endDateTime   = combineDateAndTimeString(date, displayValues[COL_END - 1]);

    // Mark booking as paid in the sheet
    sheet.getRange(row, COL_STATUS).setValue('Paid');

    // Update the calendar event to blue to indicate full payment
    if (eventId) {
      try {
        const cal   = CalendarApp.getCalendarById(CALENDAR_ID);
        const event = cal.getEventById(eventId);
        if (event) {
          event.setDescription(
            'BOOKED hall event.\n\n' +
            'Name: ' + name + '\n' +
            'Email: ' + email + '\n' +
            'Status: Paid / Booking Complete'
          );
          event.setColor(CalendarApp.EventColor.BLUE);
        }
      } catch (err) {
        console.log("WARN: Could not update calendar event for row " + row + ": " + err);
      }
    }

    // Send confirmation email to admin with full booking details
    sendConfirmedBookingEmail(ADMIN_EMAIL, name, date, startDateTime, endDateTime, hallOption, kitchen, tour);
    console.log("INFO: Admin payment confirmation email sent for row " + row);

    // Send confirmation email to customer
    sendPaymentConfirmationEmail(email, name, date, startDateTime, endDateTime);
    console.log("INFO: Customer payment confirmation email sent to " + email);

  } catch (err) {
    console.log("ERR in processPaid row " + row + ": " + err.message);
    throw err;
  }
}


// -------------------------------------------------------------
// 5. PAY QUOTE (STRIPE WEBHOOK ENTRY POINT)
// Called by doPost() in the Stripe file when the rental invoice
// is paid. Opens the sheet by ID and delegates entirely to
// processPaid() — which handles status, calendar, and all emails.
//
// Do NOT duplicate any logic here that processPaid() already handles.
// -------------------------------------------------------------
function payQuote(row) {
  console.log("INFO: Rental invoice paid, calling payQuote for row " + row);

  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);

  // processPaid handles everything: status update, calendar update,
  // admin confirmation email, and customer confirmation email
  processPaid(sheet, row);
}


// -------------------------------------------------------------
// 6. GET HANDLER
// Handles admin Approve / Decline actions from the email buttons.
// Reads the row and action from the URL parameters and routes
// to processApproval or processDecline accordingly.
// -------------------------------------------------------------
function doGet(e) {
  console.log("INFO: doGet running...");

  const row = parseInt(e.parameter.row, 10);
  if (isNaN(row) || row < 1) {
    return ContentService.createTextOutput("No valid row parameter provided");
  }
  console.log("Row: " + row);

  const action = String(e.parameter.action || '').toLowerCase();
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = ss.getSheetByName(SHEET_NAME);

const currentStatus = String(sheet.getRange(row, COL_STATUS).getValue() || "").trim();
// Stop duplicate actions if already finalized
if (currentStatus === "Approved" || currentStatus === "Booked" || currentStatus === "Deposit Paid" || currentStatus === "Paid") {
  return HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;padding:24px;">' +
    '<h2>This booking has already been approved.</h2>' +
    '<p>No further action was taken.</p>' +
    '<p><b>Current status:</b> ' + currentStatus + '</p>' +
    '</div>'
  );
}

if (currentStatus === "Declined") {
  return HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;padding:24px;">' +
    '<h2>This booking has already been declined.</h2>' +
    '<p>No further action was taken.</p>' +
    '<p><b>Current status:</b> Declined</p>' +
    '</div>'
  );
}


switch (action) {
  case "approve":
    processApproval(sheet, row);
    return HtmlService.createHtmlOutput(
      '<div style="font-family:Arial;padding:24px;">' +
      '<h2 style="color:green;">Booking Approved</h2>' +
      '<p>The reservation has been successfully approved.</p>' +
      '</div>'
    );

  case "decline":
    processDecline(sheet, row);
    return HtmlService.createHtmlOutput(
      '<div style="font-family:Arial;padding:24px;">' +
      '<h2 style="color:red;">Booking Declined</h2>' +
      '<p>The reservation has been declined.</p>' +
      '</div>'
    );

  default:
    return HtmlService.createHtmlOutput(
      '<div style="font-family:Arial;padding:24px;">' +
      '<h2>Invalid action</h2>' +
      '</div>'
    );
}}


// -------------------------------------------------------------
// 7. EDIT HANDLER
// Triggers on any manual edit to the sheet. If the STATUS column
// is changed to Approved, Declined, or Paid, the corresponding
// function is called automatically.
//
// NOTE: There were two onEdit() definitions in the original code —
// only one is kept here. The first (simpler) version has been removed.
// -------------------------------------------------------------
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME || e.range.getColumn() !== COL_STATUS) return;

  const row       = e.range.getRow();
  const newStatus = String(e.range.getValue()).trim();
  const oldStatus = String(e.oldValue || '').trim();

  if (newStatus === 'Approved') {
    processApproval(sheet, row);
    return;
  }

  if (newStatus === 'Declined') {
    processDecline(sheet, row);
    return;
  }

  // Only trigger processPaid on a fresh transition to Paid,
  // not when the status is already Paid (prevents re-triggering)
  if (newStatus === 'Paid' && oldStatus !== 'Paid') {
    processPaid(sheet, row);
    return;
  }
}


// -------------------------------------------------------------
// 8. ADMIN CONFLICT EMAIL
// Notifies the admin when a booking attempt fails due to a time
// conflict, including the customer's details and the requested time.
// -------------------------------------------------------------
function sendAdminConflictEmail(name, email, phone, date, startDateTime, endDateTime, row) {
  if (!ADMIN_EMAIL) return;

  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: 'Unsuccessful hall booking attempt - time unavailable',
    htmlBody:
      '<p><b>A hall booking attempt was unsuccessful because the requested time is unavailable.</b></p>' +
      '<p>' +
      '<b>Name:</b> ' + name + '<br>' +
      '<b>Email:</b> ' + email + '<br>' +
      '<b>Phone:</b> ' + phone + '<br>' +
      '<b>Date:</b> ' + formatDate(date) + '<br>' +
      '<b>Requested Time:</b> ' + formatTime(startDateTime) + ' - ' + formatTime(endDateTime) + '<br>' +
      '<b>Sheet Row:</b> ' + row +
      '</p>' +
      '<p>Please contact the customer with available alternative times.</p>'
  });
}