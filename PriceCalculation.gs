// This script handles rental price calculation

// Takes in the hall types from the form and normalizes them into hall types that are used by the system.
function normalizeHallType(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('full')) return 'FULL';
  if (s.includes('small')) return 'SMALL';
  if (s.includes('large')) return 'LARGE';
  throw new Error('Unknown hall type: ' + raw);
}

// Calculates and returns whether the provided date object is during the peak season. Returns boolean
function isPeakSeason(dateObj) {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const start = new Date(year, 4, 1);  // May 1 (month is 0-based)
  const end = new Date(year, 8, 30, 23, 59, 59, 999); // Sep 30
  return d >= start && d <= end;
}

// Returns whether the provided date is a weekend. Returns boolean
function isWeekend(dateObj) {
  const day = new Date(dateObj).getDay(); // Sun=0, Mon=1, ... Fri=5, Sat=6
  return day === 5 || day === 6 || day === 0; // Fri/Sat/Sun
}

// Returns the hourly rates based on hall type. Returns number
function hourlyBaseRateCents(hallType) {
  const t = normalizeHallType(hallType);
  if (t === 'FULL') return PaymentData.payment_periods.peak_season.weekend_rates.full_hall;
  if (t === 'SMALL') return PaymentData.payment_periods.peak_season.weekend_rates.small_hall;
  if (t === 'LARGE') return PaymentData.payment_periods.peak_season.weekend_rates.large_hall;
  throw new Error('Invalid hall type: ' + hallType);
}

// Calculates the discount multiplier to apply the base prices too
function discountMultiplier(dateObj) {
  const peak = isPeakSeason(dateObj);
  const weekend = isWeekend(dateObj);

  if (peak && weekend) {
    console.log("INFO: Reserved day is during peak and weekend, no discount applied");
    return 1.0;        // Peak weekend: no discount
  }
  if (peak && !weekend) {
    console.log("INFO: Reserved day is during peak, " + Math.floor((1 - PaymentData.payment_periods.weekday_discount) * 100) + "% discount applied");
    return PaymentData.payment_periods.weekday_discount;      // Peak weekday: 25% off
  }
  if (!peak && weekend) {
    console.log("INFO: Reserved day is during weekend, " + Math.floor((1 - PaymentData.payment_periods.offpeak_discount) * 100) + "% discount applied");
    return PaymentData.payment_periods.offpeak_discount;      // Off-peak weekend: 25% off
  }
  if (!peak && !weekend) {
    console.log("INFO: Reserved day is during neither peak nor weekend, " + Math.floor((1 - (PaymentData.payment_periods.offpeak_discount * PaymentData.payment_periods.weekday_discount)) * 100) + "% discount applied");
    return PaymentData.payment_periods.weekday_discount * PaymentData.payment_periods.offpeak_discount 
    // Off-peak weekday: stacked
  }
}

// If you bill by the hour, you usually round UP to next hour.
// If you want exact fractional hours instead, change Math.ceil(...) to just hoursRaw.
function billableHours(startDateTime, endDateTime) {
  const ms = new Date(endDateTime).getTime() - new Date(startDateTime).getTime();
  if (ms <= 0) throw new Error('End time must be after start time');
  const hoursRaw = ms / 3600000;
  return Math.ceil(hoursRaw);
}

// Calculates the total cents based on discount multiplier, hall type, number of hours, and length of time
function calculateTotalCents(hallType, bookingDate, startDateTime, endDateTime) {
  const baseCents = hourlyBaseRateCents(hallType);
  const mult = discountMultiplier(bookingDate);
  const hours = billableHours(startDateTime, endDateTime);

  // round to nearest cent after discount
  const discountedHourlyCents = Math.round(baseCents * mult);

  // Calculate price
  const price_cents = discountedHourlyCents * hours;

  return price_cents;
}
