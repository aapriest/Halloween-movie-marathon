/**
 * HallowWatch 31 - Core Web Application Logic
 * Interactivity, Filtering, Calendar, Storage Persistence, and Stats Dashboard
 */

// Local Storage Keys
const STORAGE_KEYS = {
  WATCHED: 'hallowwatch_watched_ids',
  RATINGS: 'hallowwatch_movie_ratings',
  NOTES: 'hallowwatch_movie_notes'
};

// Global App State
const state = {
  activeTheme: 'all',
  searchQuery: '',
  statusFilter: 'all',
  sortMode: 'date-asc',
  activeView: 'grid', // 'grid' | 'calendar' | 'timeline'
  watchedIds: new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHED) || '[]')),
  ratings: JSON.parse(localStorage.getItem(STORAGE_KEYS.RATINGS) || '{}'),
  notes: JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '{}'),
  currentModalMovieId: null
};

// Save state helpers
function saveWatched() {
  localStorage.setItem(STORAGE_KEYS.WATCHED, JSON.stringify(Array.from(state.watchedIds)));
}

function saveRatings() {
  localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(state.ratings));
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(state.notes));
}

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initAtmosphere();
  initThemeRibbon();
  initEventListeners();
  renderHeroSpotlight();
  renderAllViews();
  updateStats();
});

// --------------------------------------------------------------------------
// Atmospheric Floating Embers Canvas Effect
// --------------------------------------------------------------------------
function initAtmosphere() {
  const canvas = document.getElementById('atmosphere-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = Array.from({ length: 40 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2.5 + 0.8,
    speedY: - (Math.random() * 0.45 + 0.15),
    speedX: (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.6 + 0.2,
    color: Math.random() > 0.4 ? '249, 115, 22' : '168, 85, 247' // orange or purple
  }));

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// --------------------------------------------------------------------------
// Theme Ribbon Setup
// --------------------------------------------------------------------------
function initThemeRibbon() {
  const ribbon = document.getElementById('theme-ribbon');
  if (!ribbon) return;

  ribbon.innerHTML = THEMES.map(theme => {
    const count = theme.key === 'all' 
      ? HALLOWEEN_MOVIES.length 
      : HALLOWEEN_MOVIES.filter(m => m.themeKey === theme.key).length;

    return `
      <button class="theme-tab ${state.activeTheme === theme.key ? 'active' : ''}" data-key="${theme.key}">
        <span>${theme.icon}</span>
        <span>${theme.label}</span>
        <span style="opacity: 0.6; font-size: 0.75rem;">(${count})</span>
      </button>
    `;
  }).join('');

  ribbon.querySelectorAll('.theme-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      ribbon.querySelectorAll('.theme-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeTheme = tab.getAttribute('data-key');
      renderAllViews();
    });
  });
}

// --------------------------------------------------------------------------
// Event Listeners (Search, Filter, Sort, View Modes, Modal)
// --------------------------------------------------------------------------
function initEventListeners() {
  // Search Bar
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderAllViews();
    });
  }

  // Status Filter
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      state.statusFilter = e.target.value;
      renderAllViews();
    });
  }

  // Sort Order
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortMode = e.target.value;
      renderAllViews();
    });
  }

  // View Mode Switcher
  const viewBtns = document.querySelectorAll('.view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeView = btn.getAttribute('data-view');
      switchViewMode(state.activeView);
    });
  });

  // Modal Close Events
  const modalBackdrop = document.getElementById('movie-modal');
  const modalCloseBtn = document.getElementById('modal-close');
  if (modalBackdrop && modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) {
        closeModal();
      }
    });
  }

  // Star Rating Click Handling in Modal
  const starsContainer = document.getElementById('modal-stars');
  if (starsContainer) {
    starsContainer.querySelectorAll('.star-btn').forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.getAttribute('data-star'), 10);
        if (state.currentModalMovieId) {
          state.ratings[state.currentModalMovieId] = rating;
          saveRatings();
          updateModalStars(rating);
          renderAllViews();
          showToast(`Rated ${rating} Star${rating > 1 ? 's' : ''}! ★`);
        }
      });
    });
  }

  // Notes Auto-save
  const notesTextarea = document.getElementById('modal-notes');
  if (notesTextarea) {
    notesTextarea.addEventListener('input', (e) => {
      if (state.currentModalMovieId) {
        state.notes[state.currentModalMovieId] = e.target.value;
        saveNotes();
      }
    });
  }
}

