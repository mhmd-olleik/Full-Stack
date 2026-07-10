// ============================================
// Video Player — Multi-Server Player Engine
// ============================================

const Player = {
  currentServer: 0,
  currentType: null,
  currentId: null,
  currentSeason: null,
  currentEpisode: null,
  servers: [],
  details: null,
  seasonData: null,

  // ---- Initialize Player ----
  async init(type, id, season = null, episode = null) {
    this.currentType = type;
    this.currentId = id;
    this.currentSeason = season;
    this.currentEpisode = episode;
    this.currentServer = Storage.getPreferences().preferredServer || 0;

    // Get all server URLs
    this.servers = API.getAllServers(type, id, season, episode);

    // Get content details
    this.details = await API.getDetails(type, id);

    // For TV shows, get season data
    if (type === 'tv' && season) {
      this.seasonData = await API.getSeasonDetails(id, season);
    }

    // Add to watch history
    if (this.details) {
      Storage.addToHistory({
        id,
        type,
        title: this.details.title || this.details.name,
        poster_path: this.details.poster_path,
        season,
        episode,
      });
    }

    return this.render();
  },

  // ---- Render Player Page ----
  render() {
    if (!this.details) {
      return `
        <div class="container page-transition">
          <div class="empty-state">
            <div class="empty-icon">😔</div>
            <h2>Content Not Found</h2>
            <p>Sorry, we couldn't find the content you're looking for.</p>
            <a href="#/" class="btn btn-primary">← Back to Home</a>
          </div>
        </div>
      `;
    }

    const d = this.details;
    const title = d.title || d.name;
    const year = (d.release_date || d.first_air_date || '').split('-')[0];
    const rating = d.vote_average?.toFixed(1) || 'N/A';
    const genres = (d.genres || []).map(g => g.name);
    const runtime = d.runtime ? `${d.runtime} min` : d.episode_run_time?.[0] ? `${d.episode_run_time[0]} min` : '';
    const isInWatchlist = Storage.isInWatchlist(d.id, this.currentType);

    // Update page title
    document.title = `${title} — IPTV World`;

    let html = `
      <div class="player-container page-transition">
        <!-- Player -->
        <div class="player-wrapper" id="playerWrapper">
          <iframe 
            id="playerFrame"
            src="${this.servers[this.currentServer]?.url || ''}" 
            allowfullscreen
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerpolicy="origin"
            loading="lazy"
          ></iframe>
        </div>

        <!-- Server Tabs -->
        <div class="server-tabs" id="serverTabs">
          ${this.servers.map((s, i) => `
            <button class="server-tab ${i === this.currentServer ? 'active' : ''}" 
                    onclick="Player.switchServer(${i})" 
                    id="server-${i}">
              <span class="server-status"></span>
              ${s.icon} ${s.name}
            </button>
          `).join('')}
        </div>

        <!-- Player Info -->
        <div class="player-info">
          <div style="display:flex; justify-content:space-between; align-items:start; gap:16px; flex-wrap:wrap;">
            <div style="flex:1; min-width:0;">
              <h1 class="player-title">${title}</h1>
              <div class="player-meta">
                <span class="player-meta-item rating">⭐ ${rating}</span>
                ${year ? `<span class="player-meta-item">📅 ${year}</span>` : ''}
                ${runtime ? `<span class="player-meta-item">⏱️ ${runtime}</span>` : ''}
                ${d.status ? `<span class="player-meta-item">📊 ${d.status}</span>` : ''}
                <span class="card-badge hd" style="display:inline-block;">HD</span>
              </div>
            </div>
            <button class="btn ${isInWatchlist ? 'btn-accent' : 'btn-secondary'}" 
                    onclick="Player.toggleWatchlist()" id="watchlistBtn">
              ${isInWatchlist ? '❤️ In Watchlist' : '🤍 Add to Watchlist'}
            </button>
          </div>

          ${d.overview ? `<p class="player-description">${d.overview}</p>` : ''}

          <div class="player-genres">
            ${genres.map(g => `<span class="genre-chip">${g}</span>`).join('')}
          </div>
        </div>

        ${this.currentType === 'tv' ? this.renderEpisodes() : ''}

        <!-- Recommendations -->
        ${this.renderRecommendations()}
      </div>
    `;

    return html;
  },

  // ---- Render Episode List ----
  renderEpisodes() {
    if (!this.details?.seasons) return '';

    const seasons = this.details.seasons.filter(s => s.season_number > 0);
    const currentSeasonNum = this.currentSeason || 1;

    let episodesHtml = '';
    if (this.seasonData?.episodes) {
      episodesHtml = this.seasonData.episodes.map(ep => {
        const isActive = ep.episode_number == this.currentEpisode;
        return `
          <div class="episode-card ${isActive ? 'active' : ''}" 
               onclick="App.navigate('/watch/tv/${this.currentId}/${currentSeasonNum}/${ep.episode_number}')">
            <div class="episode-thumb">
              <img src="${API.img(ep.still_path, 'w300')}" alt="Episode ${ep.episode_number}"
                   onerror="this.src='${API.placeholder()}'">
              <span class="episode-number">E${ep.episode_number}</span>
            </div>
            <div class="episode-info">
              <h4>Episode ${ep.episode_number}: ${ep.name || ''}</h4>
              <p>${ep.overview || 'No description available.'}</p>
            </div>
          </div>
        `;
      }).join('');
    }

    return `
      <div class="episode-section">
        <div class="section-header">
          <div>
            <h2 class="section-title">📺 Episodes</h2>
          </div>
          <div class="season-selector">
            <select class="season-select" id="seasonSelect" onchange="Player.changeSeason(this.value)">
              ${seasons.map(s => `
                <option value="${s.season_number}" ${s.season_number == currentSeasonNum ? 'selected' : ''}>
                  Season ${s.season_number} (${s.episode_count} eps)
                </option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="episode-grid" id="episodeGrid">
          ${episodesHtml || '<div class="spinner"></div>'}
        </div>
      </div>
    `;
  },

  // ---- Render Recommendations ----
  renderRecommendations() {
    const recs = this.details?.recommendations?.results?.slice(0, 12) || [];
    if (recs.length === 0) return '';

    return `
      <div class="section-header" style="margin-top:32px;">
        <h2 class="section-title">🎯 You May Also Like</h2>
      </div>
      <div class="content-grid">
        ${recs.map(item => this.renderCard(item)).join('')}
      </div>
    `;
  },

  renderCard(item) {
    const type = item.media_type || this.currentType;
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').split('-')[0];
    const rating = item.vote_average?.toFixed(1);

    return `
      <div class="content-card" onclick="App.navigate('/watch/${type}/${item.id}${type === 'tv' ? '/1/1' : ''}')">
        <div class="card-poster">
          <img src="${API.img(item.poster_path, 'w342')}" alt="${title}"
               loading="lazy" onerror="this.src='${API.placeholder()}'">
          <div class="card-poster-overlay">
            <div class="card-play-btn">▶</div>
          </div>
          ${rating ? `<div class="card-rating">⭐ ${rating}</div>` : ''}
        </div>
        <div class="card-info">
          <div class="card-title">${title}</div>
          <div class="card-meta">
            <span>${year}</span>
            <span>•</span>
            <span>${type === 'tv' ? 'TV' : 'Movie'}</span>
          </div>
        </div>
      </div>
    `;
  },

  // ---- Actions ----
  switchServer(index) {
    this.currentServer = index;
    Storage.setPreference('preferredServer', index);

    const frame = document.getElementById('playerFrame');
    if (frame) {
      frame.src = this.servers[index].url;
    }

    // Update tab styles
    document.querySelectorAll('.server-tab').forEach((tab, i) => {
      tab.classList.toggle('active', i === index);
    });

    App.showToast(`Switched to ${this.servers[index].name}`);
  },

  async changeSeason(seasonNum) {
    this.currentSeason = parseInt(seasonNum);
    this.currentEpisode = 1;

    // Update URL
    window.location.hash = `/watch/tv/${this.currentId}/${this.currentSeason}/1`;
  },

  toggleWatchlist() {
    if (!this.details) return;

    const added = Storage.toggleWatchlist({
      ...this.details,
      type: this.currentType,
      media_type: this.currentType,
    });

    const btn = document.getElementById('watchlistBtn');
    if (btn) {
      btn.className = `btn ${added ? 'btn-accent' : 'btn-secondary'}`;
      btn.innerHTML = added ? '❤️ In Watchlist' : '🤍 Add to Watchlist';
    }

    App.showToast(added ? 'Added to Watchlist' : 'Removed from Watchlist');
  },

  // ---- Live TV Player ----
  hlsInstance: null,
  _qualityLevels: [],
  _currentQuality: -1, // -1 = auto

  renderLiveTVPlayer(channel) {
    document.title = `${channel.name} — IPTV World Live TV`;

    const hasStream = channel.stream && channel.stream.length > 0;
    const hasEmbed = channel.embedUrl && channel.embedUrl.length > 0;
    const logoHtml = channel.logoUrl
      ? `<img src="${channel.logoUrl}" alt="${channel.name}" style="width:80px;height:80px;object-fit:contain;border-radius:12px;background:rgba(255,255,255,0.1);padding:8px;" onerror="this.outerHTML='<div style=\\'font-size:4rem;\\'>${channel.logo}</div>'">`
      : `<div style="font-size:4rem;">${channel.logo}</div>`;

    // Determine player content
    let playerContent = '';
    if (hasStream) {
      // Direct HLS stream
      playerContent = `
        <video id="liveVideo" controls autoplay playsinline style="width:100%;height:100%;object-fit:contain;background:#000;">
          Your browser does not support the video tag.
        </video>
      `;
    } else if (hasEmbed) {
      // Embed iframe (beIN Sports, etc.)
      playerContent = `
        <iframe id="embedFrame" src="${channel.embedUrl}" 
                allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" 
                referrerpolicy="origin" loading="lazy"
                style="width:100%;height:100%;border:none;"></iframe>
      `;
    } else {
      // No stream available
      playerContent = `
        <div style="display:flex; align-items:center; justify-content:center; height:100%; flex-direction:column; gap:16px; color:var(--text-secondary);">
          ${logoHtml}
          <h2 style="font-family:var(--font-primary); color:var(--text-primary);">${channel.name}</h2>
          <p>Stream unavailable — try another channel</p>
        </div>
      `;
    }

    return `
      <div class="player-container page-transition">
        <div class="player-wrapper">
          <div class="livetv-player" id="livePlayer">
            ${playerContent}
          </div>
        </div>

        <!-- Quality Selector (only for HLS streams) -->
        ${hasStream ? `
        <div class="quality-controls" id="qualityControls">
          <div class="quality-label">📺 Quality:</div>
          <div class="quality-buttons" id="qualityButtons">
            <button class="quality-btn active" data-level="-1" onclick="Player.setQuality(-1, this)">Auto</button>
            <div class="quality-loading" id="qualityLoading">Loading quality options...</div>
          </div>
        </div>
        ` : ''}

        <div class="player-info" style="margin-top:24px;">
          <div style="display:flex; align-items:center; gap:16px;">
            ${channel.logoUrl ? `<img src="${channel.logoUrl}" alt="${channel.name}" class="channel-logo-large" onerror="this.style.display='none'">` : ''}
            <div>
              <h1 class="player-title">${channel.name}</h1>
              <div class="player-meta">
                <span class="player-meta-item">📡 ${(channel.category || '').toUpperCase()}</span>
                <span class="player-meta-item">📺 <span id="currentQualityLabel">${channel.quality || '720p'}</span></span>
                <span class="player-meta-item" style="color:var(--accent-green);">● LIVE</span>
              </div>
            </div>
          </div>
          ${hasStream ? `<p class="player-description" style="margin-top:12px;font-size:0.8rem;color:var(--text-muted);">Stream: ${channel.stream.substring(0, 80)}...</p>` : ''}
          ${hasEmbed ? `<p class="player-description" style="margin-top:12px;font-size:0.8rem;color:var(--text-muted);">📡 Embedded live stream player</p>` : ''}
        </div>

        <!-- Related channels -->
        <div class="section-header" style="margin-top:32px;">
          <h2 class="section-title">📺 Related Channels</h2>
        </div>
        <div class="channel-grid">
          ${Channels.getByCategory(channel.category).filter(c => c.id !== channel.id).slice(0, 12).map(ch => `
            <div class="channel-card" onclick="App.navigate('/channel/${ch.id}')">
              <div class="channel-logo">
                ${ch.logoUrl 
                  ? `<img src="${ch.logoUrl}" alt="${ch.name}" class="channel-logo-img" onerror="this.outerHTML='${ch.logo}'">`
                  : ch.logo}
              </div>
              <div class="channel-info">
                <h4>${ch.name}</h4>
                <span class="channel-category">${ch.quality || '720p'}</span>
              </div>
              <div class="channel-live-dot"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // ---- Quality Selection ----
  setQuality(levelIndex, btnEl) {
    if (!this.hlsInstance) return;

    this.hlsInstance.currentLevel = levelIndex;
    this._currentQuality = levelIndex;

    // Update button styles
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    // Update label
    const label = document.getElementById('currentQualityLabel');
    if (label) {
      if (levelIndex === -1) {
        label.textContent = 'Auto';
      } else {
        const level = this._qualityLevels[levelIndex];
        if (level) {
          label.textContent = level.height + 'p';
        }
      }
    }

    App.showToast(`Quality: ${levelIndex === -1 ? 'Auto' : this._qualityLevels[levelIndex]?.height + 'p'}`);
  },

  _buildQualityButtons() {
    const container = document.getElementById('qualityButtons');
    if (!container || !this.hlsInstance) return;

    const levels = this.hlsInstance.levels || [];
    this._qualityLevels = levels;

    if (levels.length === 0) {
      container.innerHTML = '<button class="quality-btn active" data-level="-1" onclick="Player.setQuality(-1, this)">Auto</button>';
      return;
    }

    // Sort levels by height (resolution) ascending
    const sortedLevels = levels
      .map((l, i) => ({ height: l.height, width: l.width, bitrate: l.bitrate, index: i }))
      .sort((a, b) => a.height - b.height);

    // Define desired quality tiers including 360p
    const desiredQualities = [360, 480, 720, 1080];
    
    // Build quality buttons
    let buttonsHtml = '<button class="quality-btn active" data-level="-1" onclick="Player.setQuality(-1, this)">Auto</button>';

    // Add available quality levels
    const addedHeights = new Set();
    for (const level of sortedLevels) {
      // Find the closest desired quality or just use the actual height
      let displayHeight = level.height;
      
      // Round to nearest standard quality
      if (level.height <= 240) displayHeight = 240;
      else if (level.height <= 360) displayHeight = 360;
      else if (level.height <= 480) displayHeight = 480;
      else if (level.height <= 720) displayHeight = 720;
      else if (level.height <= 1080) displayHeight = 1080;
      else displayHeight = level.height;

      if (addedHeights.has(displayHeight)) continue;
      addedHeights.add(displayHeight);

      const label = displayHeight + 'p';
      const isHD = displayHeight >= 720;
      buttonsHtml += `<button class="quality-btn" data-level="${level.index}" onclick="Player.setQuality(${level.index}, this)">${label}${isHD ? ' <span class="quality-hd-tag">HD</span>' : ''}</button>`;
    }

    // If stream has levels but none ≤ 360p, add a forced 360p option
    // We can force HLS.js to cap at a certain resolution
    const hasLowQuality = sortedLevels.some(l => l.height <= 360);
    if (!hasLowQuality && sortedLevels.length > 0) {
      // Use the lowest available level as "360p" equivalent 
      const lowestLevel = sortedLevels[0];
      if (lowestLevel.height > 360) {
        buttonsHtml = '<button class="quality-btn active" data-level="-1" onclick="Player.setQuality(-1, this)">Auto</button>';
        buttonsHtml += `<button class="quality-btn" data-level="${lowestLevel.index}" onclick="Player.setQuality(${lowestLevel.index}, this)">360p <span class="quality-low-tag">LOW</span></button>`;
        
        for (const level of sortedLevels) {
          const label = level.height + 'p';
          const isHD = level.height >= 720;
          buttonsHtml += `<button class="quality-btn" data-level="${level.index}" onclick="Player.setQuality(${level.index}, this)">${label}${isHD ? ' <span class="quality-hd-tag">HD</span>' : ''}</button>`;
        }
      }
    }

    container.innerHTML = buttonsHtml;

    // Restore saved preference
    const savedQuality = Storage.getPreferences().preferredQuality || 'auto';
    if (savedQuality !== 'auto') {
      const targetHeight = parseInt(savedQuality);
      const matchingLevel = sortedLevels.find(l => l.height === targetHeight) || sortedLevels.find(l => l.height <= targetHeight);
      if (matchingLevel) {
        this.setQuality(matchingLevel.index, container.querySelector(`[data-level="${matchingLevel.index}"]`));
      }
    }
  },

  // Play HLS stream after DOM renders
  playLiveStream(channel) {
    if (!channel.stream) return;

    const video = document.getElementById('liveVideo');
    if (!video) return;

    // Clean up previous HLS instance
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }

    this._qualityLevels = [];
    this._currentQuality = -1;

    const streamUrl = channel.stream;

    // Check if native HLS support (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.play().catch(e => console.warn('Autoplay blocked:', e));
      // Hide quality controls for native HLS (Safari manages quality automatically)
      const qc = document.getElementById('qualityControls');
      if (qc) qc.style.display = 'none';
      return;
    }

    // Use HLS.js for other browsers
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        enableWorker: true,
        lowLatencyMode: false,
        capLevelToPlayerSize: false, // Allow all quality levels
        startLevel: -1, // Auto
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log(`🎥 Stream loaded with ${data.levels.length} quality levels:`, data.levels.map(l => `${l.height}p @ ${Math.round(l.bitrate/1000)}kbps`));
        video.play().catch(e => console.warn('Autoplay blocked:', e));
        
        // Build quality selector buttons
        setTimeout(() => this._buildQualityButtons(), 200);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level];
        if (level) {
          const label = document.getElementById('currentQualityLabel');
          if (label && this._currentQuality === -1) {
            label.textContent = level.height + 'p (Auto)';
          }
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn('HLS Error:', data.type, data.details);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error, cannot recover');
              hls.destroy();
              // Show error in player
              const player = document.getElementById('livePlayer');
              if (player) {
                player.innerHTML = `
                  <div style="display:flex; align-items:center; justify-content:center; height:100%; flex-direction:column; gap:16px; color:var(--text-secondary);">
                    <div style="font-size:3rem;">⚠️</div>
                    <h3 style="color:var(--text-primary);">Stream Error</h3>
                    <p>This stream is currently unavailable. Try another channel.</p>
                    <button class="btn btn-primary" onclick="App.navigate('/livetv')">Browse Channels</button>
                  </div>
                `;
              }
              break;
          }
        }
      });

      this.hlsInstance = hls;
    } else {
      // Fallback: try direct play
      video.src = streamUrl;
      video.play().catch(e => console.warn('Cannot play stream:', e));
      // Hide quality controls for direct play
      const qc = document.getElementById('qualityControls');
      if (qc) qc.style.display = 'none';
    }
  },
};

// Make available globally
window.Player = Player;
