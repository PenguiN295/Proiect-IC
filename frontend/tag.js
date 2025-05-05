document.addEventListener('DOMContentLoaded', async () => {
  // Get the tag from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tag = urlParams.get('tag');
  
  // Redirect if no tag specified
  if (!tag) {
    window.location.href = 'index.html';
    return;
  }

  // Set page title
  document.getElementById('tag-title').textContent = `Tag: ${tag}`;
  
  try {
    // Show loading state
    showLoadingState();
    
    // Fetch games with this tag
    const games = await fetchGamesByTag(tag);
    
    // Render the data
    renderGamesTable(games, tag);
    updateTagStats(games);
    setupSearch(games);
    setupSorting(games);
    
  } catch (error) {
    console.error('Error loading games:', error);
    showErrorState(error);
  }
});

/**
 * Fetches games by tag from the API
 */
async function fetchGamesByTag(tag) {
  const response = await fetch(`http://localhost:3000/api/games/by-tag/${tag}`);
  
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
  
  const games = await response.json();
  
  // Ensure games have the required properties
  return games.map(game => ({
    ...game,
    current_month_avg: game.current_month_avg || 0,
    previous_month_avg: game.previous_month_avg || 0,
    variation: calculateVariation(game.current_month_avg, game.previous_month_avg)
  }));
}

/**
 * Calculates the percentage variation
 */
function calculateVariation(current, previous) {
  if (previous === 0) return '0.0'; // Avoid division by zero
  return ((current - previous) / previous * 100).toFixed(1);
}

/**
 * Shows loading spinner in the table
 */
function showLoadingState() {
  const tbody = document.querySelector('#games-table tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="loading-state">
        <div class="spinner"></div>
        <p>Loading games with this tag...</p>
      </td>
    </tr>
  `;
}

/**
 * Shows error state in the table
 */
function showErrorState(error) {
  const tbody = document.querySelector('#games-table tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Failed to load games</h3>
        <p>${error.message || 'Unknown error occurred'}</p>
        <button onclick="window.location.reload()" class="btn btn-primary">
          <i class="fas fa-sync-alt"></i> Try Again
        </button>
      </td>
    </tr>
  `;
}

/**
 * Renders the games table
 */
function renderGamesTable(games, currentTag) {
  const tbody = document.querySelector('#games-table tbody');
  
  if (!games || games.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <i class="fas fa-info-circle"></i>
          <p>No games found with this tag</p>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = games.map(game => `
    <tr>
      <td class="game-name">${game.name}</td>
      <td>${game.current_month_avg.toLocaleString()}</td>
      <td>${game.previous_month_avg.toLocaleString()}</td>
      <td class="${game.variation >= 0 ? 'positive' : 'negative'}">
        ${game.variation >= 0 ? '+' : ''}${game.variation}%
      </td>
      <td>
        <div class="tag-list">
          ${game.tags
            .filter(t => t !== currentTag)
            .map(tag => `<span class="tag-item">${tag}</span>`)
            .join('') || '<span class="no-tags">No other tags</span>'}
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Updates the tag statistics in the header
 */
function updateTagStats(games) {
  const currentTotal = games.reduce((sum, game) => sum + game.current_month_avg, 0);
  const previousTotal = games.reduce((sum, game) => sum + game.previous_month_avg, 0);
  const variation = calculateVariation(currentTotal, previousTotal);
  
  document.getElementById('current-total').innerHTML = `
    <i class="fas fa-users"></i> ${currentTotal.toLocaleString()} current players
  `;
  
  document.getElementById('variation').innerHTML = `
    <i class="fas fa-chart-line"></i> 
    <span class="${variation >= 0 ? 'positive' : 'negative'}">
      ${variation >= 0 ? '+' : ''}${variation}%
    </span> change
  `;
}

/**
 * Sets up the search functionality
 */
function setupSearch(games) {
  const searchInput = document.getElementById('search');
  
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    
    document.querySelectorAll('#games-table tbody tr').forEach(row => {
      if (row.classList.contains('loading-state')) return;
      if (row.classList.contains('error-state')) return;
      if (row.classList.contains('empty-state')) return;
      
      const gameName = row.querySelector('.game-name').textContent.toLowerCase();
      row.style.display = gameName.includes(term) ? '' : 'none';
    });
  });
}

/**
 * Sets up the sorting functionality
 */
function setupSorting(games) {
  const sortSelect = document.getElementById('sort');
  let sortedGames = [...games];
  
  sortSelect.addEventListener('change', (e) => {
    const sortValue = e.target.value;
    
    sortedGames.sort((a, b) => {
      const variationA = parseFloat(a.variation);
      const variationB = parseFloat(b.variation);

      switch(sortValue) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'current-desc': return b.current_month_avg - a.current_month_avg;
        case 'current-asc': return a.current_month_avg - b.current_month_avg;
        case 'variation-desc': return variationB - variationA;
        case 'variation-asc': return variationA - variationB;
        default: return 0;
      }
    });
    
    renderGamesTable(sortedGames, urlParams.get('tag'));
  });
}