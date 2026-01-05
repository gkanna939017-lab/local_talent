const workersDiv = document.getElementById("workers");
const searchInput = document.getElementById("search");

let workers = [];
const PAGE_SIZE = 6; // number of items to show before "Load more"
let currentLimit = PAGE_SIZE;

// Reusable loader so other pages (or forms) can refresh the list
async function loadWorkers() {
  try {
    const res = await fetch("/api/workers");
    const data = await res.json();
    workers = data;
    currentLimit = PAGE_SIZE; // reset paging on reload
    render(workers);
  } catch (err) {
    workersDiv.innerHTML = "<p>Error loading professionals</p>";
  }
}

// Initial load (fetch data but DO NOT render full list until user searches)
loadWorkers();

// Expose for other scripts
window.loadWorkers = loadWorkers;

// Search + suggestions behavior
const suggestionsEl = document.getElementById('suggestions');
let debounceTimer = null;

function hideSuggestions() {
  suggestionsEl.style.display = 'none';
  suggestionsEl.innerHTML = '';
}

function showSuggestions(items) {
  if (!items || items.length === 0) return hideSuggestions();
  suggestionsEl.innerHTML = items.map(it => `<div class="suggestion-item">${it}</div>`).join('');
  suggestionsEl.style.display = 'block';

  // attach click handlers
  Array.from(suggestionsEl.children).forEach((child, idx) => {
    child.addEventListener('click', () => {
      searchInput.value = items[idx];
      hideSuggestions();
      doSearch(items[idx]);
    });
  });
}

async function doSearch(q) {
  if (!q || q.trim() === '') {
    document.getElementById('workers').innerHTML = '';
    hideSuggestions();
    return;
  }

  try {
    currentLimit = PAGE_SIZE; // reset pagination for new query
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    hideSuggestions();
    render(data);
    // scroll to results for better UX
    document.getElementById('workers').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    document.getElementById('workers').innerHTML = '<p>Error searching professionals</p>';
  }
}

searchInput.addEventListener('input', (ev) => {
  const q = searchInput.value.trim();
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    if (!q) {
      // clear UI when empty
      hideSuggestions();
      document.getElementById('workers').innerHTML = '';
      return;
    }

    // Offer local suggestions (skills & names) first
    const localMatches = new Set();
    for (const w of workers) {
      if (w.skill && w.skill.toLowerCase().includes(q.toLowerCase())) localMatches.add(w.skill);
      if (w.name && w.name.toLowerCase().includes(q.toLowerCase())) localMatches.add(w.name);
      if (localMatches.size >= 6) break;
    }

    const suggestions = Array.from(localMatches);
    showSuggestions(suggestions);

    // If user typed 2+ chars, query server for better results
    if (q.length >= 2) {
      doSearch(q);
    }
  }, 200);
});

// hide suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!document.getElementById('search').contains(e.target) && !suggestionsEl.contains(e.target)) {
    hideSuggestions();
  }
});

function render(data) {
  workersDiv.innerHTML = "";

  if (!data || data.length === 0) {
    workersDiv.innerHTML = "<p>No professionals found</p>";
    document.getElementById('load_more_btn')?.classList.add('hidden');
    return;
  }

  // Only render up to currentLimit to reduce initial scroll length
  const toRender = data.slice(0, currentLimit);

  toRender.forEach(w => {
    const card = document.createElement("div");
    card.className = "worker-card";
    if (window.newlyAddedId && w.id === window.newlyAddedId) card.classList.add('highlight');

    card.innerHTML = `
      <h3>${w.name} <span class="badge">${w.skill}</span></h3>
      <p>📍 ${w.city}</p>
      <p>⭐ Experience: ${w.experience ? w.experience + ' years' : w.exp || ''}</p>
      <div class="worker-actions">
        <a class="call" href="tel:${w.phone}">📞 Call Now</a>
        <a class="book" href="/booking.html?worker_id=${w.id}">📅 Book</a>
      </div>
    `;

    workersDiv.appendChild(card);
  });

  // Toggle Load More button
  const loadBtn = document.getElementById('load_more_btn');
  if (!loadBtn) return;
  if (data.length > currentLimit) {
    loadBtn.classList.remove('hidden');
    loadBtn.textContent = `Load more (${Math.min(currentLimit + PAGE_SIZE, data.length)} of ${data.length})`;
  } else {
    loadBtn.classList.add('hidden');
  }
}

// If page was opened with a query (?q=plumber), prefill the search and run it immediately
(function initFromQuery(){
  try {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q && q.trim() !== '') {
      searchInput.value = q;
      // perform search (server-side search ensures exact filtering by skill)
      doSearch(q);
      // optionally focus the results
      document.getElementById('workers').scrollIntoView({ behavior: 'smooth' });
    }
  } catch (e) {
    // ignore
  }
})();
