# Dashboard and calendar design

This revision follows the user's three supplied screen references and keeps the booking product simple for nontechnical business owners.

The Dashboard is a separate page. Four compact tiles show bookings, revenue, completed appointments and cancellations. Day, Week and Month select one shared date range. The selected period also controls the appointments list and remains selected when opening Calendar. Calendar uses the second reference's composition: a small date picker and clearly labelled Filters on the left, with the appointment grid on the right. It does not add an Other Calendars section. Staff, Clients, Services and Appointments use the third reference's compact management-table styling.

The reference images guide spacing, surfaces and hierarchy. They do not authorize fabricated staff contacts, photos, clinical fields, notifications, payment data or integrations. No decorative arrows are used on buttons or action links.

## Metric definitions

- Bookings counts confirmed and completed appointments in the selected service-date period.
- Revenue is the saved price of completed appointments, labelled Completed appointments. It describes earned service value rather than collected cash. Deposits and simulated transactions are not added to it.
- Completed and Cancellations count their respective saved statuses.
- Staff selections from Calendar apply to the Dashboard totals and list. Empty selection produces zero totals and an explicit recovery action.
- Weeks run Monday to Sunday. Month means the actual calendar month, including leap days. Date arithmetic uses date keys with UTC calendar operations to avoid daylight-saving boundary shifts.

The existing booking, availability, staff limits and subscription request backend remain in place. This revision needs no database migration and does not connect billing or payment collection.

Work is developed on a feature branch and submitted for review. Publishing this revision requires explicit merge approval under the user's Git workflow preference.
