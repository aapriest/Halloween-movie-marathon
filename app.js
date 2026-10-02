/**
 * HallowWatch 31 - Core Web Application Logic
 * Original Home Page Layout + Enhanced Expanded Cards/Modals
 */

// Local Storage Keys
const STORAGE_KEYS = {
  WATCHED: 'hallowwatch_watched_ids',     // Kept private to each device
  REVIEWS: 'hallowwatch_friend_reviews',   // Shared friend reviews & ratings
  USER_NAME: 'hallowwatch_user_name'       // Cached user name for frictionless commenting
};

// Starter Reviews
const DEFAULT_REVIEWS = {
  1: [
    {
      id: "rev_1_1",
      author: "Alex",
      rating: 5,
      comment: "Tim Burton at his atmospheric peak. The foggy woods, jack-o'-lanterns, and gothic sets make this the ultimate October 1 kickoff.",
      date: "Oct 1"
    }
  ],
  2: [
    {
      id: "rev_2_1",
      author: "Alex",
      rating: 5,
      comment: "Peak 80s practical effects! Slimer and the Stay Puft Marshmallow Man are timeless comfort horror.",
      date: "Oct 2"
    }
  ]
};

// Global App State
const state = {
  activeTheme: 'all',
  activeGenre: 'all',
  activeScare: 'all',
  searchQuery: '',
  statusFilter: 'all',
  sortMode: 'date-asc',
  activeView: 'grid', // 'grid' | 'calendar' | 'timeline'
  heroMode: 'today',  // 'today' | 'next'
  watchedIds: new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHED) || '[]')),
  reviews: JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS)) || DEFAULT_REVIEWS,
  userName: localStorage.getItem(STORAGE_KEYS.USER_NAME) || '',
  currentModalMovieId: null,
  activeFormRating: 5
};

// --------------------------------------------------------------------------
// Storage Helpers
// --------------------------------------------------------------------------
function saveWatched() {
  localStorage.setItem(STORAGE_KEYS.WATCHED, JSON.stringify(Array.from(state.watchedIds)));
}

function saveReviews() {
  localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(state.reviews));
}

function saveUserName(name) {
  state.userName = name;
  localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
}

// --------------------------------------------------------------------------
// Review & Average Rating Helpers
// --------------------------------------------------------------------------
function getMovieRatingData(movieId) {
  const movieReviews = state.reviews[movieId] || [];
  if (movieReviews.length === 0) {
    return { average: null, count: 0 };
  }
  const sum = movieReviews.reduce((acc, r) => acc + (r.rating || 5), 0);
  const avg = (sum / movieReviews.length).toFixed(1);
  return { average: parseFloat(avg), count: movieReviews.length };
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
  updateCatchupIndicator();
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
    color: Math.random() > 0.4 ? '249, 115, 22' : '168, 85, 247'
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
// Event Listeners (Search, Filters, Sort, View Modes, Modal, Reviews)
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

  // Genre Filter
  const genreFilter = document.getElementById('genre-filter');
  if (genreFilter) {
    genreFilter.addEventListener('change', (e) => {
      state.activeGenre = e.target.value;
      renderAllViews();
    });
  }

  // Scare Intensity Filter
  const scareFilter = document.getElementById('scare-filter');
  if (scareFilter) {
    scareFilter.addEventListener('change', (e) => {
      state.activeScare = e.target.value;
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

  // Review Star Selector in Form
  const starSelector = document.getElementById('review-star-selector');
  if (starSelector) {
    const stars = starSelector.querySelectorAll('.star-btn');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.getAttribute('data-star'), 10);
        setFormStarRating(val);
      });
    });
  }
}

function setFormStarRating(val) {
  state.activeFormRating = val;
  const stars = document.querySelectorAll('#review-star-selector .star-btn');
  stars.forEach((s, idx) => {
    if (idx < val) {
      s.classList.add('active');
    } else {
      s.classList.remove('active');
    }
  });
}

