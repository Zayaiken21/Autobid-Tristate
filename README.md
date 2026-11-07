# AutoBid Tri-State

Car auction decision tool for NYC (all 5 boroughs), Staten Island, Long Island, Yonkers/Westchester, the Hudson Valley and New Jersey.

## Features
- **Auction directory** — 22 IAA, Copart, Manheim, NYC Sheriff/Marshal and online auctions with map, distance from your ZIP, who can buy, next sale day, phone and directions.
- **NYC Marshal Lots (automatic)** — every upcoming NYC Sheriff/City Marshal vehicle sale, pulled each morning from NYC Dept. of Finance PDFs. Each car is pre-decoded (year, make, model, trim, engine) with a recall count. Filter by borough, date, year, make; tap **Analyze** to run the numbers.
- **VIN lookup** — free decode + recalls from NHTSA, with an offline decoder and cached data as backups.
- **Risk grade (A–F)** and **max-bid calculator** — buyer fees, sales tax (NYC / LI / Yonkers / Westchester / NJ), towing, DMV and a hidden-damage pad.
- **Watchlist** — saved on your device, with JSON export/import.

## How the automation works
`.github/workflows/update-and-deploy.yml` runs every day (~6 AM New York time), on every push to `main`, and on demand:
1. `scripts/fetch_nyc_auctions.py` reads the NYC DOF auctions page, downloads each upcoming auction PDF, extracts every lot, batch-decodes VINs and counts recalls with NHTSA.
2. The result is committed to `data/nyc_marshal.json`.
3. The site is deployed to GitHub Pages.

Run it now: **Actions → Update auction data & deploy site → Run workflow**.

Run locally:
```
pip install requests pypdf
python scripts/fetch_nyc_auctions.py
```

## GitHub Pages setup (one time)
Repo → **Settings → Pages** → Source: **GitHub Actions**.
Site: `https://zayaiken21.github.io/Autobid-Tristate/`

## Data notes
- Copart, IAA and Manheim don't offer public APIs for lot listings, so the directory links to each yard's live inventory.
- NYC Marshal sales: in person, cash only, no warranty; remove the car by 5 PM on sale day.
- Yard addresses and sale days were gathered Nov 2026 — confirm on the auction's site before going.
- Edit the `YARDS` array in `index.html` to add or remove auctions.
