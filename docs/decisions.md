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

## Live line status: cached for 60 seconds, never replaced by sample data
Line status is the first live TfL feature. Responses are cached for 60 seconds so the app does not call TfL on every page load, and failed responses are not cached. The "Updated at" time is the time TfL produced the data, not the time the page loaded. If TfL fails or the key is missing, the page says so plainly instead of showing sample data, because old or made-up statuses presented as live could send someone down a closed line.

## Live place search: three services, and only places the user picks are stored
Search combines three sources through the `/api/places` route, so the browser never contacts them and no key reaches it: the TfL StopPoint search for stations and bus stops (with the lines that serve each station), postcodes.io for postcodes, and Geoapify for addresses and named places such as "Wembley Stadium". Each result carries its coordinates and, for stations and stops, the TfL id, because live journey planning needs them.

I chose Geoapify because it has a real autocomplete endpoint, a free plan of 3,000 credits a day with no card, and it can be limited to London. Nominatim's public service bans search-as-you-type, the public Photon server has no guarantees, Mapbox's temporary geocoding forbids storing coordinates (which would break Home, Work and recents), and LocationIQ's free plan limits caching to 48 hours. LocationIQ stays as the fallback.

To stay well inside the free allowance, the app waits 350 ms after typing stops, searches only from 3 characters, asks Geoapify for at most 5 results, shows at most 8 in total, skips Geoapify when the query is a full postcode, limits each caller to 40 requests a minute, and stops calling Geoapify after 2,500 lookups a day. The last two limits are kept in server memory, so they are a safety net rather than an exact meter.

Geoapify's terms don't say whether results may be stored, so nothing from Geoapify is cached on the server, and the browser keeps only a place the user explicitly picks (recents, Home and Work). Search results as a whole are never stored. If one service fails, the results from the others are still shown with a short message saying what is missing. If everything fails, the page says search isn't working instead of saying there are no matches.

Home and Work are now chosen by the user and stored as full places. The old hardcoded "Preston Road" and "University of Westminster" are gone, and names saved by the earlier version are dropped rather than guessed into coordinates. Journey URLs still carry names only; switching them to coordinates and TfL ids belongs to live journey planning.

## Bus stop letters, and fewer duplicate places
TfL's search results don't include the sign on a bus stop (for example "Stop PA"), but a lookup of the stop does, in the `indicator` field. The lookup for each search is a single request covering every station and bus stop in the results, and the same request already fetches the lines for stations, so no extra request is made per result or per keystroke. TfL caches it for an hour. If the lookup fails, or a stop has no sign (stop groups don't), the letter is left out rather than guessed. The letter is stored with saved places.

Geoapify often lists one place several times, so results are tidied before they are shown. Places with the same name less than 750 m apart count as one, and the best match is kept: highest confidence first, then how well known the place is, then nearest central London. Another place with the same name is shown only if it is somewhere else, and never more than two. A Geoapify place is also dropped if it has a similar name and sits within 300 m of a TfL station (100 m of a bus stop) already in the results, or is on the same spot as a station. Geoapify is asked for 8 results and we show up to 5 of them, because a lookup costs one credit however many results it returns.

## To confirm before public launch: Geoapify and data credits
These points are not settled by the terms I could read (Geoapify terms version 5, 2 February 2024, plus its pricing and autocomplete pages, read on 6 November 2026). Ask Geoapify support, and record the answers here.
- **Commercial use.** The terms say the Free plan can be used in production "with some limitations" and ask people to contact them for details. The pricing FAQ says production use is fine within the quota. What are the limitations?
- **Storing a chosen place.** The terms don't say whether coordinates and an address from autocomplete may be kept in the user's own browser for recents, Home and Work. Only the Places and Batch APIs explicitly allow storing results. Until this is answered, we store only what a user explicitly picks and never cache search results.
- **Attribution wording.** The terms require "OpenStreetMap attribution" and, on the Free plan, Geoapify attribution, but give no exact wording. The search screen currently shows "Place search by Geoapify. © OpenStreetMap contributors." with links, plus "Stations and stops: Powered by TfL Open Data."
- **Postcodes.** I did not check the licence for postcodes.io data (it uses Ordnance Survey and Royal Mail based open data). Check whether a credit is needed before launch.
- **Soft limits.** Geoapify says its limits are "soft". If the app grows past 3,000 lookups a day, expect to be asked to upgrade.
