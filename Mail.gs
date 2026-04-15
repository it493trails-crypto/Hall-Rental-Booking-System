// This script contains most of the email sending code

// Sends the reservation time conflict email
function sendConflictEmail (email, name, date, startDateTime, endDateTime) {
  MailApp.sendEmail({
    to: email,
    subject: 'Hall booking time unavailable',
    body: `Hi ${name},\n\n
          Thank you for your hall booking request. Unfortunately, the date and time you selected is not available:\n\n
          Requested:\n
          Date: ${formatDate(date)}\n
          Time: ${formatTime(startDateTime)} - ${formatTime(endDateTime)}\n\n
          Please submit another request with a different date or time.\n\n
          Best regards,\nHall Booking Team`
  });
  console.log("INFO: Time conflict rejection email sent");
}

// Sends the reservation request received email
function sendReceptionEmail (email, name, date, startDateTime, endDateTime) {
  MailApp.sendEmail({
    to: email,
    subject: 'We received your hall booking request',
    body: 'Hi ' + name + ',\n\n' +
          'Thank you for your hall booking request. We have received the following details:\n\n' +
          'Date: ' + formatDate(date) + '\n' +
          'Time: ' + formatTime(startDateTime) + ' - ' + formatTime(endDateTime) + '\n\n' +
          'Your booking is currently pending admin approval. We will email you once it is approved.\n\n' +
          'Please check your spam or junk folder if you do not receive our email.\n' +
          'Best regards,\nHall Booking Team'
  });
  console.log("INFO: Reservation received email sent");
}
/*
// Sends the reservation confirmation email
function sendConfirmationEmail (email, name, date, startDateTime, endDateTime, totalDollars, paymentLink) {
  MailApp.sendEmail({
    to: email,
    subject: 'Your hall booking is confirmed',
    body:
      'Hi ' + name + ',\n\n' +
      'Good news! Your hall booking has been APPROVED and is now confirmed.\n\n' +
      'Details:\n' +
      'Date: ' + formatDate(date) + '\n' +
      'Time: ' + formatTime(startDateTime) + ' - ' + formatTime(endDateTime) + '\n' +
      'Total: $' + totalDollars.toFixed(2) + '\n\n' +
      'Payment link:\n' + (paymentLink && paymentLink.url ? paymentLink.url : '[missing link]') + '\n\n' +
      'Best regards,\nHall Booking Team'
  });
  console.log("INFO: Confirmation email sent");
}
*/
// Sends the hall reservation rejection email
function sendRejectionEmail (email, name, date, startDateTime, endDateTime) {
  MailApp.sendEmail({
    to: email,
    subject: 'Update on your hall booking request',
    body: 'Hi ' + name + ',\n\n' +
          'Thank you for your hall booking request for:\n' +
          'Date: ' + formatDate(date) + '\n' +
          'Time: ' + formatTime(startDateTime) + ' - ' + formatTime(endDateTime) + '\n\n' +
          'We’re sorry, but we are unable to confirm your booking for this time.\n' +
          'Please feel free to submit another request.\n\n' +
          'Best regards,\nHall Booking Team'
  });
  console.log("INFO: Rejection email sent");
}

function sendPaymentConfirmationEmail (email, name, date, startDateTime, endDateTime) {
  MailApp.sendEmail({
    to: email,
    subject: "Reservation payment recieved and booking confirmed",
    body: "Hi " + name + ",\n\n" +
          "We have recieved your reservation payment.\nThe details we have on file from you are as follows:\n\nDate: " + formatDate(date) + "\nTime:" + formatTime(startDateTime) + " - " + formatTime(endDateTime) + "\n\nWe look forward to seeing you soon!\nPlease let us know if you have encountered any problems.\nBest regards,\nHall Booking Team"
  });
  console.log("INFO: Payment confirmation email sent to user");
}

function sendConfirmedBookingEmail (email, name, date, startDateTime, endDateTime, hallOption, kitchen, tour) {
  MailApp.sendEmail({
    to: email,
    subject: "Confirmed Hall Booking - " + formatDate(date),
    body:
      "A hall booking has been successfully confirmed and fully paid.\n\n" +

      "Booking Details:\n" +
      "-------------------------\n" +
      "Name: " + name + "\n" +
      "Email: " + email + "\n" +
      "Date: " + formatDate(date) + "\n" +
      "Time: " + formatTime(startDateTime) + " - " + formatTime(endDateTime) + "\n\n" +

      "Selections:\n" +
      "-------------------------\n" +
      "Hall Option: " + hallOption + "\n" +
      "Kitchen Add-on: " + (kitchen ? "Yes" : "No") + "\n" +
      "Tour Requested: " + (tour ? "Yes" : "No") + "\n\n" +

      "This booking is now confirmed and reflected on the calendar."
  });
}

function logEmail (content, title) {
  MailApp.sendEmail({
    to: "it493trails@gmail.com",
    subject: "SYSTEM: " + title ?? "SYSTEM: LOG",
    body: content
  });
}

/**
 * Sends tour follow-up email if the customer selected Yes.
 */
function sendTourRequestEmail(email, name) {
  const subject = 'Lorton VFD Tour Request';

  const body =
`Hello${name ? ' ' + name : ''},

Thank you for your interest in scheduling a tour of Lorton VFD.

Please reply to this email with your preferred date and time for the tour, and our team will follow up with you to confirm availability.

Best regards,
Lorton VFD`;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    name: 'Lorton VFD'
  });
}
