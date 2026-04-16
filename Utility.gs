// This script contains utility functions used by other scripts

// Date/time utilitity functions
function combineDateAndTimeString(dateValue, timeString) {
  const combined = new Date(dateValue);
  const timeParts = timeString.match(/(\d+):(\d+)/);
  if (!timeParts) return combined;
  let hours = parseInt(timeParts[1], 10);
  const minutes = parseInt(timeParts[2], 10);
  if (timeString.toLowerCase().includes('pm') && hours < 12) hours += 12;
  if (timeString.toLowerCase().includes('am') && hours === 12) hours = 0;
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

// Formats the date for the emails
function formatDate(d) {
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'MMM dd, yyyy'); 
}

// Formats the time for the emails
function formatTime(d) {
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'h:mm a');
}

// Used when permissions change. Prompts you to authorize the permissions. Must be run manually
function authorizeOnce() { 
  SpreadsheetApp.getActive(); 
  CalendarApp.getAllCalendars(); 
}

// Returns the payment status of any row
function getPaymentStatus (row) {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
  return sheet.getRange(row, COL_STATUS).getValue();
}