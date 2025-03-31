
import time
import json
from datetime import datetime
import requests
import os

def get_top_100_steam_games():
    url = "https://steamspy.com/api.php?request=top100in2weeks"
    response = requests.get(url)
    data = response.json()
    return data

def get_30_day_avg_players(appid):
    url = f"https://steamcharts.com/app/{appid}/chart-data.json"
    try:
        response = requests.get(url)
        data = response.json()
        last_30_days = data[-30:]
        avg_players = round(sum(day[1] for day in last_30_days) / 30)
        return avg_players
    except:
        return None  

def getData():
   
    top_games = get_top_100_steam_games()
    output_data = []
    for appid, game in top_games.items():
        avg_players = get_30_day_avg_players(appid)
        output_data.append({
            "name": game["name"],
            "appid": appid,
            "30_day_avg_players": avg_players
        })
        time.sleep(1)
        print(f"Processed: {game['name']} (AppID: {appid})")
    with open("Data.json", "w") as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\nSuccess! Data saved to")

getData()