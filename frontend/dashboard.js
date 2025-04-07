let allTags = {};

document.addEventListener('DOMContentLoaded', async () => {
  allTags = await fetch('/api/tags').then(res => res.json());
  renderTagsTable(allTags);
  setupSearch();
  setupSorting();
});

function renderTagsTable(tags) {
  const tbody = document.querySelector('#tags-table tbody');
  tbody.innerHTML = Object.entries(tags)
    .map(([tag, stats]) => `
      <tr class="clickable-row" data-tag="${tag}">
        <td>${tag}</td>
        <td>${stats.current_month_avg.toLocaleString()}</td>
        <td>${stats.previous_month_avg.toLocaleString()}</td>
        <td class="${stats.variation >= 0 ? 'positive' : 'negative'}">
          ${stats.variation >= 0 ? '+' : ''}${stats.variation}%
        </td>
      </tr>
    `).join('');

  // Add click handlers
  document.querySelectorAll('.clickable-row').forEach(row => {
    row.addEventListener('click', () => {
      window.location.href = `tag.html?tag=${encodeURIComponent(row.getAttribute('data-tag'))}`;
    });
  });
}

function setupSearch() {
  document.getElementById('search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#tags-table tbody tr').forEach(row => {
      const tagName = row.querySelector('td:first-child').textContent.toLowerCase();
      row.style.display = tagName.includes(term) ? '' : 'none';
    });
  });
}

function setupSorting() {
  document.getElementById('sort').addEventListener('change', (e) => {
    const sortedTags = { ...allTags };
    const sortValue = e.target.value;
    
    const sortedEntries = Object.entries(sortedTags).sort((a, b) => {
      const [tagA, statsA] = a;
      const [tagB, statsB] = b;
      
      switch(sortValue) {
        case 'name-asc': return tagA.localeCompare(tagB);
        case 'name-desc': return tagB.localeCompare(tagA);
        case 'current-desc': return statsB.current_month_avg - statsA.current_month_avg;
        case 'current-asc': return statsA.current_month_avg - statsB.current_month_avg;
        case 'variation-desc': return parseFloat(statsB.variation) - parseFloat(statsA.variation);
        case 'variation-asc': return parseFloat(statsA.variation) - parseFloat(statsB.variation);
        default: return 0;
      }
    });
    
    const sortedTagsObj = Object.fromEntries(sortedEntries);
    renderTagsTable(sortedTagsObj);
  });
}