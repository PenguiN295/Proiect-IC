const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { OpenAI } = require("openai");
const path = require('path'); 
// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Games',
  password: process.env.DB_PASSWORD || 'Aeopbpb!2',
  port: process.env.DB_PORT || 5432,
});

// OpenAI configuration
const baseURL = "https://api.aimlapi.com/v1";
const apiKey = process.env.OPENAI_API_KEY || "90c223dd4ca443ba8265791854957a4c";

const api = new OpenAI({
  apiKey,
  baseURL,
});

// import { GoogleGenAI } from "@google/genai";
const {GoogleGenAI} = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: "AIzaSyDfUc3VZ9i-sdfV5hipaxHvki1CcITfUz8" });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Helper functions
async function getTagStats() {
  try {
    const query = `
      SELECT 
        t.tag,
        SUM(g.avg_players) AS current_month_total,
        COUNT(g.appid) AS game_count
      FROM 
        steam_game_stats g
      JOIN 
        tags t ON g.tag = t.tag
      WHERE 
        g.month_collected = (SELECT MAX(month_collected) FROM steam_game_stats)
      GROUP BY 
        t.tag;
    `;
    
    const previousMonthQuery = `
      SELECT 
        t.tag,
        SUM(g.avg_players) AS previous_month_total
      FROM 
        steam_game_stats g
      JOIN 
        tags t ON g.tag = t.tag
      WHERE 
        g.month_collected = (SELECT MAX(month_collected) FROM steam_game_stats WHERE month_collected < (SELECT MAX(month_collected) FROM steam_game_stats))
      GROUP BY 
        t.tag;
    `;

    const [currentMonthResult, previousMonthResult] = await Promise.all([
      pool.query(query),
      pool.query(previousMonthQuery)
    ]);

    // Combine results
    const tagStats = {};
    
    currentMonthResult.rows.forEach(row => {
      tagStats[row.tag] = {
        current_month_total: row.current_month_total,
        game_count: row.game_count,
        previous_month_total: 0
      };
    });

    previousMonthResult.rows.forEach(row => {
      if (tagStats[row.tag]) {
        tagStats[row.tag].previous_month_total = row.previous_month_total;
      }
    });

    return tagStats;
  } catch (error) {
    console.error('Error in getTagStats:', error);
    throw error;
  }
}

// API Endpoints
app.get('/api/tags', async (req, res) => {
  try {
    const tagStats = await getTagStats();
    
    const result = {};
    Object.keys(tagStats).forEach(tag => {
      const current = tagStats[tag].current_month_total;
      const previous = tagStats[tag].previous_month_total;
      result[tag] = {
        current_month_avg: current,
        previous_month_avg: previous,
        variation: previous > 0 ? ((current - previous) / previous * 100).toFixed(1) : 'N/A'
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error in /api/tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/games/by-tag/:tag', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        g.appid,
        g.name,
        g.avg_players AS current_month_avg,
        prev.avg_players AS previous_month_avg,
        g.tag
      FROM 
        steam_game_stats g
      LEFT JOIN 
        steam_game_stats prev ON g.appid = prev.appid 
        AND prev.month_collected = (SELECT MAX(month_collected) FROM steam_game_stats WHERE month_collected < (SELECT MAX(month_collected) FROM steam_game_stats))
      WHERE 
        g.month_collected = (SELECT MAX(month_collected) FROM steam_game_stats)
        AND g.tag = $1;
    `;
    
    const result = await pool.query(query, [req.params.tag]);
    
    const games = result.rows.map(game => ({
      appid: game.appid,
      name: game.name,
      current_month_avg: game.current_month_avg,
      previous_month_avg: game.previous_month_avg || 0,
      variation: game.previous_month_avg > 0 
        ? ((game.current_month_avg - game.previous_month_avg) / game.previous_month_avg * 100).toFixed(1)
        : 'N/A',
      tags: [game.tag] // Keeping the same structure as before
    }));

    res.json(games);
  } catch (error) {
    console.error('Error in /api/games/by-tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tags/list', async (req, res) => {
  try {
    const query = 'SELECT DISTINCT tag FROM tags;';
    const result = await pool.query(query);
    res.json(result.rows.map(row => row.tag));
  } catch (error) {
    console.error('Error in /api/tags/list:', error);
    res.status(500).json({ error: 'Failed to load tags' });
  }
});

app.get('/api/predict/:tag/:months/:theme', async (req, res) => {
  const { tag, months, theme } = req.params;
  
  try {
    // Verify the tag exists first
    const tagCheck = await pool.query('SELECT 1 FROM tags WHERE tag = $1 LIMIT 1', [tag]);
    if (tagCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Get historical data from database
    const query = `
      SELECT 
        g.appid,
        g.name,
        g.avg_players,
        g.month_collected,
        EXTRACT(MONTH FROM g.month_collected) AS month,
        EXTRACT(YEAR FROM g.month_collected) AS year
      FROM 
        steam_game_stats g
      WHERE 
        g.tag = $1
      ORDER BY 
        g.month_collected DESC
      LIMIT 100;
    `;
    
    const result = await pool.query(query, [tag]);
    const tagGames = result.rows;

    // Prepare data for AI
    const historicalData = tagGames.map(game => ({
      month: game.month,
      avg_players: game.avg_players,
    }));
     const systemPrompt = `You are a data analyst specializing in gaming trends. Analyze the player count data and provide a prediction for the specified tag.`;
    
    // const prompt = `Predict the player count change for games with tag "${tag}" over the next ${months} months. 
    // Historical data (last ${tagGames.length} records): ${JSON.stringify(historicalData)}.
    
    // Provide:
    // 1. A concise prediction (2-3 sentences)
    // 2. Estimated percentage change
    // 3. Key factors influencing this trend
    // 4. Confidence level (low/medium/high)`;
    // console.log(theme);
    const prompt = `I would like to make a game to kickstart my indie game dev career.  
      This is the data I have accumulated (last ${tagGames.length} records):

      \`\`\`json
      ${JSON.stringify(historicalData, null, 2)}
      \`\`\`
      Don't focus too much on the months and more on the games themselves.
      I'm interested in making a game with this tag "${tag}".
      I would like the game's main theme to be "${theme}". Keep in mind i would like to finish the game in ${months} months.  
      Each record shows monthly average player counts for games with this tag.
      When looking at the games with this tag, what things make them special (referring to art style and other minor elements, also say the name of the game you are talking about)?  
      What do you suggest I should consider when creating my game, given my current circumstances? If you have an idea for a game with these constraints don't hesitate to give it
      at the end.

      Please provide:
      1. A concise prediction (3-4 sentences)  
      2. Key factors explaining the popularity of this tag or its games
      3. How do those factors enchance the theme of the game i'm making  

      Also don't mention which point you are providing( i mean 1 or 2). Make it a continuous explanation thanks.
      `;


     //console.log("Sending prompt:\n", prompt);
    // const completion = await api.chat.completions.create({
    //   model: "gpt-4o",
    //   messages: [
    //     {
    //       role: "system",
    //       content: systemPrompt,
    //     },
    //     {
    //       role: "user",
    //       content: prompt,
    //     },
    //   ],
    //   temperature: 0.7,
    //   max_tokens: 350,
    // });
    const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

    // const prediction = completion.choices[0].message.content;
    const prediction = response.text;
    res.json({ 
      prediction,
      tag,
      months,
      lastUpdated: new Date().toISOString()
    });
        
  } catch (error) {
    console.error('AI prediction error:', error);
    res.status(500).json({ 
      error: "Failed to generate prediction",
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});