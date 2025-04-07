let currentGames = [];

document.addEventListener('DOMContentLoaded', async () => {
  const tag = new URLSearchParams(window.location.search).get('tag');
  if (!tag) window.location.href = 'index.html';

  document.getElementById('tag-title').textContent = `Games with tag: ${tag}`;
  
  currentGames = await fetch(`/api/games/by-tag/${tag}`).then(res => res.json());
  renderGamesTable(currentGames);
  setupSearch();
  setupSorting();
});

function renderGamesTable(games) {
  const tbody = document.querySelector('#games-table tbody');
  tbody.innerHTML = games.map(game => `
    <tr>
      <td>${game.name}</td>
      <td>${game.current_month_avg.toLocaleString()}</td>
      <td>${game.previous_month_avg.toLocaleString()}</td>
      <td class="${game.variation >= 0 ? 'positive' : 'negative'}">
        ${game.variation >= 0 ? '+' : ''}${game.variation}%
      </td>
    </tr>
  `).join('');
}

function setupSearch() {
  document.getElementById('search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#games-table tbody tr').forEach(row => {
      const gameName = row.querySelector('td:first-child').textContent.toLowerCase();
      row.style.display = gameName.includes(term) ? '' : 'none';
    });
  });
}

function setupSorting() {
  document.getElementById('sort').addEventListener('change', (e) => {
    const sortedGames = [...currentGames];
    const sortValue = e.target.value;
    
    sortedGames.sort((a, b) => {
      switch(sortValue) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'current-desc': return b.current_month_avg - a.current_month_avg;
        case 'current-asc': return a.current_month_avg - b.current_month_avg;
        case 'variation-desc': return parseFloat(b.variation) - parseFloat(a.variation);
        case 'variation-asc': return parseFloat(a.variation) - parseFloat(b.variation);
        default: return 0;
      }
    });
    
    renderGamesTable(sortedGames);
  });
}