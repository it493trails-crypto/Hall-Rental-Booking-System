# Hall Rental Booking System #
This code was developed for a local organization by a group of GMU students in an effort to streamline their booking reservation process.
The programming language is AppScript, and it is intended for use within their specific Google Workspace environment.

## Deployment Instructions ##
1. Create a Google Form modeled after the Google Form provided to you in the handoff
2. A spreadsheet should be automatically created to store the Google Form submission data
3. The spreadsheet should look like the spreadsheet provided to you in the handoff
4. If some of the columns are not correctly placed, the code can adapt to that by changing the column's index in the beginning of the Code.gs file
5. Change the Stripe secret key to the secret key in your production Stripe environment (found in Script Parameters)
6. Adjust pricing as required using the PaymentData.gs script
7. Submit test bookings as required until you are confident it is working as expected
8. Retain the demo deployment as a model to replicate

* Additional details can be found in the handoff documentation

## Potential Improvements ##
1. Use Scriptlets for email templates
2. Improve email templates to make them more professional
3. Add a customer dashboard, using a web app
4. Make a version of the Booking calendar public
5. Create an Admin dashboard in Google Sheets -- NOT IN THE MAIN SHEET
6. Add additional controls in Google Sheets -- NOT IN THE MAIN SHEET
7. Move payment data from the PaymentData.gs file to Google Sheets -- NOT IN THE MAIN SHEET
8. Set up a test environment to make changes without affecting prod

## Support ##
We will not be providing support after the handoff is completed.
Please procceed with caution when editing the code and be sure to test it.
