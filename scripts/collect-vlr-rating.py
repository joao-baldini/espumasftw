"""Collect factual per-map VLR 2.0 statistics for offline rating calibration.

Optional research tool: requires requests and beautifulsoup4. No API credentials.
Only completed maps with all ten players and complete stats enter the dataset.
"""
import concurrent.futures
import json
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://www.vlr.gg"
EVENTS = [
    ("champions-2025", "train", "/event/2283/valorant-champions-2025"),
    ("champions-2025", "train", "/event/2283/valorant-champions-2025/group-stage"),
    ("champions-2026", "test", "/event/2766/valorant-champions-2026/playoffs"),
    ("champions-2026", "test", "/event/2766/valorant-champions-2026/group-stage"),
]


def page(path):
    cache = ROOT / "work/vlr-rating-cache" / (re.sub(r"[^a-zA-Z0-9]", "_", path) + ".html")
    if cache.exists():
        html = cache.read_text(encoding="utf-8")
    else:
        response = requests.get(BASE + path, timeout=40)
        response.raise_for_status()
        html = response.text
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(html, encoding="utf-8")
    return BeautifulSoup(html, "html.parser")


def collect(job):
    event, split, path = job
    soup = page(path)
    status = soup.select_one(".match-header-vs-note")
    if not status or status.get_text(strip=True).lower() != "final":
        return [], f"Skip unfinished: {path}"
    rows = []
    for game in soup.select(".vm-stats-game"):
        game_id = game.get("data-game-id")
        scores = game.select(".vm-stats-game-header .score")
        if game_id == "all" or len(scores) != 2:
            continue
        score = [int(s.get_text(strip=True)) for s in scores]
        if max(score) < 13 or abs(score[0] - score[1]) < 2:
            continue
        rounds = sum(score)
        map_node = game.select_one(".map-name")
        map_name = map_node.get_text(" ", strip=True).replace(" PICK", "")
        stats = game.select(".ovw-row:not(.mod-head)")
        if len(stats) != 10:
            raise ValueError(f"Expected ten players: {path} {game_id}, got {len(stats)}")
        map_rows = []
        for row in stats:
            values = {}
            for key, column in [("rating", "rating2"), ("kills", "kills"), ("deaths", "deaths"), ("assists", "assists"), ("adr", "adr"), ("fk", "fb"), ("fd", "fd"), ("kast", "kast"), ("acs", "acs")]:
                node = row.select_one(f'[data-col="{column}"] .side.mod-both')
                if not node or not re.fullmatch(r"\d+(?:\.\d+)?%?", node.get_text(strip=True)):
                    break
                values[key] = float(node.get_text(strip=True).rstrip("%"))
            else:
                player = row.select_one(".ovw-player a")
                map_rows.append({"event": event, "split": split, "matchId": path.split("/")[1], "mapId": game_id, "map": map_name, "sourceUrl": BASE + path, "playerId": player.get("href").split("/")[2], "player": row.select_one(".ovw-player-name").get_text(strip=True), "rounds": rounds, **values})
        if len(map_rows) == 10:
            # Self-inflicted deaths can legitimately exceed credited kills.
            if sum(r["kills"] for r in map_rows) > sum(r["deaths"] for r in map_rows):
                raise ValueError(f"More kills than deaths: {path} {game_id}")
            rows.extend(map_rows)
    return rows, f"{event} {path.split('/')[1]}: {len(rows)} player-map observations"


if __name__ == "__main__":
    jobs = {}
    for event, split, path in EVENTS:
        for a in page(path).select('a[href]'):
            href = a.get("href")
            if re.match(r"^/\d+/[^?]+$", href) and "valorant-champions-202" in href:
                jobs[href] = (event, split, href)
    observations = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for rows, message in pool.map(collect, sorted(jobs.values())):
            observations.extend(rows)
            print(message, flush=True)
    observations.sort(key=lambda r: (r["split"], r["matchId"], r["mapId"], r["playerId"]))
    destination = ROOT / "data/rating-analysis/vlr-samples.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps({"collectedAt": "2026-10-08", "sources": [BASE + path for _, _, path in EVENTS], "observations": observations}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(observations)} observations to {destination}")
