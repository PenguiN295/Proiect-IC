let allTags = {};

async function fetchTags() {
  const response = await fetch('http://localhost:3000/api/tags');
  if (!response.ok) throw new Error('Failed to fetch tags');
  return await response.json();
}

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
  document.getElementById('sort').addEventListener('change', async (e) => {
    const tags = await fetchTags();
    const sortValue = e.target.value;
    
    const sortedEntries = Object.entries(tags).sort(([tagA, statsA], [tagB, statsB]) => {
      const variationA = parseFloat(statsA.variation);
      const variationB = parseFloat(statsB.variation);
      
      switch(sortValue) {
        case 'name-asc': return tagA.localeCompare(tagB);
        case 'name-desc': return tagB.localeCompare(tagA);
        case 'current-desc': return statsB.current_month_avg - statsA.current_month_avg;
        case 'current-asc': return statsA.current_month_avg - statsB.current_month_avg;
        case 'variation-desc': return variationB - variationA;
        case 'variation-asc': return variationA - variationB;
        default: return 0;
      }
    });
    
    renderTagsTable(Object.fromEntries(sortedEntries));
  });
}

async function init() {
  try {
    allTags = await fetchTags();
    renderTagsTable(allTags);
    setupSearch();
    setupSorting();
  } catch (error) {
    console.error('Initialization error:', error);
    alert('Failed to load data. Please refresh the page.');
  }
}

init();