// --------------------------------------------------------------------------
// Filter & Sort Logic
// --------------------------------------------------------------------------
function getFilteredMovies() {
  return HALLOWEEN_MOVIES.filter(movie => {
    // Theme filter
    if (state.activeTheme !== 'all' && movie.themeKey !== state.activeTheme) {
      return false;
    }

    // Status filter
    const isWatched = state.watchedIds.has(movie.id);
    if (state.statusFilter === 'watched' && !isWatched) return false;
    if (state.statusFilter === 'unwatched' && isWatched) return false;
    if (state.statusFilter === 'first' && movie.status !== 'First Watch') return false;
    if (state.statusFilter === 'rewatch' && movie.status !== 'Rewatch') return false;

    // Search query
    if (state.searchQuery) {
      const matchTitle = movie.title.toLowerCase().includes(state.searchQuery);
      const matchDirector = movie.director.toLowerCase().includes(state.searchQuery);
      const matchNotes = movie.notes.toLowerCase().includes(state.searchQuery);
      const matchYear = movie.year.includes(state.searchQuery);
      const matchSubgenre = movie.subgenre.toLowerCase().includes(state.searchQuery);
      if (!matchTitle && !matchDirector && !matchNotes && !matchYear && !matchSubgenre) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    switch (state.sortMode) {
      case 'date-asc':
        return a.dayNumber - b.dayNumber;
      case 'date-desc':
        return b.dayNumber - a.dayNumber;
      case 'runtime-asc':
        return a.runtime - b.runtime;
      case 'runtime-desc':
        return b.runtime - a.runtime;
      case 'year-desc':
        return parseInt(b.year) - parseInt(a.year);
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return a.dayNumber - b.dayNumber;
    }
  });
}

// --------------------------------------------------------------------------
// View Rendering & Switching
// --------------------------------------------------------------------------
function switchViewMode(view) {
  const gridContainer = document.getElementById('grid-view');
  const calendarContainer = document.getElementById('calendar-view');
  const timelineContainer = document.getElementById('timeline-view');

  if (gridContainer) gridContainer.style.display = view === 'grid' ? 'grid' : 'none';
  if (calendarContainer) calendarContainer.style.display = view === 'calendar' ? 'block' : 'none';
  if (timelineContainer) timelineContainer.style.display = view === 'timeline' ? 'block' : 'none';
}

function renderAllViews() {
  renderMoviesGrid();
  renderCalendarView();
  renderTimelineView();
}

// --------------------------------------------------------------------------
// 1. GRID VIEW RENDERER
// --------------------------------------------------------------------------
function renderMoviesGrid() {
  const container = document.getElementById('grid-view');
  if (!container) return;

  const movies = getFilteredMovies();
  if (movies.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 12px;">👻</div>
        <h3>No spooky films found</h3>
        <p>Try broadening your search or resetting active filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = movies.map(movie => {
    const isWatched = state.watchedIds.has(movie.id);
    const rating = state.ratings[movie.id] || 0;
    const ratingStars = rating > 0 ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : '';

    return `
      <div class="movie-card ${isWatched ? 'is-watched' : ''}" 
           style="--card-accent: ${movie.accentColor};"
           onclick="openMovieModal(${movie.id})">
        <div class="movie-card-header">
          <div class="day-badge">
            <span class="day-badge-date">${movie.date}</span>
            <span class="day-badge-dow">${movie.dayOfWeek}</span>
          </div>
          <button class="watch-checkbox-btn ${isWatched ? 'checked' : ''}" 
                  title="${isWatched ? 'Mark as unwatched' : 'Mark as watched'}"
                  onclick="event.stopPropagation(); toggleWatched(${movie.id})">
            ${isWatched ? '✓' : '○'}
          </button>
        </div>

        <div class="movie-card-body">
          <div class="movie-icon-badge">${movie.icon}</div>
          <h3 class="movie-title">${movie.title}</h3>
          
          <div class="movie-tags-row">
            <span class="tag-badge ${movie.status === 'First Watch' ? 'tag-first-watch' : 'tag-rewatch'}">
              ${movie.status}
            </span>
            <span class="tag-badge tag-runtime">⏱ ${movie.runtime}m</span>
            <span class="tag-badge tag-runtime">${movie.year}</span>
          </div>

          <p class="movie-rationale">${movie.notes}</p>
        </div>

        <div class="movie-card-footer">
          <span>🎬 ${movie.director}</span>
          ${ratingStars ? `<span class="user-rating-display">${ratingStars}</span>` : `<span style="opacity: 0.5;">#${movie.dayNumber} of 31</span>`}
        </div>
      </div>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// 2. CALENDAR VIEW RENDERER (October 31 Days)
// --------------------------------------------------------------------------
function renderCalendarView() {
  const container = document.getElementById('calendar-grid');
  if (!container) return;

  // In 2026, Oct 1 is Thursday. Let's make standard Sunday - Saturday headers:
  // Sun(0), Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6)
  // Oct 1 is Thursday -> 4 empty padding cells before Oct 1!
  const leadingBlanks = 4; 
  let html = '';

  for (let i = 0; i < leadingBlanks; i++) {
    html += `<div class="calendar-cell" style="opacity: 0.15; cursor: default; background: rgba(0,0,0,0.2);">
      <div class="cal-dow" style="padding: 10px;">Sep</div>
    </div>`;
  }

  HALLOWEEN_MOVIES.forEach(movie => {
    const isWatched = state.watchedIds.has(movie.id);
    const matchesFilter = getFilteredMovies().some(m => m.id === movie.id);
    const opacityStyle = matchesFilter ? '' : 'opacity: 0.3; filter: grayscale(80%);';

    html += `
      <div class="calendar-cell ${isWatched ? 'is-watched' : ''}" 
           style="${opacityStyle}"
           onclick="openMovieModal(${movie.id})">
        <div class="calendar-cell-top">
          <span class="cal-day-num">${movie.dayNumber}</span>
          <span class="cal-dow">${movie.dayOfWeek}</span>
          <span onclick="event.stopPropagation(); toggleWatched(${movie.id});" style="cursor: pointer; font-size: 0.95rem;">
            ${isWatched ? '💚' : '🤍'}
          </span>
        </div>
        <div class="cal-title">${movie.icon} ${movie.title}</div>
        <div class="cal-meta">
          <span>${movie.runtime}m</span>
          <span style="font-size: 0.68rem; color: ${movie.status === 'First Watch' ? '#34d399' : '#fb923c'};">${movie.status}</span>
        </div>
      </div>
    `;
  });

  // Trailing blanks to complete 35 cells (5 full weeks of 7)
  const trailingBlanks = (7 - ((leadingBlanks + 31) % 7)) % 7;
  for (let i = 0; i < trailingBlanks; i++) {
    html += `<div class="calendar-cell" style="opacity: 0.15; cursor: default; background: rgba(0,0,0,0.2);">
      <div class="cal-dow" style="padding: 10px;">Nov</div>
    </div>`;
  }

  container.innerHTML = html;
}

// --------------------------------------------------------------------------
// 3. TIMELINE / CHECKLIST VIEW RENDERER
// --------------------------------------------------------------------------
function renderTimelineView() {
  const container = document.getElementById('timeline-list');
  if (!container) return;

  const movies = getFilteredMovies();
  container.innerHTML = movies.map(movie => {
    const isWatched = state.watchedIds.has(movie.id);
    return `
      <div class="timeline-row ${isWatched ? 'is-watched' : ''}" onclick="openMovieModal(${movie.id})">
        <button class="watch-checkbox-btn ${isWatched ? 'checked' : ''}" 
                onclick="event.stopPropagation(); toggleWatched(${movie.id})">
          ${isWatched ? '✓' : '○'}
        </button>
        <span style="font-weight: 700; color: var(--pumpkin-400); font-size: 0.85rem;">${movie.date}</span>
        <div class="timeline-title-group">
          <span class="timeline-title">${movie.icon} ${movie.title} (${movie.year})</span>
          <span class="timeline-sub">${movie.notes}</span>
        </div>
        <span class="timeline-runtime" style="color: var(--text-muted); font-size: 0.85rem;">⏱ ${movie.runtime} min</span>
        <span class="timeline-status" style="font-size: 0.78rem; color: ${movie.status === 'First Watch' ? '#34d399' : '#fb923c'};">${movie.status}</span>
        <span style="color: var(--text-dim); font-size: 0.85rem;">➔</span>
      </div>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// TONIGHT'S FEATURE HERO CALCULATOR
// --------------------------------------------------------------------------
function renderHeroSpotlight() {
  const heroContainer = document.getElementById('hero-spotlight');
  if (!heroContainer) return;

  // Detect current date or default to the next unwatched movie
  const today = new Date();
  const currentMonth = today.getMonth(); // 9 is October (0-indexed)
  const currentDay = today.getDate();

  let featuredMovie = null;

  if (currentMonth === 9 && currentDay >= 1 && currentDay <= 31) {
    featuredMovie = HALLOWEEN_MOVIES.find(m => m.dayNumber === currentDay);
  }

  // Fallback: pick the first unwatched movie, or Oct 1
  if (!featuredMovie) {
    featuredMovie = HALLOWEEN_MOVIES.find(m => !state.watchedIds.has(m.id)) || HALLOWEEN_MOVIES[0];
  }

  const isWatched = state.watchedIds.has(featuredMovie.id);

  heroContainer.innerHTML = `
    <div class="hero-badge-row">
      <span class="spotlight-pill">Tonight's Feature</span>
      <span class="date-pill">🎃 ${featuredMovie.date} • ${featuredMovie.dayOfWeek}</span>
      <span class="date-pill" style="border-color: ${featuredMovie.accentColor}; color: ${featuredMovie.accentColor};">
        ${featuredMovie.themeTitle}
      </span>
    </div>

    <div class="hero-content">
      <div>
        <h2 class="hero-title">${featuredMovie.icon} ${featuredMovie.title} (${featuredMovie.year})</h2>
        <div class="hero-meta">
          <span class="hero-meta-item">⏱ <strong>${featuredMovie.runtime} mins</strong></span>
          <span>•</span>
          <span class="hero-meta-item">🎬 Directed by <strong>${featuredMovie.director}</strong></span>
          <span>•</span>
          <span class="hero-meta-item" style="color: ${featuredMovie.status === 'First Watch' ? '#34d399' : '#fb923c'};">
            <strong>${featuredMovie.status}</strong>
          </span>
          <span>•</span>
          <span class="hero-meta-item">${featuredMovie.subgenre}</span>
        </div>
        <p class="hero-quote">"${featuredMovie.notes}"</p>
        <div class="hero-actions">
          <button class="btn ${isWatched ? 'btn-watched' : 'btn-primary'}" onclick="toggleWatched(${featuredMovie.id})">
            ${isWatched ? '✓ Watched Tonight' : 'Mark as Watched'}
          </button>
          <button class="btn btn-secondary" onclick="openMovieModal(${featuredMovie.id})">
            View Details & Notes
          </button>
          <a href="https://www.google.com/search?q=where+to+watch+${encodeURIComponent(featuredMovie.title)}+${featuredMovie.year}+movie" 
             target="_blank" rel="noopener" class="btn btn-secondary">
            Find Where to Stream ↗
          </a>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// STATS DASHBOARD UPDATE
// --------------------------------------------------------------------------
function updateStats() {
  const totalMovies = HALLOWEEN_MOVIES.length;
  const watchedCount = state.watchedIds.size;
  const totalMins = HALLOWEEN_MOVIES.reduce((acc, m) => acc + m.runtime, 0);
  
  const watchedMins = HALLOWEEN_MOVIES
    .filter(m => state.watchedIds.has(m.id))
    .reduce((acc, m) => acc + m.runtime, 0);

  const remainingMins = totalMins - watchedMins;
  const percentComplete = Math.round((watchedCount / totalMovies) * 100);

  const firstWatchesDone = HALLOWEEN_MOVIES.filter(m => state.watchedIds.has(m.id) && m.status === 'First Watch').length;
  const rewatchesDone = HALLOWEEN_MOVIES.filter(m => state.watchedIds.has(m.id) && m.status === 'Rewatch').length;

  document.getElementById('stat-watched-count').textContent = `${watchedCount} / ${totalMovies}`;
  document.getElementById('stat-runtime-watched').textContent = `${Math.floor(watchedMins / 60)}h ${watchedMins % 60}m`;
  document.getElementById('stat-runtime-remaining').textContent = `${Math.floor(remainingMins / 60)}h ${remainingMins % 60}m`;
  document.getElementById('stat-breakdown').textContent = `${firstWatchesDone} New / ${rewatchesDone} Rewatch`;

  const progressBar = document.getElementById('marathon-progress-bar');
  const progressText = document.getElementById('progress-percentage');
  if (progressBar) progressBar.style.width = `${percentComplete}%`;
  if (progressText) progressText.textContent = `${percentComplete}% Completed`;
}

// --------------------------------------------------------------------------
// WATCH STATUS TOGGLE
// --------------------------------------------------------------------------
function toggleWatched(id) {
  const movie = HALLOWEEN_MOVIES.find(m => m.id === id);
  if (!movie) return;

  if (state.watchedIds.has(id)) {
    state.watchedIds.delete(id);
    showToast(`Unmarked "${movie.title}"`);
  } else {
    state.watchedIds.add(id);
    showToast(`🎃 Watched "${movie.title}"! (+${movie.runtime} mins)`);
  }

  saveWatched();
  updateStats();
  renderHeroSpotlight();
  renderAllViews();

  // If currently opened in modal, update modal button
  const modalToggleBtn = document.getElementById('modal-watch-toggle');
  if (modalToggleBtn && state.currentModalMovieId === id) {
    const isW = state.watchedIds.has(id);
    modalToggleBtn.className = `btn ${isW ? 'btn-watched' : 'btn-primary'}`;
    modalToggleBtn.textContent = isW ? '✓ Watched' : 'Mark as Watched';
  }
}

// --------------------------------------------------------------------------
// MODAL DIALOG MANAGEMENT
// --------------------------------------------------------------------------
function openMovieModal(id) {
  const movie = HALLOWEEN_MOVIES.find(m => m.id === id);
  if (!movie) return;

  state.currentModalMovieId = id;
  const modal = document.getElementById('movie-modal');

  document.getElementById('modal-day-badge').textContent = `Day ${movie.dayNumber} • ${movie.date} (${movie.dayOfWeek})`;
  document.getElementById('modal-theme-badge').textContent = movie.themeTitle;
  document.getElementById('modal-theme-badge').style.borderColor = movie.accentColor;

  document.getElementById('modal-title').textContent = `${movie.icon} ${movie.title} (${movie.year})`;
  document.getElementById('modal-director').textContent = `Directed by ${movie.director} • ${movie.subgenre}`;
  document.getElementById('modal-runtime').textContent = `⏱ Runtime: ${movie.runtime} minutes`;
  document.getElementById('modal-status-tag').textContent = movie.status;
  document.getElementById('modal-status-tag').className = `tag-badge ${movie.status === 'First Watch' ? 'tag-first-watch' : 'tag-rewatch'}`;
  
  document.getElementById('modal-rationale').textContent = movie.notes;
  document.getElementById('modal-backup').textContent = movie.backupAlternate;

  // Modal watch toggle button
  const isWatched = state.watchedIds.has(id);
  const modalToggleBtn = document.getElementById('modal-watch-toggle');
  modalToggleBtn.className = `btn ${isWatched ? 'btn-watched' : 'btn-primary'}`;
  modalToggleBtn.textContent = isWatched ? '✓ Watched' : 'Mark as Watched';
  modalToggleBtn.onclick = () => toggleWatched(id);

  // Streaming link
  const streamLink = document.getElementById('modal-stream-link');
  streamLink.href = `https://www.google.com/search?q=where+to+watch+${encodeURIComponent(movie.title)}+${movie.year}+movie`;

  // Ratings
  const currentRating = state.ratings[id] || 0;
  updateModalStars(currentRating);

  // Notes
  const notesTextarea = document.getElementById('modal-notes');
  notesTextarea.value = state.notes[id] || '';

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function updateModalStars(rating) {
  const stars = document.querySelectorAll('#modal-stars .star-btn');
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
}

function closeModal() {
  const modal = document.getElementById('movie-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  state.currentModalMovieId = null;
}

// --------------------------------------------------------------------------
// TOAST NOTIFICATIONS
// --------------------------------------------------------------------------
function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>🕯️</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}
