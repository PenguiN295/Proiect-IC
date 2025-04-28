const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const axios = require('axios');
const { OpenAI } = require("openai");

const baseURL = "https://api.aimlapi.com/v1";
const apiKey = "90c223dd4ca443ba8265791854957a4c";

const api = new OpenAI({
  apiKey,
  baseURL,
});

const OPENAI_API_KEY = '90c223dd4ca443ba8265791854957a4c';
const OPENAI_URL = 'https://api.aimlapi.com/v1';

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

// Update your prediction endpoint
app.get('/api/predict/:tag/:months', async (req, res) => {
  const { tag, months } = req.params;
  
  try {
    // Get historical data
    const data = getGameData();
    const tagGames = data.games.filter(game => game.tags.includes(tag));
    
    // Prepare prompt for AI
    const systemPrompt = "You are a website that keeps track of the popularity of game tags by the number of players.";
    
    const prompt = `Predict the player count change for games with tag "${tag}" over ${months} months. 
    Historical data: ${JSON.stringify(tagGames)}. 
    Provide a concise prediction (2-3 sentences) with estimated percentage change.`;


    const completion = await api.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 256,
    });

    const prediction = completion.choices[0].message.content;
    res.json({ prediction });
        
  } catch (error) {
    console.error('AI prediction error:', error);
    res.status(500).json({ 
      error: "Failed to generate prediction",
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});