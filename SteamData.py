import requests
import json
import time
from datetime import datetime, timedelta

def get_top_steam_games(limit=100):
    """Fetches top played games from Steam's API with Unicode support."""
    url = "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/"
    try:
        response = requests.get(url)
        response.encoding = 'utf-8'  # Ensure proper Unicode handling
        if response.status_code == 200:
            return response.json()["response"]["ranks"][:limit]
        print(f"Steam API Error: HTTP {response.status_code}")
        return None
    except Exception as e:
        print(f"Error fetching top games: {e}")
        return None

def get_30_day_avg_players(appid):
    """Fetches 30-day avg players from SteamCharts with error padding."""
    url = f"https://steamcharts.com/app/{appid}/chart-data.json"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        if not data:
            return "N/A"
        cutoff = int((datetime.now() - timedelta(days=30)).timestamp())
        last_30_days = [day[1] for day in data if day[0] >= cutoff]
        return round(sum(last_30_days) / len(last_30_days)) if last_30_days else "N/A"
    except Exception as e:
        print(f"Error processing AppID {appid}: {e}")
        return "N/A"

def get_steam_game_details(appid):
    """Fetches game details with Unicode support and guaranteed 5 tags, with fallback for non-English names."""
    
    def fetch_details(url):
        try:
            response = requests.get(url, headers={'Accept-Language': 'en-US,en;q=0.9'}, timeout=15)
            response.encoding = 'utf-8'
            return response.json()
        except:
            return None

    default_response = {
        "name": f"AppID {appid}",
        "tags": ["N/A"] * 5
    }

    # First try with English locale
    url_en = f"https://store.steampowered.com/api/appdetails?appids={appid}&l=english"
    data = fetch_details(url_en)

    # If fail or no name, try fallback (no locale override)
    if not data or str(appid) not in data or "data" not in data[str(appid)]:
        return default_response

    details = data[str(appid)]["data"]
    name = details.get("name", "").strip()

    # If name is still empty, retry without forcing English
    if not name:
        url_fallback = f"https://store.steampowered.com/api/appdetails?appids={appid}"
        fallback_data = fetch_details(url_fallback)
        if fallback_data and str(appid) in fallback_data and "data" in fallback_data[str(appid)]:
            name = fallback_data[str(appid)]["data"].get("name", f"AppID {appid}").strip()

    # Extract and clean tags
    raw_tags = []
    if "genres" in details:
        raw_tags = [tag["description"].strip() for tag in details["genres"] if tag.get("description")]

    tags = (raw_tags[:5] + ["N/A"] * 5)[:5]

    return {
        "name": name if name else f"AppID {appid}",
        "tags": tags
    }

def getData():
    top_games = get_top_steam_games(limit=100)
    if not top_games:
        print("Failed to fetch top games. Exiting.")
        return

    output_data = []
    for game in top_games:
        appid = game["appid"]
        
        details = get_steam_game_details(appid)
        avg_players = get_30_day_avg_players(appid)
        
        # Ensure all fields are Unicode-safe
        safe_data = {
            "name":details["name"],
            "appid": appid,
            "current_players": game.get("concurrent", 0),
            "30_day_avg_players": avg_players if isinstance(avg_players, int) else "N/A",
            "top_5_tags": [tag for tag in details["tags"]]
        }
        
        output_data.append(safe_data)
        time.sleep(1.8)  # Conservative delay
        
        # Print progress with Unicode support
        print(f"Processed: {safe_data['name']} | Tags: {', '.join(safe_data['top_5_tags'])}")

    # Save with ensure_ascii=False for proper Unicode
    with open("steam_top_games_unicode.json", "w", encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    print("\nSuccess! Data saved to steam_top_games_unicode.json")

#getData()



import json
import csv

with open("steam_top_games_unicode.json", "r", encoding="utf-8") as f:
    data = json.load(f)

with open("games.csv", "w", newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(["appid", "name", "avg_players", "tag"])

    for game in data:
        appid = game["appid"]
        name = game["name"]
        avg = game["30_day_avg_players"]
        for tag in game["top_5_tags"]:
            if tag != "N/A":
                writer.writerow([appid, name, avg, tag])