# AutoBid Tri-State

Car auction decision tool for NYC (all 5 boroughs), Staten Island, Long Island, Yonkers/Westchester, the Hudson Valley and New Jersey.

## Features
- **⚡ Ultra Scout** — scans every loaded car (NYC Marshal lists + Copart/IAA lots you add), estimates what each could sell for, prices your all-in cost, grades risk and ranks the best deals by a 0–100 deal score. Default rule: **only cars with keys that run & drive** (unverified cars are listed separately until you confirm them). Each car has a **Full analysis** with sale-price range, comp links (KBB, Edmunds, Facebook Marketplace, Craigslist), an inspection checklist, cost breakdowns at the likely and max bid, and risk factors.
- **Sale-price estimates** — depreciation model (typical new price, age, brand value retention, mileage, title). Enter a real comp price to override it.
- **Auction directory** — 22 IAA, Copart, Manheim, NYC Sheriff/Marshal and online auctions with map, distance from your ZIP, who can buy, next sale day, phone and directions.
- **NYC Marshal Lots** — every NYC Sheriff/City Marshal vehicle sale list, with each car decoded (year, make, model, trim, engine). Add lists by importing the official PDF in the app (works on your phone), or publish them for everyone with `update_data.bat`. Filter by borough, date, year, make; tap **Analyze** to run the numbers.
- **VIN lookup** — free decode + recalls from NHTSA, with an offline decoder and cached data as backups.
- **Risk grade (A–F)** and **max-bid calculator** — buyer fees, sales tax (NYC / LI / Yonkers / Westchester / NJ), towing, DMV and a hidden-damage pad.
- **Watchlist** — saved on your device, with JSON export/import.

## Getting NYC auction lists into the app
nyc.gov blocks requests from GitHub's servers, so the lists can't be pulled by a scheduled cloud job. Two ways that work:

1. **In the app (phone or PC):** NYC Marshal Lots → **Add PDF(s)**. Download any list from the [NYC auctions page](https://www.nyc.gov/site/finance/vehicles/auctions.page) and add it. The cars are read and decoded right in your browser and stay on that device.
2. **Publish for everyone (Windows PC):** double-click `update_data.bat` in your local clone. It runs `scripts/fetch_nyc_auctions.py`, which reads every upcoming list, decodes VINs and counts recalls with NHTSA, writes `data/nyc_marshal.json`, then commits and pushes. The site picks it up in a minute or two.

The workflow in `.github/workflows/` can also be started by hand from the Actions tab, but it will fail while nyc.gov blocks GitHub's servers.

## GitHub Pages
Settings → Pages → Deploy from branch `main` / root. Site: `https://zayaiken21.github.io/Autobid-Tristate/`

## Data notes
- Copart, IAA and Manheim don't offer public APIs for lot listings, so the directory links to each yard's live inventory.
- NYC Marshal sales: in person, cash only, no warranty; remove the car by 5 PM on sale day.
- Yard addresses and sale days were gathered Nov 2026 — confirm on the auction's site before going.
- Resale estimates are a model, not market data — use the comp links before bidding. Model prices live in `MODEL_PRICES` in `scout.js`.
- Edit the `YARDS` array in `index.html` to add or remove auctions.
