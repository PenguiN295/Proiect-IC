const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Helper function to load game data
function getGameData() {
  const rawData = fs.readFileSync(path.join(__dirname, 'data.json'));
  return JSON.parse(rawData);
}

// API Endpoints
app.get('/api/tags', (req, res) => {
  try {
    const data = getGameData();
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
  } catch (error) {
    console.error('Error in /api/tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/games/by-tag/:tag', (req, res) => {
  try {
    const data = getGameData();
    const filteredGames = data.games.filter(game => 
      game.tags.includes(req.params.tag)
    ).map(game => ({
      ...game,
      variation: ((game.current_month_avg - game.previous_month_avg) / 
                 game.previous_month_avg * 100).toFixed(1)
    }));

    res.json(filteredGames);
  } catch (error) {
    console.error('Error in /api/games/by-tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tags/list', (req, res) => {
  try {
    const data = getGameData();
    const tags = new Set();
    
    data.games.forEach(game => {
      game.tags.forEach(tag => tags.add(tag));
    });
    
    res.json(Array.from(tags));
  } catch (error) {
    console.error('Error in /api/tags/list:', error);
    res.status(500).json({ error: 'Failed to load tags' });
  }
});

app.get('/api/predict/:tag/:months', (req, res) => {
  const { tag, months } = req.params;
  const dummyPredictions = {
    "1": `Based on current trends, ${tag} may grow by 5-8% next month.`,
    "3": `${tag} is expected to maintain steady popularity over 3 months.`,
    "6": `Our models suggest ${tag} could see 15-20% growth in 6 months.`,
    "12": `Long-term projection for ${tag} shows potential market dominance.`
  };
  
  res.json({
    prediction: dummyPredictions[months] || `Prediction for ${tag} over ${months} months unavailable.`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});