// --------------------------------------------------------------------------
// Review Submission & Deletion Handlers
// --------------------------------------------------------------------------
function handleReviewSubmit(e) {
  e.preventDefault();
  const movieId = state.currentModalMovieId;
  if (!movieId) return;

  const nameInput = document.getElementById('reviewer-name');
  const commentInput = document.getElementById('reviewer-comment');

  const author = nameInput.value.trim();
  const comment = commentInput.value.trim();

  if (!author || !comment) {
    showToast("Please provide both your name and review!");
    return;
  }

  saveUserName(author);

  const now = new Date();
  const dateStr = `Oct ${now.getDate()}`;

  const newReview = {
    id: `rev_${Date.now()}`,
    author: author,
    rating: state.activeFormRating || 5,
    comment: comment,
    date: dateStr
  };

  if (!state.reviews[movieId]) {
    state.reviews[movieId] = [];
  }
  state.reviews[movieId].unshift(newReview);
  saveReviews();

  commentInput.value = '';
  renderModalReviews(movieId);
  renderAllViews();
  renderHeroSpotlight();
  showToast(`🎃 Review posted by ${author}!`);
}

function deleteReview(movieId, reviewId) {
  if (!confirm("Are you sure you want to delete this comment?")) return;

  if (state.reviews[movieId]) {
    state.reviews[movieId] = state.reviews[movieId].filter(r => r.id !== reviewId);
    if (state.reviews[movieId].length === 0) {
      delete state.reviews[movieId];
    }
    saveReviews();
    renderModalReviews(movieId);
    renderAllViews();
    renderHeroSpotlight();
    showToast("Comment deleted 🗑️");
  }
}

function resetAllReviews() {
  if (confirm("Reset all friend comments back to initial defaults?")) {
    localStorage.removeItem(STORAGE_KEYS.REVIEWS);
    state.reviews = JSON.parse(JSON.stringify(DEFAULT_REVIEWS));
    saveReviews();
    renderAllViews();
    renderHeroSpotlight();
    if (state.currentModalMovieId) renderModalReviews(state.currentModalMovieId);
    showToast("All reviews reset to default");
  }
}

function resetPersonalProgress() {
  if (confirm("Reset your personal watch progress? All movies will be unmarked.")) {
    localStorage.removeItem(STORAGE_KEYS.WATCHED);
    state.watchedIds.clear();
    saveWatched();
    updateStats();
    renderHeroSpotlight();
    renderAllViews();
    showToast("Personal watch progress reset");
  }
}

