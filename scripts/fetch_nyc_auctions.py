"""
Pull NYC Sheriff / City Marshal vehicle auction lists (public PDFs from NYC Dept. of Finance),
extract every lot (year, make, plate state, VIN, lienholder), decode VINs with NHTSA,
count recalls, and write data/nyc_marshal.json for the AutoBid Tri-State site.

Runs nightly in GitHub Actions. Local run:  pip install requests pypdf  &&  python scripts/fetch_nyc_auctions.py
"""
import io
import json
import re
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

import requests
from pypdf import PdfReader

AUCTION_PAGE = "https://www.nyc.gov/site/finance/vehicles/auctions.page"
BASE = "https://www.nyc.gov"
OUT = Path(__file__).resolve().parent.parent / "data" / "nyc_marshal.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (AutoBid-Tristate data updater; +https://github.com/Zayaiken21/Autobid-Tristate)",
    "Accept": "text/html,application/pdf,application/json;q=0.9,*/*;q=0.8",
}
BOROUGHS = {"bronx": "Bronx", "brooklyn": "Brooklyn", "queens": "Queens", "queen": "Queens",
            "statenisland": "Staten Island", "manhattan": "Manhattan"}
VIN_RE = re.compile(r"\b([A-HJ-NPR-Z0-9]{17})\b")
MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"

session = requests.Session()
session.headers.update(HEADERS)


def get(url, **kw):
    for attempt in range(3):
        try:
            r = session.get(url, timeout=45, **kw)
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            print(f"  retry {attempt + 1} for {url}: {e}", file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"failed to fetch {url}")


def parse_filename(href):
    """auction-111326-bronx.pdf / auction-11162026-statenisland.pdf / auction-111826.1-queens.pdf"""
    m = re.search(r"auction-(\d{6}|\d{8})(?:\.\d+)?-([a-z]+)\.pdf", href, re.I)
    if not m:
        return None, None
    d, boro = m.group(1), m.group(2).lower()
    try:
        dt = datetime.strptime(d, "%m%d%y" if len(d) == 6 else "%m%d%Y").date()
    except ValueError:
        dt = None
    return dt, BOROUGHS.get(boro, boro.title())


def find_pdfs():
    html = get(AUCTION_PAGE).text
    hrefs = re.findall(r'href="([^"]*/auction/auction-[^"]+\.pdf)"', html, re.I)
    seen, out = set(), []
    for h in hrefs:
        url = h if h.startswith("http") else BASE + h
        if url in seen:
            continue
        seen.add(url)
        out.append(url)
    return out


def pdf_text(url):
    data = get(url).content
    reader = PdfReader(io.BytesIO(data))
    return "\n".join((p.extract_text() or "") for p in reader.pages)


def parse_sale_info(text):
    """Best-effort: the sale's date/time line and the yard where it happens."""
    flat = re.sub(r"\s+", " ", text)
    info = {}
    m = re.search(rf"on \w+,? ((?:{MONTHS}) \d{{1,2}},? \d{{4}})", flat, re.I)
    if m:
        info["dateText"] = m.group(1)
    m = re.search(r"\d{4},? at (.{3,40}?(?:o'clock in the \w+|[AP]\.?M\.?)(?: \(viewing at [^)]*\))?),? at (.{5,120}?),? the right", flat, re.I)
    if m:
        info["time"] = m.group(1).strip()
        info["location"] = m.group(2).strip()
    m = re.search(r"AUCTION FOR (?:CITY )?MARSHAL:? ([A-Z][A-Za-z.\- ]{3,40}?)(?: CITY MARSHAL| OFFICE|$)", flat)
    if m:
        info["marshal"] = m.group(1).strip()
    return info


