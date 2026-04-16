// This script handles add-ons (currently just the Kitchen Add-on)

const KITCHEN_ADDON_PRICE_DOLLARS = 100;

/**
 * Returns true if the sheet value is "Yes".
 *
 * @param {*} value
 * @returns {boolean}
 */
function isYesValue(value) {
  return String(value || '').trim().toLowerCase() === 'yes';
}

/**
 * Returns the kitchen add-on amount in dollars.
 *
 * @param {Array} values Full row values from the sheet
 * @returns {number}
 */
function getKitchenAddonAmountDollars(values) {
  const kitchenAddonValue = values[COL_KITCHEN_ADDON - 1];
  return isYesValue(kitchenAddonValue) ? KITCHEN_ADDON_PRICE_DOLLARS : 0;
}

/**
 * Returns whether the customer requested a tour.
 *
 * @param {Array} values Full row values from the sheet
 * @returns {boolean}
 */
function customerRequestedTour(values) {
  const tourValue = values[COL_TOUR_OPTION - 1];
  return isYesValue(tourValue);
}

/**
 * Adds kitchen add-on pricing to the calculated rental amount.
 *
 * @param {number} rentalDollars Base rental amount in dollars
 * @param {Array} values Full row values from the sheet
 * @returns {number}
 */
function applyAddonsToRentalDollars(rentalDollars, values) {
  return rentalDollars + getKitchenAddonAmountDollars(values);
}

/**
 * Builds a readable payment description including add-ons.
 *
 * @param {string} hallType
 * @param {string} name
 * @param {Date} date
 * @param {Date} startDateTime
 * @param {Date} endDateTime
 * @param {Array} values
 * @returns {string}
 */
function buildBookingDescription(hallType, name, date, startDateTime, endDateTime, values) {
  let description =
    hallType + ' Hall Rental - ' + name + ' - ' + formatDate(date) + ' ' +
    formatTime(startDateTime) + ' to ' + formatTime(endDateTime) +
    ' (' + billableHours(startDateTime, endDateTime) + ' hour(s))';

  if (getKitchenAddonAmountDollars(values) > 0) {
    description += ' + Kitchen Add-On';
  }

  return description;
}
