// This script contains payment configuration data for easy access and modification

const PaymentData = {
  payment_periods: {
    peak_season: {
      weekend_rates: {                                  // Holds hourly rates for each type of hall
        full_hall: 32500,                               // Values must be in cents
        small_hall: 20000,
        large_hall: 25000,
      },
    },
    weekday_discount: 0.75,   // Weekday discount multiplier (currently 25%)
    offpeak_discount: 0.75,   // Offpeak discount multiplier (currently 25%)
  }
}

const DepositData = {
  price: 250,
  days_until_due: 2,
}