def parse_lots(text):
    lots, seen = [], set()
    lines = text.splitlines()
    for i, line in enumerate(lines):
        m = VIN_RE.search(line)
        if not m:
            continue
        vin = m.group(1)
        if vin in seen or not re.search(r"[A-Z]", vin) or not re.search(r"\d", vin):
            continue
        before = line[: m.start()].split()
        after = line[m.end():].strip()
        lot = {"vin": vin}
        # expected layout before VIN:  #  YEAR  MAKE  PLATE  ST
        if before and before[0].isdigit() and len(before[0]) <= 3:
            lot["lot"] = int(before.pop(0))
        if before and re.fullmatch(r"(19|20)\d\d", before[0]):
            lot["year"] = int(before.pop(0))
        if len(before) >= 2 and re.fullmatch(r"[A-Z]{2}", before[-1]):
            lot["plateState"] = before.pop()
            lot["plate"] = before.pop() if len(before) >= 2 else ""
        if before:
            lot["make"] = " ".join(before)
        lien = after
        # lienholder sometimes continues on the next line (indented, no VIN, no lot #)
        if i + 1 < len(lines):
            nxt = lines[i + 1].strip()
            if nxt and not VIN_RE.search(nxt) and not re.match(r"^\d+\s", nxt) and nxt.isupper() and len(nxt) < 60 \
                    and not nxt.startswith(("#", "MARSHAL", "PUBLIC", "OFFICE", "THE ", "NYC ", "NYS ")):
                lien = (lien + " / " + nxt).strip(" /")
        if lien:
            lot["lienholder"] = lien.replace(";", " ")
        seen.add(vin)
        lots.append(lot)
    return lots


def decode_vins(vins):
    """NHTSA batch decode, 50 VINs per request."""
    out = {}
    for i in range(0, len(vins), 50):
        chunk = vins[i:i + 50]
        try:
            r = session.post("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesBatch/",
                             data={"format": "json", "data": ";".join(chunk)}, timeout=90)
            r.raise_for_status()
            for row in r.json().get("Results", []):
                out[row["VIN"]] = {
                    "modelYear": row.get("ModelYear") or None,
                    "make": (row.get("Make") or "").title() or None,
                    "model": row.get("Model") or None,
                    "trim": row.get("Trim") or None,
                    "body": row.get("BodyClass") or None,
                    "engine": " ".join(x for x in [
                        f"{float(row['DisplacementL']):.1f}L" if row.get("DisplacementL") else "",
                        f"{row['EngineCylinders']}-cyl" if row.get("EngineCylinders") else ""] if x) or None,
                    "fuel": row.get("FuelTypePrimary") or None,
                    "drive": row.get("DriveType") or None,
                }
        except Exception as e:  # keep going; the site still shows raw lot info
            print(f"  VIN decode batch failed: {e}", file=sys.stderr)
        time.sleep(1)
    return out


def recall_counts(keys):
    out = {}
    for make, model, year in keys:
        try:
            r = session.get("https://api.nhtsa.gov/recalls/recallsByVehicle",
                            params={"make": make, "model": model, "modelYear": year}, timeout=30)
            out[(make, model, year)] = len(r.json().get("results", [])) if r.ok else None
        except Exception:
            out[(make, model, year)] = None
        time.sleep(0.3)
    return out


def main():
    print("Finding auction PDFs…")
    pdfs = find_pdfs()
    print(f"  {len(pdfs)} PDFs listed")
    today = date.today()
    auctions = []
    for url in pdfs:
        dt, boro = parse_filename(url)
        if dt and dt < today:
            continue  # only today and upcoming
        try:
            text = pdf_text(url)
        except Exception as e:
            print(f"  skip {url}: {e}", file=sys.stderr)
            continue
        lots = parse_lots(text)
        info = parse_sale_info(text)
        print(f"  {url.rsplit('/', 1)[-1]}: {len(lots)} lots")
        auctions.append({"date": dt.isoformat() if dt else None, "borough": boro, "pdf": url, **info, "lots": lots})
        time.sleep(1)

    all_vins = sorted({l["vin"] for a in auctions for l in a["lots"]})
    print(f"Decoding {len(all_vins)} VINs with NHTSA…")
    decoded = decode_vins(all_vins)

    keys = set()
    for v in decoded.values():
        if v.get("make") and v.get("model") and v.get("modelYear"):
            keys.add((v["make"], v["model"], v["modelYear"]))
    print(f"Checking recalls for {len(keys)} model/years…")
    recalls = recall_counts(sorted(keys))

    for a in auctions:
        for l in a["lots"]:
            d = decoded.get(l["vin"])
            if d:
                l["decoded"] = d
                l["recalls"] = recalls.get((d.get("make"), d.get("model"), d.get("modelYear")))

    auctions.sort(key=lambda a: (a["date"] or "9999", a["borough"] or ""))
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": AUCTION_PAGE,
        "auctionCount": len(auctions),
        "lotCount": sum(len(a["lots"]) for a in auctions),
        "auctions": auctions,
    }
    if not auctions and OUT.exists():
        print("No auctions fetched — keeping the previous data file.")
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=1))
    print(f"Wrote {OUT} — {payload['auctionCount']} auctions, {payload['lotCount']} lots")


if __name__ == "__main__":
    main()
