# Decision log

## London only for the MVP
London has one free API (TfL) covering every mode of transport, plus live lift status. Other UK cities need several data sources, and their accessibility data is patchier. The transport code is kept in its own layer so other cities can be added later.

## Web app (PWA) instead of the App Store
A web app can be installed to the home screen without App Store fees or review delays, so it can be tested with real users sooner. A native app can follow if needed.

## Manual stop progress, for now
Estimating your position from the timetable goes wrong as soon as a train is delayed. For disabled or anxious travellers, wrong guidance is worse than none. Stop progress is manual until it can be based on live data, and the manual button will stay as a backup.

## API key kept on the server only
The TfL key never reaches the browser. The `server-only` package makes the build fail if this rule is ever broken by accident.

## No open-source licence (yet)
The code is public so it can be viewed, but all rights are kept while I decide whether Hopline becomes a product.

## Research before building more features
Existing apps like TfL Go already offer step-free routes and live lift status, so Hopline only adds value if it solves problems they don't. Before building further features, I'm speaking to disabled travellers to find out where current apps let them down.