// --------------------------------------------------------------------------
// Filter & Sort Logic
// --------------------------------------------------------------------------
function getFilteredMovies() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = (currentMonth === 9) ? today.getDate() : 2;

  return HALLOWEEN_MOVIES.filter(movie => {
    // Theme filter
    if (state.activeTheme !== 'all' && movie.themeKey !== state.activeTheme) {
      return false;
    }

    // Genre filter
    if (state.activeGenre !== 'all' && movie.genreCategory !== state.activeGenre) {
      return false;
    }

    // Scare intensity filter
    if (state.activeScare !== 'all') {
      if (state.activeScare === 'cozy' && movie.scareRating !== 1) return false;
      if (state.activeScare === 'mild' && movie.scareRating !== 2) return false;
      if (state.activeScare === 'moderate' && movie.scareRating !== 3) return false;
      if (state.activeScare === 'high' && movie.scareRating !== 4) return false;
      if (state.activeScare === 'extreme' && movie.scareRating !== 5) return false;
    }

    // Status filter
    const isWatched = state.watchedIds.has(movie.id);
    if (state.statusFilter === 'watched' && !isWatched) return false;
    if (state.statusFilter === 'unwatched' && isWatched) return false;
    if (state.statusFilter === 'catchup' && (isWatched || movie.dayNumber >= currentDay)) return false;
    if (state.statusFilter === 'first' && movie.status !== 'First Watch') return false;
    if (state.statusFilter === 'rewatch' && movie.status !== 'Rewatch') return false;

    // Search query
    if (state.searchQuery) {
      const matchTitle = movie.title.toLowerCase().includes(state.searchQuery);
      const matchDirector = movie.director.toLowerCase().includes(state.searchQuery);
      const matchSynopsis = (movie.synopsis || '').toLowerCase().includes(state.searchQuery);
      const matchNotes = movie.notes.toLowerCase().includes(state.searchQuery);
      const matchYear = movie.year.includes(state.searchQuery);
      const matchSubgenre = movie.subgenre.toLowerCase().includes(state.searchQuery);
      const matchVibe = (movie.scareVibe || '').toLowerCase().includes(state.searchQuery);
      if (!matchTitle && !matchDirector && !matchSynopsis && !matchNotes && !matchYear && !matchSubgenre && !matchVibe) {
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
      case 'rating-desc': {
        const ratingA = getMovieRatingData(a.id).average || 0;
        const ratingB = getMovieRatingData(b.id).average || 0;
        return ratingB - ratingA;
      }
      case 'scare-asc':
        return a.scareRating - b.scareRating;
      case 'scare-desc':
        return b.scareRating - a.scareRating;
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
// 1. GRID VIEW RENDERER (ORIGINAL BEAUTIFUL CARDS)
// --------------------------------------------------------------------------
function renderMoviesGrid() {
  const container = document.getElementById('grid-view');
  if (!container) return;

  const movies = getFilteredMovies();
  if (movies.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 12px;">👻</div>
        <h3>No spooky films match this filter</h3>
        <p>Try resetting active genre, scare level, or search filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = movies.map(movie => {
    const isWatched = state.watchedIds.has(movie.id);
    const { average, count } = getMovieRatingData(movie.id);

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
                  title="${isWatched ? 'Mark as unwatched on your device' : 'Mark as watched on your device'}"
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
            <span class="genre-tag">${movie.genreCategory}</span>
            <span class="scare-badge scare-level-${movie.scareRating}">
              🎃 ${movie.scareRating}/5 ${movie.scareLabel}
            </span>
            <span class="tag-badge tag-runtime">⏱ ${movie.runtime}m</span>
            ${count > 0 ? `<span class="tag-badge group-rating-badge">★ ${average} (${count})</span>` : ''}
          </div>

          <p class="card-synopsis">${movie.synopsis}</p>
          <p class="card-rationale-snippet">"${movie.notes}"</p>
        </div>

        <div class="movie-card-footer">
          <span>🎬 ${movie.director} (${movie.year})</span>
          <span style="color: var(--pumpkin-400); font-weight: 600;">
            ${count > 0 ? `💬 ${count} Review${count > 1 ? 's' : ''}` : `Day ${movie.dayNumber}`}
          </span>
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

  const leadingBlanks = 4; // Oct 1 is Thursday
  let html = '';

  for (let i = 0; i < leadingBlanks; i++) {
    html += `<div class="calendar-cell" style="opacity: 0.15; cursor: default; background: rgba(0,0,0,0.2);">
      <div class="cal-dow" style="padding: 10px;">Sep</div>
    </div>`;
  }

  HALLOWEEN_MOVIES.forEach(movie => {
    const isWatched = state.watchedIds.has(movie.id);
    const matchesFilter = getFilteredMovies().some(m => m.id === movie.id);
    const opacityStyle = matchesFilter ? '' : 'opacity: 0.25; filter: grayscale(90%);';
    const { average } = getMovieRatingData(movie.id);

    html += `
      <div class="calendar-cell ${isWatched ? 'is-watched' : ''}" 
           style="${opacityStyle}"
           onclick="openMovieModal(${movie.id})">
        <div class="calendar-cell-top">
          <span class="cal-day-num">${movie.dayNumber}</span>
          <span class="cal-dow">${movie.dayOfWeek}</span>
          <span onclick="event.stopPropagation(); toggleWatched(${movie.id});" 
                title="Mark watched on your device"
                style="cursor: pointer; font-size: 0.95rem;">
            ${isWatched ? '💚' : '🤍'}
          </span>
        </div>
        <div class="cal-title">${movie.icon} ${movie.title}</div>
        <div style="font-size: 0.68rem; color: var(--text-dim); margin-bottom: 4px;">
          ${movie.genreCategory}
        </div>
        <div class="cal-meta">
          <span>${movie.runtime}m</span>
          <span class="scare-badge scare-level-${movie.scareRating}" style="font-size: 0.65rem; padding: 1px 5px;">
            🎃 ${movie.scareRating}/5
          </span>
        </div>
      </div>
    `;
  });

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
    const { average, count } = getMovieRatingData(movie.id);

    return `
      <div class="timeline-row ${isWatched ? 'is-watched' : ''}" onclick="openMovieModal(${movie.id})">
        <button class="watch-checkbox-btn ${isWatched ? 'checked' : ''}" 
                onclick="event.stopPropagation(); toggleWatched(${movie.id})"
                title="Mark watched on your device">
          ${isWatched ? '✓' : '○'}
        </button>
        <span style="font-weight: 700; color: var(--pumpkin-400); font-size: 0.85rem;">${movie.date}</span>
        <div class="timeline-title-group">
          <span class="timeline-title">${movie.icon} ${movie.title} (${movie.year})</span>
          <span class="timeline-sub">${movie.synopsis}</span>
        </div>
        <span class="timeline-runtime" style="color: var(--text-muted); font-size: 0.85rem;">⏱ ${movie.runtime}m</span>
        <span class="timeline-scare">
          <span class="scare-badge scare-level-${movie.scareRating}">🎃 ${movie.scareRating}/5</span>
        </span>
        <span class="timeline-status" style="font-size: 0.78rem; color: ${count > 0 ? '#facc15' : (movie.status === 'First Watch' ? '#34d399' : '#fb923c')};">
          ${count > 0 ? `★ ${average} (${count})` : movie.status}
        </span>
        <span style="color: var(--text-dim); font-size: 0.85rem;">➔</span>
      </div>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// TONIGHT'S FEATURE HERO CALCULATOR (ORIGINAL SCREENSHOT 2 LAYOUT)
// --------------------------------------------------------------------------
function setHeroMode(mode) {
  state.heroMode = mode;
  renderHeroSpotlight();
}

function renderHeroSpotlight() {
  const heroContainer = document.getElementById('hero-spotlight');
  if (!heroContainer) return;

  const today = new Date();
  const currentMonth = today.getMonth(); // 9 is October
  const currentDay = (currentMonth === 9) ? today.getDate() : 2;

  let featuredMovie = null;

  if (state.heroMode === 'today') {
    featuredMovie = HALLOWEEN_MOVIES.find(m => m.dayNumber === currentDay) || HALLOWEEN_MOVIES[0];
  } else {
    featuredMovie = HALLOWEEN_MOVIES.find(m => !state.watchedIds.has(m.id)) || HALLOWEEN_MOVIES[0];
  }

  const isWatched = state.watchedIds.has(featuredMovie.id);
  const { average, count } = getMovieRatingData(featuredMovie.id);
  const latestReview = (state.reviews[featuredMovie.id] || [])[0];

  heroContainer.innerHTML = `
    <div class="hero-badge-row">
      <div class="hero-mode-toggle">
        <button class="hero-mode-btn ${state.heroMode === 'today' ? 'active' : ''}" onclick="setHeroMode('today')">
          📅 Today's Date
        </button>
        <button class="hero-mode-btn ${state.heroMode === 'next' ? 'active' : ''}" onclick="setHeroMode('next')">
          ⏩ Your Next Up
        </button>
      </div>

      <span class="spotlight-pill">
        ${state.heroMode === 'today' ? "TONIGHT'S SCHEDULED FILM" : "NEXT ON YOUR WATCHLIST"}
      </span>
      <span class="date-pill">🎃 ${featuredMovie.date} • ${featuredMovie.dayOfWeek}</span>
      <span class="genre-tag">${featuredMovie.genreCategory}</span>
      <span class="scare-badge scare-level-${featuredMovie.scareRating}">
        🎃 ${featuredMovie.scareRating}/5 ${featuredMovie.scareLabel}
      </span>
      ${count > 0 ? `<span class="date-pill" style="border-color: #facc15; color: #facc15;">★ ${average} (${count} reviews)</span>` : ''}
    </div>

    <div class="hero-content">
      <div>
        <h2 class="hero-title">${featuredMovie.icon} ${featuredMovie.title} (${featuredMovie.year})</h2>
        <div class="hero-meta">
          <span>⏱ <strong>${featuredMovie.runtime} mins</strong></span>
          <span>•</span>
          <span>🎬 Directed by <strong>${featuredMovie.director}</strong></span>
          <span>•</span>
          <span style="color: ${featuredMovie.status === 'First Watch' ? '#34d399' : '#fb923c'};">
            <strong>${featuredMovie.status}</strong>
          </span>
          <span>•</span>
          <span>${featuredMovie.subgenre}</span>
        </div>

        <p class="hero-synopsis">${featuredMovie.synopsis}</p>
        
        <div class="hero-rationale-box">
          Curator's Note: "${featuredMovie.notes}"
        </div>

        ${latestReview ? `
          <div class="hero-quote-box">
            <strong style="color: #fff;">${latestReview.author}</strong> <span style="color: #facc15;">${'★'.repeat(latestReview.rating)}</span>: 
            <span style="color: var(--text-secondary); font-style: italic;">"${latestReview.comment}"</span>
          </div>
        ` : ''}

        <div class="hero-actions">
          <button class="btn ${isWatched ? 'btn-watched' : 'btn-primary'}" onclick="toggleWatched(${featuredMovie.id})">
            ${isWatched ? '✓ Watched (Your List)' : 'Mark Watched (Your List)'}
          </button>
          <button class="btn btn-secondary" onclick="openMovieModal(${featuredMovie.id})">
            View Details & Reviews (${count})
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
// CATCH-UP & FLEXIBILITY INDICATOR
// --------------------------------------------------------------------------
function updateCatchupIndicator() {
  const indicator = document.getElementById('catchup-indicator');
  if (!indicator) return;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = (currentMonth === 9) ? today.getDate() : 2;

  const skippedUnwatched = HALLOWEEN_MOVIES.filter(m => m.dayNumber < currentDay && !state.watchedIds.has(m.id));

  if (skippedUnwatched.length > 0) {
    indicator.className = 'catchup-badge';
    indicator.style.background = 'rgba(239, 68, 68, 0.2)';
    indicator.style.borderColor = 'rgba(239, 68, 68, 0.5)';
    indicator.style.color = '#f87171';
    indicator.style.cursor = 'pointer';
    indicator.innerHTML = `⚠️ ${skippedUnwatched.length} Skipped Before Today (Click to Catch Up)`;
    indicator.onclick = () => {
      const statusFilter = document.getElementById('status-filter');
      if (statusFilter) {
        statusFilter.value = 'catchup';
        state.statusFilter = 'catchup';
        renderAllViews();
        showToast(`Showing ${skippedUnwatched.length} skipped movies to catch up!`);
      }
    };
  } else {
    indicator.className = 'catchup-badge';
    indicator.style.background = 'rgba(16, 185, 129, 0.2)';
    indicator.style.borderColor = 'rgba(16, 185, 129, 0.5)';
    indicator.style.color = '#34d399';
    indicator.innerHTML = `✓ On Track for October`;
    indicator.onclick = null;
  }
}

// --------------------------------------------------------------------------
// STATS DASHBOARD UPDATE (Individual to user)
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
  if (progressText) progressText.textContent = `${percentComplete}% Completed by You`;

  updateCatchupIndicator();
}

// --------------------------------------------------------------------------
// WATCH STATUS TOGGLE (Strictly Personal)
// --------------------------------------------------------------------------
function toggleWatched(id) {
  const movie = HALLOWEEN_MOVIES.find(m => m.id === id);
  if (!movie) return;

  if (state.watchedIds.has(id)) {
    state.watchedIds.delete(id);
    showToast(`Unmarked "${movie.title}" on your list`);
  } else {
    state.watchedIds.add(id);
    showToast(`🎃 Watched "${movie.title}"! (+${movie.runtime} mins)`);
  }

  saveWatched();
  updateStats();
  renderHeroSpotlight();
  renderAllViews();

  const modalToggleBtn = document.getElementById('modal-watch-toggle');
  if (modalToggleBtn && state.currentModalMovieId === id) {
    const isW = state.watchedIds.has(id);
    modalToggleBtn.className = `btn ${isW ? 'btn-watched' : 'btn-primary'}`;
    modalToggleBtn.textContent = isW ? '✓ Watched by You' : 'Mark as Watched';
  }
}

// --------------------------------------------------------------------------
// MODAL DIALOG MANAGEMENT (EXPANDED CARD USER LIKED)
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
  
  // Genre & Scare Badges
  document.getElementById('modal-genre-tag').textContent = movie.genreCategory;
  const scareBadge = document.getElementById('modal-scare-badge');
  scareBadge.className = `scare-badge scare-level-${movie.scareRating}`;
  scareBadge.textContent = `🎃 ${movie.scareRating}/5 ${movie.scareLabel}`;

  // Letterboxd Synopsis
  document.getElementById('modal-synopsis').textContent = movie.synopsis;

  // 2-Column Info Grid for Expanded Card
  document.getElementById('modal-scare-title').textContent = `Scare Level ${movie.scareRating}/5 — ${movie.scareLabel}`;
  document.getElementById('modal-scare-vibe').textContent = movie.scareVibe;
  document.getElementById('modal-backup').textContent = movie.backupAlternate;

  // Rationale
  document.getElementById('modal-rationale').textContent = movie.notes;

  // Personal watch toggle in modal
  const isWatched = state.watchedIds.has(id);
  const modalToggleBtn = document.getElementById('modal-watch-toggle');
  modalToggleBtn.className = `btn ${isWatched ? 'btn-watched' : 'btn-primary'}`;
  modalToggleBtn.textContent = isWatched ? '✓ Watched by You' : 'Mark as Watched';
  modalToggleBtn.onclick = () => toggleWatched(id);

  // Streaming link
  const streamLink = document.getElementById('modal-stream-link');
  streamLink.href = `https://www.google.com/search?q=where+to+watch+${encodeURIComponent(movie.title)}+${movie.year}+movie`;

  // Pre-fill reviewer name if remembered
  const nameInput = document.getElementById('reviewer-name');
  if (nameInput) {
    nameInput.value = state.userName || '';
  }

  setFormStarRating(5);
  renderModalReviews(id);

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderModalReviews(movieId) {
  const { average, count } = getMovieRatingData(movieId);
  const avgNumElem = document.getElementById('modal-avg-rating');
  const avgStarsElem = document.getElementById('modal-avg-stars');
  const avgCountElem = document.getElementById('modal-reviews-count');
  const feedElem = document.getElementById('reviews-feed');

  if (count > 0) {
    avgNumElem.textContent = average;
    const rounded = Math.round(average);
    avgStarsElem.textContent = '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
    avgCountElem.textContent = `${count} friend review${count > 1 ? 's' : ''}`;
  } else {
    avgNumElem.textContent = '0.0';
    avgStarsElem.textContent = '☆☆☆☆☆';
    avgCountElem.textContent = 'No reviews yet';
  }

  const reviews = state.reviews[movieId] || [];
  if (reviews.length === 0) {
    feedElem.innerHTML = `
      <div class="empty-reviews-state">
        👻 No reviews for this film yet. Be the first to share your thoughts!
      </div>
    `;
    return;
  }

  feedElem.innerHTML = reviews.map(rev => {
    const initial = rev.author ? rev.author.charAt(0).toUpperCase() : '?';
    const stars = '★'.repeat(rev.rating || 5);

    return `
      <div class="review-item">
        <div class="review-item-header">
          <div class="author-badge">
            <div class="avatar-circle">${initial}</div>
            <span class="author-name">${rev.author}</span>
            <span class="review-stars">${stars}</span>
          </div>
          <div class="review-actions-row">
            <span class="review-time">${rev.date || 'Oct 2026'}</span>
            <button class="delete-review-btn" onclick="deleteReview(${movieId}, '${rev.id}')" title="Delete this comment">🗑️</button>
          </div>
        </div>
        <p class="review-body">${rev.comment}</p>
      </div>
    `;
  }).join('');
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
