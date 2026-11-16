# Society Management System

A browser based society operations demo built with HTML, CSS and vanilla JavaScript. Data stays in the browser's LocalStorage; there is no backend or real payment processing. LocalStorage authentication is only a classroom simulation and does not provide production security.

## Run locally

Open `index.html` or `login.html` in a modern browser. The application uses Chart.js and Google Fonts CDNs for charts and typography; the core screens and data remain local. No build step or package installation is needed.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@society.com | admin123 |
| Resident | resident@society.com | resident123 |
| Vendor | vendor@society.com | vendor123 |

New resident and vendor records receive a linked demo login with password `demo1234` when their email is not already in use.

## Modules

- **Admin:** dashboard, residents, flats, maintenance bills, vendor directory, complaints, payments and receipts, reports/CSV/print, and society settings.
- **Resident:** private profile and flat views, maintenance and payment history, receipts, complaint submission and status/administrator updates.
- **Vendor:** own profile, assigned complaints, progress updates, completion requests for administrator confirmation, and service history.
- **Shared:** responsive navigation, input validation, confirmations, notifications, search/filtering, local demo data, and linked records.

## Data and reset

The `DB` layer in `js/storage.js` keeps `sms_users`, `sms_residents`, `sms_flats`, `sms_maintenance`, `sms_vendors`, `sms_complaints`, `sms_payments`, and `sms_settings` in LocalStorage. The initial sample records are connected by IDs, and refreshes preserve edits. To restore the original sample data, sign in as admin, open **Settings**, and choose **Reset demo data**. This replaces the records in that browser.

You can also clear the `sms_*` keys for this site in browser developer tools; the next visit will initialize the sample database again.

## Project structure

- `index.html`, `login.html`: entry and sign-in pages
- `dashboard.html`, `resident-dashboard.html`, `vendor-dashboard.html`: role portals
- `css/`: shared, dashboard, component and responsive styles
- `js/`: storage/domain logic, authentication, admin modules, role portals and app shell

## Limitations

Records exist only in one browser profile and can be edited by anyone with access to that profile. Credentials are stored as plain text for demonstration. Payments are manually recorded simulations; no gateway or banking service is connected. Chart.js and Google Fonts need internet access.
