const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API Endpoints
app.get('/api/tags', (req, res) => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json')));
  const tagStats = {};

  data.games.forEach(game => {
    game.tags.forEach(tag => {
      if (!tagStats[tag]) {
        tagStats[tag] = {
          current_month_total: 0,
          previous_month_total: 0,
          game_count: 0
        };
      }
      tagStats[tag].current_month_total += game.current_month_avg;
      tagStats[tag].previous_month_total += game.previous_month_avg;
      tagStats[tag].game_count += 1;
    });
  });

  // Calculate variation for each tag
  const result = {};
  Object.keys(tagStats).forEach(tag => {
    const current = tagStats[tag].current_month_total;
    const previous = tagStats[tag].previous_month_total;
    result[tag] = {
      current_month_avg: Math.round(current / tagStats[tag].game_count),
      previous_month_avg: Math.round(previous / tagStats[tag].game_count),
      variation: ((current - previous) / previous * 100).toFixed(1)
    };
  });

  res.json(result);
});

app.get('/api/games/by-tag/:tag', (req, res) => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json')));
  const filteredGames = data.games.filter(game => 
    game.tags.includes(req.params.tag)
  ).map(game => ({
    ...game,
    variation: ((game.current_month_avg - game.previous_month_avg) / game.previous_month_avg * 100).toFixed(1)
  }));
  
  res.json(filteredGames);
});

app.listen(3000, () => console.log('Server running on port 3000'));