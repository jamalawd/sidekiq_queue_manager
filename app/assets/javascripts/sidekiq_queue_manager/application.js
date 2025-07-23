/**
 * Sidekiq Queue Manager - shadcn-Inspired Professional Interface
 *
 * A comprehensive JavaScript application for managing Sidekiq queues
 * Features: Real-time updates, live pull, queue operations, custom modals, theme switching
 *
 * Version: 2.0.0 (Redesigned)
 * Design Philosophy: Compact minimalism with perfect dark/light mode
 */

class SidekiqQueueManagerUI {
  static instance = null;

  // ========================================
  // Constants
  // ========================================
  static CONSTANTS = {
    REFRESH_INTERVALS: {
      OFF: 0,
      FIVE_SECONDS: 5000
    },
    DEFAULT_REFRESH_INTERVAL: 5000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    ANIMATION_DELAYS: {
      FOCUS: 150,
      LAYOUT_RECALC: 50
    },
    API_ENDPOINTS: {
      metrics: '/metrics',
      pauseAll: '/queues/pause_all',
      resumeAll: '/queues/resume_all',
      queueAction: (queueName, action) => `/queues/${queueName}/${action}`,
      summary: '/queues/summary'
    },
    THEMES: {
      LIGHT: 'light',
      DARK: 'dark',
      AUTO: 'auto'
    }
  };

  constructor(config = {}) {
    if (SidekiqQueueManagerUI.instance) {
      SidekiqQueueManagerUI.instance.destroy();
    }
    SidekiqQueueManagerUI.instance = this;

    // Gem configuration (passed from Rails)
    this.gemConfig = {
      mountPath: config.mountPath || '',
      refreshInterval: config.refreshInterval || SidekiqQueueManagerUI.CONSTANTS.DEFAULT_REFRESH_INTERVAL,
      theme: config.theme || 'auto',
      criticalQueues: config.criticalQueues || [],
      ...config
    };

    this.state = {
      isRefreshing: false,
      refreshInterval: null,
      currentRefreshTime: this.gemConfig.refreshInterval,
      retryCount: 0,
      lastUpdate: null,
      livePullEnabled: false,
      currentTheme: this.getStoredTheme() || this.gemConfig.theme,
      activeTab: 'queues',
      pagination: {
        scheduled: { page: 1, per_page: 25, filter: '' },
        retries: { page: 1, per_page: 25, filter: '' },
        dead: { page: 1, per_page: 25, filter: '' }
      }
    };

    this.currentMenuCloseHandler = null;
    this.currentActionsMenu = null;
    this.elements = new Map();
    this.eventHandlers = new Map();

    this.init();
  }

  // ========================================
  // Initialization
  // ========================================

  init() {
    this.initializeTheme();
    this.cacheElements();
    this.setupEventListeners();
    this.setupTabSystem();
    this.initializeRefreshControl();
    this.loadInitialData();
    this.injectActionsMenuStyles();
  }

  // ========================================
  // Theme Management
  // ========================================

  initializeTheme() {
    // Apply stored theme or detect system preference
    this.applyTheme(this.state.currentTheme);

    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.state.currentTheme === SidekiqQueueManagerUI.CONSTANTS.THEMES.AUTO) {
          this.applyTheme(SidekiqQueueManagerUI.CONSTANTS.THEMES.AUTO);
        }
      });
    }
  }

  getStoredTheme() {
    try {
      return localStorage.getItem('sqm-theme');
    } catch (e) {
      return null;
    }
  }

  setStoredTheme(theme) {
    try {
      localStorage.setItem('sqm-theme', theme);
    } catch (e) {
      // Ignore storage errors
    }
  }

  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return SidekiqQueueManagerUI.CONSTANTS.THEMES.DARK;
    }
    return SidekiqQueueManagerUI.CONSTANTS.THEMES.LIGHT;
  }

  applyTheme(theme) {
    const root = document.documentElement;

    // Remove existing theme attributes
    root.removeAttribute('data-theme');

    if (theme === SidekiqQueueManagerUI.CONSTANTS.THEMES.AUTO) {
      // Let CSS handle auto theme detection
      this.state.currentTheme = theme;
    } else {
      // Explicitly set theme
      root.setAttribute('data-theme', theme);
      this.state.currentTheme = theme;
    }

    // Update theme toggle button
    this.updateThemeToggleButton();

    // Store theme preference
    this.setStoredTheme(theme);
  }

  toggleTheme() {
    const currentEffectiveTheme = this.getCurrentEffectiveTheme();

    if (currentEffectiveTheme === SidekiqQueueManagerUI.CONSTANTS.THEMES.LIGHT) {
      this.applyTheme(SidekiqQueueManagerUI.CONSTANTS.THEMES.DARK);
    } else {
      this.applyTheme(SidekiqQueueManagerUI.CONSTANTS.THEMES.LIGHT);
    }

    // Announce theme change for accessibility
    this.announceToScreenReader(`Switched to ${this.getCurrentEffectiveTheme()} mode`);
  }

  getCurrentEffectiveTheme() {
    if (this.state.currentTheme === SidekiqQueueManagerUI.CONSTANTS.THEMES.AUTO) {
      return this.getSystemTheme();
    }
    return this.state.currentTheme;
  }

  updateThemeToggleButton() {
    const themeToggle = this.elements.get('themeToggle');
    const lightIcon = themeToggle?.querySelector('.sqm-theme-icon-light');
    const darkIcon = themeToggle?.querySelector('.sqm-theme-icon-dark');

    if (!themeToggle || !lightIcon || !darkIcon) return;

    const currentEffectiveTheme = this.getCurrentEffectiveTheme();

    if (currentEffectiveTheme === SidekiqQueueManagerUI.CONSTANTS.THEMES.DARK) {
      lightIcon.classList.add('sqm-hidden');
      darkIcon.classList.remove('sqm-hidden');
      themeToggle.setAttribute('title', 'Switch to light mode');
    } else {
      lightIcon.classList.remove('sqm-hidden');
      darkIcon.classList.add('sqm-hidden');
      themeToggle.setAttribute('title', 'Switch to dark mode');
    }
  }

  cacheElements() {
    const selectors = {
      // Main UI elements
      refreshBtn: '#sqm-refresh-btn',
      refreshContainer: '.sqm-refresh-container',
      liveToggleBtn: '#sqm-live-toggle-btn',
      livePullContainer: '.sqm-live-pull-container',
      statusText: '.sqm-status-text',
      themeToggle: '#sqm-theme-toggle',

      // Action buttons
      pauseAllBtn: '#sqm-pause-all-btn',
      resumeAllBtn: '#sqm-resume-all-btn',

      // UI state elements
      loading: '#sqm-loading',
      error: '#sqm-error',
      content: '#sqm-content',
      errorMessage: '#sqm-error-message',

      // Statistics displays
      processed: '#sqm-processed',
      failed: '#sqm-failed',
      busy: '#sqm-busy',
      enqueued: '#sqm-enqueued',
      'scheduled-jobs': '#sqm-scheduled-jobs',
      'retry-jobs': '#sqm-retry-jobs',
      'dead-jobs': '#sqm-dead-jobs',
      totalQueues: '#sqm-total-queues',
      pausedQueues: '#sqm-paused-queues',
      totalJobs: '#sqm-total-jobs',

      // Tab counts
      'sqm-queues-count': '#sqm-queues-count',
      'sqm-scheduled-count': '#sqm-scheduled-count',
      'sqm-retries-count': '#sqm-retries-count',
      'sqm-dead-count': '#sqm-dead-count',

      // Table elements
      tableBody: '#sqm-table-body',
      table: '#sqm-queues-table',

      // Status elements
      refreshStatus: '#sqm-refresh-status',
      statusDot: '.sqm-status-dot',

      // Accessibility
      announcements: '#sqm-announcements'
    };

    // Cache all elements
    Object.entries(selectors).forEach(([key, selector]) => {
      this.elements.set(key, document.querySelector(selector));
    });
  }

  setupEventListeners() {
    // Manual refresh
    this.bindEvent('refreshBtn', 'click', () => this.manualRefresh());

    // Live pull toggle
    this.bindEvent('liveToggleBtn', 'click', () => this.toggleLivePull());

    // Theme toggle
    this.bindEvent('themeToggle', 'click', () => this.toggleTheme());

    // Bulk operations
    this.bindEvent('pauseAllBtn', 'click', () => this.pauseAllQueues());
    this.bindEvent('resumeAllBtn', 'click', () => this.resumeAllQueues());

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => this.destroy());
  }

  bindEvent(elementKey, event, handler) {
    const element = this.elements.get(elementKey);
    if (element) {
      element.addEventListener(event, handler);
      this.eventHandlers.set(`${elementKey}_${event}`, { element, event, handler });
    }
  }

  addEventListener(element, event, handler) {
    if (element) {
      element.addEventListener(event, handler);
      // Generate a unique key for tracking
      const key = `dynamic_${Date.now()}_${Math.random()}`;
      this.eventHandlers.set(key, { element, event, handler });
    }
  }

  initializeRefreshControl() {
    const liveToggle = this.elements.get('liveToggleBtn');
    const statusText = this.elements.get('statusText');

    if (liveToggle) {
      liveToggle.setAttribute('data-enabled', 'false');
    }

    if (statusText) {
      statusText.textContent = 'OFF';
    }

    this.updateLivePullUI();
    this.updateThemeToggleButton();
  }

  injectActionsMenuStyles() {
    if (document.getElementById('sqm-actions-menu-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'sqm-actions-menu-styles';
    styles.textContent = `
      .sqm-actions-menu {
        position: absolute;
        background: var(--sqm-popover);
        border: 1px solid var(--sqm-border);
        border-radius: var(--sqm-radius);
        box-shadow: var(--sqm-shadow-lg);
        z-index: var(--sqm-z-dropdown);
        min-width: 12rem;
        animation: sqm-dropdown-in 0.1s ease-out;
      }

      .sqm-actions-menu-content {
        padding: 0.25rem;
      }

      .sqm-actions-menu-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--sqm-border);
        background: var(--sqm-muted);
        margin: -0.25rem -0.25rem 0.25rem;
        border-radius: var(--sqm-radius) var(--sqm-radius) 0 0;
      }

      .sqm-actions-queue-name {
        font-weight: 600;
        color: var(--sqm-foreground);
        font-family: var(--sqm-font-mono);
        font-size: 0.75rem;
      }

      .sqm-actions-menu-close {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--sqm-muted-foreground);
        font-size: 1rem;
        padding: 0.25rem;
        border-radius: var(--sqm-radius-sm);
        transition: var(--sqm-transition);
        outline: none;
      }

      .sqm-actions-menu-close:hover {
        background: var(--sqm-accent);
        color: var(--sqm-accent-foreground);
      }

      .sqm-actions-menu-close:focus-visible {
        outline: 2px solid var(--sqm-ring);
        outline-offset: 2px;
      }

      .sqm-actions-menu-body {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .sqm-actions-menu-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: none;
        border: none;
        border-radius: var(--sqm-radius-sm);
        cursor: pointer;
        transition: var(--sqm-transition);
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--sqm-foreground);
        text-align: left;
        width: 100%;
        outline: none;
      }

      .sqm-actions-menu-item:hover {
        background: var(--sqm-accent);
      }

      .sqm-actions-menu-item:focus-visible {
        outline: 2px solid var(--sqm-ring);
        outline-offset: 2px;
      }

      .sqm-actions-danger:hover {
        background: hsl(from var(--sqm-destructive) h s l / 0.1);
        color: var(--sqm-destructive);
      }

      @keyframes sqm-dropdown-in {
        from {
          opacity: 0;
          transform: translateY(-0.25rem);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;

    document.head.appendChild(styles);
  }

  // ========================================
  // Accessibility Helpers
  // ========================================

  announceToScreenReader(message) {
    const announcements = this.elements.get('announcements');
    if (announcements) {
      announcements.textContent = message;
      // Clear after announcement to allow for future announcements
      setTimeout(() => {
        announcements.textContent = '';
      }, 1000);
    }
  }

  // ========================================
  // API Communication
  // ========================================

  async apiCall(endpoint, options = {}) {
    const url = `${this.gemConfig.mountPath}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      ...options
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async refreshQueues() {
    if (this.state.isRefreshing) {
      console.log('Refresh already in progress, skipping');
      return;
    }

    this.state.isRefreshing = true;
    this.showLoading();

    try {
      const response = await this.apiCall(SidekiqQueueManagerUI.CONSTANTS.API_ENDPOINTS.metrics);

      if (response.success !== false) {
        this.updateUI(response.data || response);
        this.state.retryCount = 0;
        this.state.lastUpdate = new Date();
        this.showContent();
      } else {
        throw new Error(response.message || 'Failed to fetch metrics');
      }
    } catch (error) {
      console.error('Failed to refresh queues:', error);
      this.handleError(error);
    } finally {
      this.state.isRefreshing = false;
    }
  }

  async loadInitialData() {
    // Use initial data if available, otherwise fetch
    if (window.SidekiqQueueManagerInitialData) {
      this.updateUI(window.SidekiqQueueManagerInitialData);
      this.showContent();
      // Clear the initial data
      delete window.SidekiqQueueManagerInitialData;
    } else {
      await this.refreshQueues();
    }
  }

  // ========================================
  // UI Updates
  // ========================================

  updateUI(data) {
    if (data.global_stats) {
      this.updateGlobalStats(data.global_stats);
    }

    if (data.queues) {
      this.updateQueuesTable(data.queues);
    }

    // Update tab counts
    this.updateTabCounts(data);

    this.updateTimestamp(data.timestamp);
  }

  updateGlobalStats(stats) {
    const statsData = {
      processed: stats.processed || 0,
      failed: stats.failed || 0,
      busy: stats.busy || 0,
      enqueued: stats.enqueued || 0,
      'scheduled-jobs': stats.scheduled_size || 0,
      'retry-jobs': stats.retry_size || 0,
      'dead-jobs': stats.dead_size || 0
    };

    Object.entries(statsData).forEach(([key, rawValue]) => {
      const element = this.elements.get(key);
      if (element) {
        const formattedValue = this.formatLargeNumber(rawValue);
        element.textContent = formattedValue;

        // Add data-length attribute for responsive font sizing
        const valueLength = formattedValue.replace(/,/g, '').length;
        if (valueLength >= 15) {
          element.setAttribute('data-length', 'long');
        } else if (valueLength >= 8) {
          element.setAttribute('data-length', valueLength.toString());
        } else {
          element.removeAttribute('data-length');
        }
      }
    });
  }

  // Format large numbers with appropriate abbreviations and locale formatting
  formatLargeNumber(num) {
    const number = parseInt(num) || 0;

    // Handle zero and negative numbers
    if (number === 0) return '0';
    if (number < 0) return number.toLocaleString();

    // For very large numbers, use abbreviations
    if (number >= 1000000000000) { // Trillion
      return (number / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
    } else if (number >= 1000000000) { // Billion
      return (number / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    } else if (number >= 1000000) { // Million
      return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (number >= 100000) { // For numbers 100k+, use abbreviation
      return (number / 1000).toFixed(0) + 'K';
    } else {
      // For smaller numbers, use locale formatting with commas
      return number.toLocaleString();
    }
  }

  updateQueuesTable(queues) {
    const tbody = this.elements.get('tableBody');
    if (!tbody) return;

    const queueArray = Object.values(queues);
    const totalQueues = queueArray.length;
    const pausedQueues = queueArray.filter(q => q.paused).length;

    // Update counters
    this.updateElement('totalQueues', totalQueues);
    this.updateElement('pausedQueues', pausedQueues);
    this.updateElement('totalJobs', queueArray.reduce((sum, q) => sum + (q.size || 0), 0));

    // Update table rows
    tbody.innerHTML = queueArray.map(queue => this.renderQueueRow(queue)).join('');

    // Re-attach event listeners for action buttons
    this.attachQueueActionListeners();
  }

  renderQueueRow(queue) {
    const statusClass = queue.paused ? 'sqm-status-paused' :
                       queue.blocked ? 'sqm-status-blocked' : 'sqm-status-active';
    const priorityIcon = this.getPriorityIcon(queue.priority);
    const criticalBadge = queue.critical ? '<span class="sqm-critical-badge">CRITICAL</span>' : '';
    const blockedBadge = queue.blocked ? '<span class="sqm-blocked-badge">BLOCKED</span>' : '';
    const limitInfo = this.renderLimitInfo(queue);

    return `
      <tr class="sqm-queue-row ${statusClass}" data-queue="${queue.name}">
        <td class="sqm-col-name">
          ${priorityIcon}
          <span class="sqm-queue-name">${queue.name}</span>
          ${criticalBadge}
          ${blockedBadge}
          ${limitInfo}
        </td>
        <td class="sqm-col-size">${queue.size?.toLocaleString() || '0'}</td>
        <td class="sqm-col-workers">${this.renderWorkerLimits(queue)}</td>
        <td class="sqm-col-latency">${this.formatLatency(queue.latency)}</td>
        <td class="sqm-col-actions">
          ${this.renderQueueActions(queue)}
        </td>
      </tr>
    `;
  }

  renderWorkerLimits(queue) {
    // Format exactly like the existing implementation
    const busy = queue.busy || 0;
    const limit = queue.limit;
    const processLimit = queue.process_limit;
    const isBlocked = queue.blocked;
    const isPaused = queue.paused;

    let html = `<div class="sqm-worker-info">`;
    html += `<div class="sqm-worker-busy">${busy} busy`;

    if (limit && limit > 0) {
      html += ` / ${limit} max`;
    } else {
      html += ' / ∞';
    }

    // Add status indicators
    if (isBlocked) {
      html += ` <span class="sqm-status-indicator" title="Queue is blocked">🚫</span>`;
    } else if (isPaused) {
      html += ` <span class="sqm-status-indicator" title="Queue is paused">⏸️</span>`;
    }

    html += `</div>`;

    if (processLimit && processLimit > 0) {
      html += `<div class="sqm-process-limit"><small>(${processLimit} per process)</small></div>`;
    }

    html += `</div>`;

    return html;
  }

  renderLimitInfo(queue) {
    const limits = [];

    if (queue.limit && queue.limit > 0) {
      limits.push(`Q:${queue.limit}`);
    }

    if (queue.process_limit && queue.process_limit > 0) {
      limits.push(`P:${queue.process_limit}`);
    }

    if (limits.length > 0) {
      return `<span class="sqm-limits-info" title="Queue limit: ${queue.limit || 'none'}, Process limit: ${queue.process_limit || 'none'}">[${limits.join(', ')}]</span>`;
    }

    return '';
  }

  renderQueueActions(queue) {
    const isPaused = queue.paused;
    const isCritical = queue.critical;

    if (isPaused) {
      return `
        <button class="sqm-btn sqm-btn-success sqm-btn-sm sqm-action-btn"
                data-action="resume" data-queue="${queue.name}">
          Resume
        </button>
        <button class="sqm-btn sqm-btn-secondary sqm-btn-sm sqm-more-btn"
                data-queue="${queue.name}" title="More actions">⋯</button>
      `;
    } else {
      const pauseBtn = isCritical ?
        `<button class="sqm-btn sqm-btn-warning sqm-btn-sm sqm-action-btn" disabled title="Critical queue - cannot pause">
          Pause
        </button>` :
        `<button class="sqm-btn sqm-btn-warning sqm-btn-sm sqm-action-btn"
                data-action="pause" data-queue="${queue.name}">
          Pause
        </button>`;

      return `
        ${pauseBtn}
        <button class="sqm-btn sqm-btn-secondary sqm-btn-sm sqm-more-btn"
                data-queue="${queue.name}" title="More actions">⋯</button>
      `;
    }
  }

  attachQueueActionListeners() {
    // Action buttons (pause/resume)
    document.querySelectorAll('.sqm-action-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleQueueAction(e));
    });

    // More actions buttons (for advanced functionality)
    document.querySelectorAll('.sqm-more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleMoreActions(e));
    });
  }

  // ========================================
  // Queue Operations
  // ========================================

  async handleQueueAction(event) {
    const button = event.target;
    const action = button.getAttribute('data-action');
    const queueName = button.getAttribute('data-queue');

    if (!action || !queueName) return;

    try {
      button.disabled = true;
      button.textContent = action === 'pause' ? 'Pausing...' : 'Resuming...';

      const endpoint = SidekiqQueueManagerUI.CONSTANTS.API_ENDPOINTS.queueAction(queueName, action);
      const response = await this.apiCall(endpoint, { method: 'POST' });

      if (response.success) {
        this.showNotification(`Queue '${queueName}' ${action}d successfully`, 'success');
        this.announceToScreenReader(`Queue ${queueName} ${action}d`);
        await this.refreshQueues();
      } else {
        throw new Error(response.message || `Failed to ${action} queue`);
      }
    } catch (error) {
      this.showNotification(`Failed to ${action} queue: ${error.message}`, 'error');
      console.error(`Failed to ${action} queue:`, error);
    }
  }

  async handleMoreActions(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.target;
    const queueName = button.getAttribute('data-queue');

    if (!queueName) return;

    // Close any existing menu first
    this.closeActionsMenu();

    // Create and show actions menu
    const menu = this.createActionsMenu(queueName);
    const rect = button.getBoundingClientRect();

    // Position menu below button
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(menu);

    // Auto-close menu after 10 seconds
    setTimeout(() => this.closeActionsMenu(), 10000);

    // Store reference for cleanup
    this.currentActionsMenu = menu;

    // Setup menu event handlers
    this.setupActionsMenuEvents(menu, queueName);
  }

  createActionsMenu(queueName) {
    const menu = document.createElement('div');
    menu.className = 'sqm-actions-menu';
    menu.innerHTML = this.generateActionsMenuContent(queueName);
    return menu;
  }

  generateActionsMenuContent(queueName) {
    return `
      <div class="sqm-actions-menu-content">
        <div class="sqm-actions-menu-header">
          <span class="sqm-actions-queue-name">${queueName}</span>
          <button class="sqm-actions-menu-close" aria-label="Close menu">×</button>
        </div>
        <div class="sqm-actions-menu-body">
          <button class="sqm-actions-menu-item" data-action="view_jobs" data-queue="${queueName}">
            👀 View Jobs
          </button>
          <button class="sqm-actions-menu-item" data-action="set_limit" data-queue="${queueName}">
            🔢 Set Queue Limit
          </button>
          <button class="sqm-actions-menu-item" data-action="remove_limit" data-queue="${queueName}">
            ♾️ Remove Limit
          </button>
          <button class="sqm-actions-menu-item" data-action="set_process_limit" data-queue="${queueName}">
            ⚙️ Set Process Limit
          </button>
          <button class="sqm-actions-menu-item" data-action="remove_process_limit" data-queue="${queueName}">
            🔓 Remove Process Limit
          </button>
          <button class="sqm-actions-menu-item" data-action="block" data-queue="${queueName}">
            🚫 Block Queue
          </button>
          <button class="sqm-actions-menu-item" data-action="unblock" data-queue="${queueName}">
            ✅ Unblock Queue
          </button>
          <button class="sqm-actions-menu-item sqm-actions-danger" data-action="clear" data-queue="${queueName}">
            🗑️ Clear All Jobs
          </button>
          <button class="sqm-actions-menu-item sqm-actions-danger" data-action="delete_queue" data-queue="${queueName}">
            ❌ Delete Queue
          </button>
        </div>
      </div>
    `;
  }

  setupActionsMenuEvents(menu, queueName) {
    // Close button
    const closeBtn = menu.querySelector('.sqm-actions-menu-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeActionsMenu());
    }

    // Menu items
    const menuItems = menu.querySelectorAll('.sqm-actions-menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', async (e) => {
        const action = e.target.getAttribute('data-action');
        const queue = e.target.getAttribute('data-queue');

        this.closeActionsMenu();

        try {
          await this.executeQueueAction(action, queue);
        } catch (error) {
          this.showNotification(`Failed to execute ${action}: ${error.message}`, 'error');
        }
      });
    });

    // Close when clicking outside
    const outsideClickHandler = (e) => {
      if (!menu.contains(e.target)) {
        this.closeActionsMenu();
        document.removeEventListener('click', outsideClickHandler);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', outsideClickHandler);
    }, 100);

    // Close on escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeActionsMenu();
        document.removeEventListener('keydown', escapeHandler);
      }
    };

    document.addEventListener('keydown', escapeHandler);

    // Store handlers for cleanup
    this.currentMenuCloseHandler = () => {
      document.removeEventListener('click', outsideClickHandler);
      document.removeEventListener('keydown', escapeHandler);
    };
  }

  closeActionsMenu() {
    if (this.currentActionsMenu) {
      this.currentActionsMenu.remove();
      this.currentActionsMenu = null;
    }

    if (this.currentMenuCloseHandler) {
      this.currentMenuCloseHandler();
      this.currentMenuCloseHandler = null;
    }
  }

  // ========================================
  // Advanced Queue Actions
  // ========================================

  async executeQueueAction(action, queueName) {
    switch (action) {
      case 'view_jobs':
        return this.viewQueueJobs(queueName);
      case 'set_limit':
        return this.setQueueLimit(queueName);
      case 'remove_limit':
        return this.removeQueueLimit(queueName);
      case 'set_process_limit':
        return this.setProcessLimit(queueName);
      case 'remove_process_limit':
        return this.removeProcessLimit(queueName);
      case 'block':
        return this.blockQueue(queueName);
      case 'unblock':
        return this.unblockQueue(queueName);
      case 'clear':
        return this.clearQueue(queueName);
      case 'delete_queue':
        return this.deleteQueue(queueName);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async viewQueueJobs(queueName) {
    try {
      const response = await this.apiCall(`/queues/${queueName}/jobs?page=1&per_page=10`);

      if (response.success !== false) {
        this.showJobsModal(queueName, response.data || response);
      } else {
        throw new Error(response.message || 'Failed to fetch jobs');
      }
    } catch (error) {
      this.showNotification(`Failed to load jobs for ${queueName}: ${error.message}`, 'error');
    }
  }

  showJobsModal(queueName, jobsData) {
    const modalHtml = `
      <div class="sqm-custom-modal-content sqm-jobs-modal">
        <div class="sqm-custom-modal-header">
          <h3>Jobs in "${queueName}" Queue</h3>
          <button class="sqm-custom-modal-close" aria-label="Close modal">&times;</button>
        </div>
        <div class="sqm-custom-modal-body">
          ${this.generateJobsListContent(jobsData)}
        </div>
        <div class="sqm-custom-modal-footer">
          <button class="sqm-btn-modal sqm-btn-modal-secondary sqm-modal-close-btn">Close</button>
        </div>
      </div>
    `;

    const modal = this.createCustomModal(modalHtml);

    // Setup close handlers
    const closeButtons = modal.querySelectorAll('.sqm-custom-modal-close, .sqm-modal-close-btn');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });

    // Setup job modal handlers (delete and pagination)
    this.setupJobModalHandlers(modal, queueName);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  setupJobModalHandlers(modal, queueName) {
    // Setup delete job handlers
    const deleteButtons = modal.querySelectorAll('.sqm-job-delete');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const jobId = e.target.getAttribute('data-job-id');
        const deleteButton = e.target;

        // Add loading state
        const originalContent = deleteButton.innerHTML;
        deleteButton.innerHTML = '⏳';
        deleteButton.disabled = true;
        deleteButton.style.opacity = '0.6';

        try {
          if (await this.deleteJob(queueName, jobId)) {
            // Show success feedback
            deleteButton.innerHTML = '✅';
            deleteButton.style.opacity = '1';
            deleteButton.classList.add('success');

            // Refresh the jobs list after a short delay
            setTimeout(async () => {
              const modalBody = modal.querySelector('.sqm-custom-modal-body');
              modalBody.innerHTML = '<div style="text-align: center; padding: 2rem;">🔄 Refreshing jobs...</div>';

              try {
                const response = await this.apiCall(`/queues/${queueName}/jobs?page=1&per_page=10`);
                if (response.success !== false) {
                  modalBody.innerHTML = this.generateJobsListContent(response.data || response);
                  this.setupJobModalHandlers(modal, queueName); // Re-setup handlers for new content
                }
              } catch (error) {
                modalBody.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--sqm-destructive);">❌ Failed to refresh jobs</div>';
              }
            }, 800);
          } else {
            // Reset button if deletion failed
            deleteButton.innerHTML = originalContent;
            deleteButton.disabled = false;
            deleteButton.style.opacity = '1';
          }
        } catch (error) {
          // Reset button on error
          deleteButton.innerHTML = originalContent;
          deleteButton.disabled = false;
          deleteButton.style.opacity = '1';
        }
      });
    });

    // Setup pagination handlers
    const paginationBtns = modal.querySelectorAll('.sqm-pagination-btn');
    paginationBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const page = e.target.getAttribute('data-page');
        const response = await this.apiCall(`/queues/${queueName}/jobs?page=${page}&per_page=10`);
        if (response.success !== false) {
          // Update modal content with new page
          const bodyContent = modal.querySelector('.sqm-custom-modal-body');
          bodyContent.innerHTML = this.generateJobsListContent(response.data || response);
          this.setupJobModalHandlers(modal, queueName); // Re-setup handlers for new page
        }
      });
    });
  }

  generateJobsListContent(jobsData) {
    if (!jobsData.jobs || jobsData.jobs.length === 0) {
      return `
        <div style="text-align: center; padding: 3rem 2rem; color: var(--sqm-muted-foreground);">
          <svg style="width: 3rem; height: 3rem; margin-bottom: 1rem; opacity: 0.5;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.664V8.706c0 1.081.768 2.015 1.837 2.175a48.114 48.114 0 003.413.387m0 0a48.108 48.108 0 00-3.413-.387m0 0c-.07.003-.141.005-.213.008A4.5 4.5 0 009 10.5V9m4.5-1.206V7.5a2.25 2.25 0 00-4.5 0v1.294"/>
          </svg>
          <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">No Jobs Found</h3>
          <p style="margin-bottom: 0.5rem;">This queue currently has no jobs.</p>
          <p style="font-size: 0.75rem; opacity: 0.8;">Queue size: ${jobsData.size || 0} jobs</p>
        </div>
      `;
    }

    const jobsHtml = jobsData.jobs.map(job => {
      // Determine job priority for styling
      const priority = this.getJobPriority(job);
      const status = this.getJobStatus(job);
      const formattedArgs = this.formatJobArgs(job.args);

      return `
        <div class="sqm-job-item">
          <div class="sqm-job-info">
            <div class="sqm-job-header">
              <div class="sqm-job-class">${job.class || 'Unknown Job'}</div>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                ${status ? `<span class="sqm-job-status ${status.toLowerCase()}">${status}</span>` : ''}
                <span class="sqm-job-priority ${priority.toLowerCase()}">${priority}</span>
              </div>
            </div>

            <div class="sqm-job-args-container">
              <div class="sqm-job-args-label">Arguments</div>
              <div class="sqm-job-args">${formattedArgs}</div>
            </div>

                         <div class="sqm-job-meta">
               <div class="sqm-job-meta-item">
                 <span class="sqm-job-meta-label">Job ID</span>
                 <span class="sqm-job-meta-value job-id">${job.jid || 'N/A'}</span>
               </div>
              <div class="sqm-job-meta-item">
                <span class="sqm-job-meta-label">Created</span>
                <span class="sqm-job-meta-value">${this.formatJobDate(job.created_at)}</span>
              </div>
              <div class="sqm-job-meta-item">
                <span class="sqm-job-meta-label">Enqueued</span>
                <span class="sqm-job-meta-value">${this.formatJobDate(job.enqueued_at)}</span>
              </div>
              <div class="sqm-job-meta-item">
                <span class="sqm-job-meta-label">Queue</span>
                <span class="sqm-job-meta-value">${job.queue || 'default'}</span>
              </div>
              <div class="sqm-job-meta-item">
                <span class="sqm-job-meta-label">Retrying</span>
                <span class="sqm-job-meta-value">${job.retry_count || 0} times</span>
              </div>
              <div class="sqm-job-meta-item">
                <span class="sqm-job-meta-label">At</span>
                <span class="sqm-job-meta-value">${job.at ? this.formatJobDate(job.at) : 'Now'}</span>
              </div>
            </div>
          </div>
          <div class="sqm-job-actions">
            <button class="sqm-job-delete" data-job-id="${job.jid}" title="Delete this job">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    const paginationHtml = this.generatePaginationHtml(jobsData.pagination);

    return `
      <div class="sqm-job-list">
        ${jobsHtml}
      </div>
      ${paginationHtml}
    `;
  }

  // Helper methods for enhanced job display
  getJobPriority(job) {
    // Determine priority based on job class name or other factors
    const className = (job.class || '').toLowerCase();
    if (className.includes('urgent') || className.includes('critical') || className.includes('high')) {
      return 'HIGH';
    } else if (className.includes('low') || className.includes('background')) {
      return 'LOW';
    }
    return 'NORMAL';
  }

  getJobStatus(job) {
    // Determine status based on job properties
    if (job.retry_count > 0) {
      return 'RETRY';
    } else if (job.failed_at) {
      return 'FAILED';
    }
    return 'ENQUEUED';
  }

  formatJobArgs(args) {
    if (!args) return 'No arguments';

    try {
      // If args is already a string, try to parse it
      let parsedArgs = args;
      if (typeof args === 'string') {
        try {
          parsedArgs = JSON.parse(args);
        } catch (e) {
          return args; // Return as-is if not valid JSON
        }
      }

      // Pretty print the JSON with proper indentation
      return JSON.stringify(parsedArgs, null, 2);
    } catch (e) {
      return String(args || 'No arguments');
    }
  }

  formatJobDate(dateString) {
    if (!dateString) return 'Unknown';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      // Format as relative time if recent, otherwise full date
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {
      return dateString;
    }
  }

  generatePaginationHtml(pagination) {
    if (!pagination || pagination.total_pages <= 1) return '';

    const prevDisabled = pagination.current_page <= 1;
    const nextDisabled = pagination.current_page >= pagination.total_pages;

    return `
      <div class="sqm-pagination">
        <div class="sqm-pagination-info">
          Page ${pagination.current_page} of ${pagination.total_pages}
          (${pagination.total_jobs || pagination.total_count} jobs)
        </div>
        <div class="sqm-pagination-controls">
          <button class="sqm-pagination-btn"
                  data-page="${pagination.current_page - 1}"
                  ${prevDisabled ? 'disabled' : ''}>
            Previous
          </button>
          <span class="sqm-pagination-current">
            ${pagination.current_page}
          </span>
          <button class="sqm-pagination-btn"
                  data-page="${pagination.current_page + 1}"
                  ${nextDisabled ? 'disabled' : ''}>
            Next
          </button>
        </div>
      </div>
    `;
  }

  async deleteJob(queueName, jobId) {
    const confirmed = await this.showCustomConfirm(
      'Delete Job',
      `Delete job "${jobId}" from the "${queueName}" queue?`,
      'danger',
      `Job ID: ${jobId}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return false;

    try {
      const response = await this.apiCall(`/queues/${queueName}/delete_job`, {
        method: 'DELETE',
        body: JSON.stringify({ job_id: jobId })
      });

      if (response.success) {
        this.showNotification('Job deleted successfully', 'success');
        await this.refreshQueues();
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete job');
      }
    } catch (error) {
      this.showNotification(`Failed to delete job: ${error.message}`, 'error');
      return false;
    }
  }

  async setQueueLimit(queueName) {
    const limit = await this.showCustomPrompt(
      'Set Queue Limit',
      `Enter the maximum number of jobs that can be enqueued in the "${queueName}" queue:`,
      '100',
      'Set to 0 for unlimited. This helps prevent queues from growing too large.',
      'number'
    );

    if (limit === null) return;

    const numLimit = parseInt(limit, 10);
    if (isNaN(numLimit) || numLimit < 0) {
      this.showNotification('Please enter a valid number (0 or greater)', 'error');
      return;
    }

    try {
      const response = await this.apiCall(`/queues/${queueName}/set_limit`, {
        method: 'POST',
        body: JSON.stringify({ limit: numLimit })
      });

      if (response.success) {
        this.showNotification(`Queue limit set to ${numLimit === 0 ? 'unlimited' : numLimit}`, 'success');
        await this.refreshQueues();
      } else {
        throw new Error(response.message || 'Failed to set queue limit');
      }
    } catch (error) {
      this.showNotification(`Failed to set queue limit: ${error.message}`, 'error');
    }
  }

  async removeQueueLimit(queueName) {
    const confirmed = await this.showCustomConfirm(
      'Remove Queue Limit',
      `Remove the limit from queue "${queueName}"?`,
      'info',
      'This will allow unlimited jobs to be enqueued in this queue.'
    );

    if (!confirmed) return;

    try {
      const response = await this.apiCall(`/queues/${queueName}/remove_limit`, { method: 'DELETE' });

      if (response.success) {
        this.showNotification('Queue limit removed', 'success');
        await this.refreshQueues();
      } else {
        throw new Error(response.message || 'Failed to remove queue limit');
      }
    } catch (error) {
      this.showNotification(`Failed to remove queue limit: ${error.message}`, 'error');
    }
  }

  async setProcessLimit(queueName) {
    const limit = await this.showCustomPrompt(
      'Set Process Limit',
      `Enter the maximum number of processes that can work on the "${queueName}" queue:`,
      '5',
      'This limits how many Sidekiq processes can process jobs from this queue simultaneously.',
      'number'
    );

    if (limit === null) return;

    const numLimit = parseInt(limit, 10);
    if (isNaN(numLimit) || numLimit < 1) {
      this.showNotification('Please enter a valid number (1 or greater)', 'error');
      return;
    }

    try {
      const response = await this.apiCall(`/queues/${queueName}/set_process_limit`, {
        method: 'POST',
        body: JSON.stringify({ limit: numLimit })
      });

      if (response.success) {
        this.showNotification(`Process limit set to ${numLimit}`, 'success');
        await this.refreshQueues();
      } else {
        throw new Error(response.message || 'Failed to set process limit');
      }
    } catch (error) {
      this.showNotification(`Failed to set process limit: ${error.message}`, 'error');
    }
  }

  async removeProcessLimit(queueName) {
    const confirmed = await this.showCustomConfirm(
      'Remove Process Limit',
      `Remove the process limit from queue "${queueName}"?`,
      'info',
      'This will allow any number of Sidekiq processes to work on this queue.'
    );

    if (!confirmed) return;

    try {
      const response = await this.apiCall(`/queues/${queueName}/remove_process_limit`, { method: 'DELETE' });

      if (response.success) {
        this.showNotification('Process limit removed', 'success');
        await this.refreshQueues();
      } else {
        throw new Error(response.message || 'Failed to remove process limit');
      }
    } catch (error) {
      this.showNotification(`Failed to remove process limit: ${error.message}`, 'error');
    }
  }

  async blockQueue(queueName) {
    const confirmed = await this.showCustomConfirm(
      'Block Queue',
      `Block the "${queueName}" queue?`,
      'warning',
      'Blocked queues cannot accept new jobs. Existing jobs will remain but cannot be processed until unblocked.'
    );

    if (!confirmed) return;

    try {
      const response = await this.apiCall(`/queues/${queueName}/block`, { method: 'POST' });

      if (response.success) {
        this.showNotification(`Queue "${queueName}" blocked`, 'success');
        await this.refreshQueues();
      } else {
        throw new Error(response.message || 'Failed to block queue');
      }
    } catch (error) {
      this.showNotification(`Failed to block queue: ${error.message}`, 'error');
    }
  }

  async unblockQueue(queueName) {
    const confirmed = await this.showCustomConfirm(
      'Unblock Queue',
      `Unblock the "${queueName}" queue?`,
      'info',
      'This will allow the queue to accept and process jobs normally again.'
    );

    if (!confirmed) return;

    try {
      const response = await this.apiCall(`/queues/${queueName}/unblock`, { method: 'POST' });

      if (response.success) {
        this.showNotification(`Queue "${queueName}" unblocked`, 'success');
        await this.refreshQueues();
      } else {
        throw new Error(response.message || 'Failed to unblock queue');
      }
    } catch (error) {
      this.showNotification(`Failed to unblock queue: ${error.message}`, 'error');
    }
  }

  async clearQueue(queueName) {
    const confirmed = await this.showCustomConfirm(
      'Clear All Jobs',
      `Are you sure you want to delete ALL jobs in the "${queueName}" queue?`,
      'danger',
      'This action cannot be undone. All pending jobs in this queue will be permanently deleted.'
    );

    if (!confirmed) return;

    // Double confirmation for destructive action
    const doubleConfirmed = await this.showCustomConfirm(
      'Final Confirmation',
      'This will permanently delete all jobs. Are you absolutely sure?',
      'danger',
      'Type YES in the next prompt to confirm.'
    );

    if (!doubleConfirmed) return;

    const confirmation = await this.showCustomPrompt(
      'Final Confirmation',
      'Type "YES" to confirm deletion of all jobs:',
      'YES',
      'This is your last chance to cancel.'
    );

    if (confirmation !== 'YES') {
      this.showNotification('Queue clear cancelled', 'info');
      return;
    }

    try {
      const response = await this.apiCall(`/queues/${queueName}/clear`, { method: 'POST' });

      if (response.success) {
        this.showNotification(`All jobs cleared from "${queueName}"`, 'success');
        await this.refreshQueues();
      } else {
        throw new Error(response.message || 'Failed to clear queue');
      }
    } catch (error) {
      this.showNotification(`Failed to clear queue: ${error.message}`, 'error');
    }
  }

  async deleteQueue(queueName) {
    const confirmed = await this.showCustomConfirm(
      'Delete Queue Completely',
      `Are you sure you want to PERMANENTLY DELETE the "${queueName}" queue?`,
      'danger',
      'This action will remove the queue completely from Sidekiq, along with all its jobs. This cannot be undone.'
    );

    if (!confirmed) return;

    // Triple confirmation for queue deletion (more destructive than clearing)
    const doubleConfirmed = await this.showCustomConfirm(
      'Final Warning',
      `This will PERMANENTLY DELETE the entire "${queueName}" queue!`,
      'danger',
      'The queue will be completely removed from Sidekiq and cannot be recovered.'
    );

    if (!doubleConfirmed) return;

    const confirmation = await this.showCustomPrompt(
      'Type Queue Name to Confirm',
      `Type "${queueName}" exactly to confirm queue deletion:`,
      queueName,
      'This is your last chance to cancel this destructive operation.'
    );

    if (confirmation !== queueName) {
      this.showNotification('Queue deletion cancelled', 'info');
      return;
    }

    try {
      const response = await this.apiCall(`/queues/${queueName}`, { method: 'DELETE' });

      if (response.success) {
        this.showNotification(`Queue "${queueName}" deleted permanently`, 'success');
        await this.refreshQueues();
      } else {
        throw new Error(response.message || 'Failed to delete queue');
      }
    } catch (error) {
      this.showNotification(`Failed to delete queue: ${error.message}`, 'error');
    }
  }

  async pauseAllQueues() {
    if (!await this.showCustomConfirm('Pause All Queues', 'Are you sure you want to pause all non-critical queues?')) {
      return;
    }

    try {
      const response = await this.apiCall(SidekiqQueueManagerUI.CONSTANTS.API_ENDPOINTS.pauseAll, {
        method: 'POST'
      });

      if (response.success) {
        this.showNotification('Bulk pause operation completed', 'success');
        this.announceToScreenReader('All non-critical queues paused');
        await this.refreshQueues();
      } else {
        throw new Error(response.message || 'Bulk pause failed');
      }
    } catch (error) {
      this.showNotification(`Bulk pause failed: ${error.message}`, 'error');
      console.error('Bulk pause failed:', error);
    }
  }

  async resumeAllQueues() {
    if (!await this.showCustomConfirm('Resume All Queues', 'Are you sure you want to resume all paused queues?')) {
      return;
    }

    try {
      const response = await this.apiCall(SidekiqQueueManagerUI.CONSTANTS.API_ENDPOINTS.resumeAll, {
        method: 'POST'
      });

      if (response.success) {
        this.showNotification('Bulk resume operation completed', 'success');
        this.announceToScreenReader('All paused queues resumed');
        await this.refreshQueues();
      } else {
        throw new Error(response.message || 'Bulk resume failed');
      }
    } catch (error) {
      this.showNotification(`Bulk resume failed: ${error.message}`, 'error');
      console.error('Bulk resume failed:', error);
    }
  }

  // ========================================
  // Live Pull Management
  // ========================================

  toggleLivePull() {
    this.state.livePullEnabled = !this.state.livePullEnabled;

    if (this.state.livePullEnabled) {
      this.startLivePull();
    } else {
      this.stopLivePull();
    }

    this.updateLivePullUI();
    this.announceToScreenReader(`Live pull ${this.state.livePullEnabled ? 'enabled' : 'disabled'}`);
  }

  startLivePull() {
    if (this.state.refreshInterval) {
      clearInterval(this.state.refreshInterval);
    }

    this.state.refreshInterval = setInterval(() => {
      this.refreshQueues();
    }, this.gemConfig.refreshInterval);

    console.log(`🔴 Live Pull started with ${this.gemConfig.refreshInterval}ms interval`);
  }

  stopLivePull() {
    if (this.state.refreshInterval) {
      clearInterval(this.state.refreshInterval);
      this.state.refreshInterval = null;
    }

    console.log('⏹️ Live Pull stopped');
  }

  updateLivePullUI() {
    const toggleBtn = this.elements.get('liveToggleBtn');
    const statusText = this.elements.get('statusText');
    const statusDot = this.elements.get('statusDot');

    if (toggleBtn) {
      toggleBtn.setAttribute('data-enabled', this.state.livePullEnabled.toString());
    }

    if (statusText) {
      statusText.textContent = this.state.livePullEnabled ? 'ON' : 'OFF';
    }

    if (statusDot) {
      statusDot.classList.toggle('active', this.state.livePullEnabled);
    }
  }

  // ========================================
  // Manual Refresh
  // ========================================

  async manualRefresh() {
    const refreshContainer = this.elements.get('refreshContainer');

    if (refreshContainer) {
      refreshContainer.dataset.loading = 'true';
    }

    try {
      await this.refreshQueues();
      this.announceToScreenReader('Queue data refreshed');
    } finally {
      if (refreshContainer) {
        refreshContainer.dataset.loading = 'false';
      }
    }
  }

  // ========================================
  // UI State Management
  // ========================================

  showLoading() {
    this.elements.get('loading')?.classList.remove('sqm-hidden');
    this.elements.get('error')?.classList.add('sqm-hidden');
    this.elements.get('content')?.classList.add('sqm-hidden');
  }

  showContent() {
    this.elements.get('loading')?.classList.add('sqm-hidden');
    this.elements.get('error')?.classList.add('sqm-hidden');
    this.elements.get('content')?.classList.remove('sqm-hidden');
  }

  showError(message) {
    const errorElement = this.elements.get('error');
    const errorMessage = this.elements.get('errorMessage');

    if (errorMessage) {
      errorMessage.textContent = message;
    }

    this.elements.get('loading')?.classList.add('sqm-hidden');
    errorElement?.classList.remove('sqm-hidden');
    this.elements.get('content')?.classList.add('sqm-hidden');
  }

  // ========================================
  // Custom Modal System
  // ========================================

  async showCustomPrompt(title, message, placeholder = '', helpText = '', inputType = 'text') {
    return new Promise((resolve) => {
      const modalHtml = this.generatePromptContent(title, message, placeholder, helpText, inputType);
      const modal = this.createCustomModal(modalHtml);

      const input = modal.querySelector('.sqm-prompt-input');
      const confirmBtn = modal.querySelector('.sqm-btn-confirm');
      const cancelBtn = modal.querySelector('.sqm-btn-cancel');
      const closeBtn = modal.querySelector('.sqm-custom-modal-close');

      const cleanup = () => {
        modal.remove();
      };

      const confirm = () => {
        const value = input.value.trim();
        cleanup();
        resolve(value || null);
      };

      const cancel = () => {
        cleanup();
        resolve(null);
      };

      // Event listeners
      confirmBtn.addEventListener('click', confirm);
      cancelBtn.addEventListener('click', cancel);
      closeBtn.addEventListener('click', cancel);

      // Focus input and handle Enter/Escape
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      });

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) cancel();
      });
    });
  }

  async showCustomConfirm(title, message, type = 'warning', details = '') {
    return new Promise((resolve) => {
      const modalHtml = this.generateConfirmContent(title, message, type, details);
      const modal = this.createCustomModal(modalHtml);

      const confirmBtn = modal.querySelector('.sqm-btn-confirm');
      const cancelBtn = modal.querySelector('.sqm-btn-cancel');
      const closeBtn = modal.querySelector('.sqm-custom-modal-close');

      const cleanup = () => {
        modal.remove();
      };

      const confirm = () => {
        cleanup();
        resolve(true);
      };

      const cancel = () => {
        cleanup();
        resolve(false);
      };

      // Event listeners
      confirmBtn.addEventListener('click', confirm);
      cancelBtn.addEventListener('click', cancel);
      closeBtn.addEventListener('click', cancel);

      // Handle Enter/Escape
      document.addEventListener('keydown', function keyHandler(e) {
        if (e.key === 'Enter') {
          document.removeEventListener('keydown', keyHandler);
          confirm();
        } else if (e.key === 'Escape') {
          document.removeEventListener('keydown', keyHandler);
          cancel();
        }
      });

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) cancel();
      });
    });
  }

  createCustomModal(content) {
    const modal = document.createElement('div');
    modal.className = 'sqm-custom-modal';
    modal.innerHTML = `
      <div class="sqm-custom-modal-backdrop"></div>
      ${content}
    `;

    document.body.appendChild(modal);

    // Focus management for accessibility
    setTimeout(() => {
      const focusableElement = modal.querySelector('input, button:not(.sqm-custom-modal-close)');
      if (focusableElement) {
        focusableElement.focus();
      }
    }, 150);

    return modal;
  }

  generatePromptContent(title, message, placeholder, helpText, inputType) {
    return `
      <div class="sqm-custom-modal-content">
        <div class="sqm-custom-modal-header">
          <h3>${title}</h3>
          <button class="sqm-custom-modal-close" aria-label="Close modal">&times;</button>
        </div>
        <div class="sqm-custom-modal-body">
          <div class="sqm-prompt-content">
            <div class="sqm-prompt-message">${message}</div>
            ${helpText ? `<div class="sqm-prompt-help">${helpText}</div>` : ''}
            <input
              type="${inputType}"
              class="sqm-prompt-input"
              placeholder="${placeholder}"
              autocomplete="off"
            >
          </div>
        </div>
        <div class="sqm-custom-modal-footer">
          <button class="sqm-btn-modal sqm-btn-modal-secondary sqm-btn-cancel">Cancel</button>
          <button class="sqm-btn-modal sqm-btn-modal-primary sqm-btn-confirm">Confirm</button>
        </div>
      </div>
    `;
  }

  generateConfirmContent(title, message, type, details) {
    const iconMap = {
      warning: '⚠️',
      danger: '🚨',
      info: 'ℹ️'
    };

    const buttonTypeMap = {
      warning: 'sqm-btn-modal-warning',
      danger: 'sqm-btn-modal-danger',
      info: 'sqm-btn-modal-primary'
    };

    return `
      <div class="sqm-custom-modal-content">
        <div class="sqm-custom-modal-header">
          <h3>${title}</h3>
          <button class="sqm-custom-modal-close" aria-label="Close modal">&times;</button>
        </div>
        <div class="sqm-custom-modal-body">
          <div class="sqm-confirm-content">
            <div class="sqm-confirm-icon ${type}">
              ${iconMap[type] || '❓'}
            </div>
            <div class="sqm-confirm-text">
              <div class="sqm-confirm-message">${message}</div>
              ${details ? `<div class="sqm-confirm-details">${details}</div>` : ''}
            </div>
          </div>
        </div>
        <div class="sqm-custom-modal-footer">
          <button class="sqm-btn-modal sqm-btn-modal-secondary sqm-btn-cancel">Cancel</button>
          <button class="sqm-btn-modal ${buttonTypeMap[type]} sqm-btn-confirm">Confirm</button>
        </div>
      </div>
    `;
  }

  // Legacy method for backward compatibility
  async showConfirm(title, message) {
    return this.showCustomConfirm(title, message, 'warning');
  }

  // ========================================
  // Utility Methods
  // ========================================

  updateElement(key, value) {
    const element = this.elements.get(key);
    if (element) {
      // Format numbers if the element is a stat value
      if (element.classList.contains('sqm-stat-value') || element.classList.contains('sqm-tab-count')) {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
          const formattedValue = this.formatLargeNumber(numValue);
          element.textContent = formattedValue;

          // Add data-length attribute for responsive font sizing (only for stat values)
          if (element.classList.contains('sqm-stat-value')) {
            const valueLength = formattedValue.replace(/,/g, '').length;
            if (valueLength >= 15) {
              element.setAttribute('data-length', 'long');
            } else if (valueLength >= 8) {
              element.setAttribute('data-length', valueLength.toString());
            } else {
              element.removeAttribute('data-length');
            }
          }
        } else {
          element.textContent = value;
        }
      } else {
        element.textContent = value;
      }
    }
  }

  updateTimestamp(timestamp) {
    if (timestamp) {
      this.state.lastUpdate = new Date(timestamp);
      const timestampEl = document.getElementById('sqm-timestamp');
      if (timestampEl) {
        timestampEl.textContent = new Date(timestamp).toLocaleTimeString();
      }
    }
  }

  formatLatency(latency) {
    if (!latency || latency === 0) return '0s';
    if (latency < 60) return `${latency.toFixed(1)}s`;
    return `${Math.floor(latency / 60)}m ${(latency % 60).toFixed(0)}s`;
  }

  getPriorityIcon(priority) {
    if (priority >= 8) return '🔴'; // High priority
    if (priority >= 5) return '🟡'; // Medium priority
    return '⚪'; // Low priority
  }

  handleError(error) {
    this.state.retryCount++;

    if (this.state.retryCount <= SidekiqQueueManagerUI.CONSTANTS.MAX_RETRIES) {
      console.log(`Retrying... (${this.state.retryCount}/${SidekiqQueueManagerUI.CONSTANTS.MAX_RETRIES})`);
      setTimeout(() => this.refreshQueues(), SidekiqQueueManagerUI.CONSTANTS.RETRY_DELAY);
    } else {
      this.showError(`Failed to load data: ${error.message}`);
      this.state.retryCount = 0;
    }
  }

  // ========================================
  // Tab Management System
  // ========================================

  setupTabSystem() {
    const tabButtons = document.querySelectorAll('.sqm-tab');
    const tabPanels = document.querySelectorAll('.sqm-tab-panel');

    tabButtons.forEach(button => {
      this.addEventListener(button, 'click', (e) => {
        e.preventDefault();
        const tabName = button.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });

    // Setup filter and action buttons for each tab
    this.setupScheduledJobHandlers();
    this.setupRetryJobHandlers();
    this.setupDeadJobHandlers();
  }

  switchTab(tabName) {
    if (this.state.activeTab === tabName) return;

    // Update active tab state
    this.state.activeTab = tabName;

    // Update tab button states
    document.querySelectorAll('.sqm-tab').forEach(button => {
      const isActive = button.getAttribute('data-tab') === tabName;
      button.classList.toggle('sqm-tab-active', isActive);
      button.setAttribute('aria-selected', isActive);
    });

    // Update panel visibility
    document.querySelectorAll('.sqm-tab-panel').forEach(panel => {
      const panelTab = panel.id.replace('sqm-', '').replace('-panel', '');
      const isActive = panelTab === tabName;
      panel.classList.toggle('sqm-hidden', !isActive);
      panel.classList.toggle('sqm-tab-panel-active', isActive);
    });

    // Load data for the active tab
    this.loadTabData(tabName);
  }

  loadTabData(tabName) {
    switch (tabName) {
      case 'queues':
        this.refreshQueues();
        break;
      case 'scheduled':
        this.loadScheduledJobs();
        break;
      case 'retries':
        this.loadRetryJobs();
        break;
      case 'dead':
        this.loadDeadJobs();
        break;
    }
  }

  updateTabCounts(data) {
    // Update tab counts from data
    if (data.queues) {
      const queuesCount = Object.keys(data.queues).length;
      this.updateElement('sqm-queues-count', queuesCount);
    }

    if (data.global_stats) {
      const scheduledCount = data.global_stats.scheduled_size || 0;
      const retriesCount = data.global_stats.retry_size || 0;
      const deadCount = data.global_stats.dead_size || 0;

      this.updateElement('sqm-scheduled-count', scheduledCount);
      this.updateElement('sqm-retries-count', retriesCount);
      this.updateElement('sqm-dead-count', deadCount);
    }
  }

  // ========================================
  // Scheduled Jobs Management
  // ========================================

  setupScheduledJobHandlers() {
    // Filter button
    const filterBtn = document.getElementById('sqm-scheduled-apply-filter');
    const filterInput = document.getElementById('sqm-scheduled-filter');
    const clearBtn = document.getElementById('sqm-clear-scheduled-btn');

    if (filterBtn && filterInput) {
      this.addEventListener(filterBtn, 'click', () => {
        this.state.pagination.scheduled.filter = filterInput.value;
        this.state.pagination.scheduled.page = 1;
        this.loadScheduledJobs();
      });

      this.addEventListener(filterInput, 'keypress', (e) => {
        if (e.key === 'Enter') {
          this.state.pagination.scheduled.filter = filterInput.value;
          this.state.pagination.scheduled.page = 1;
          this.loadScheduledJobs();
        }
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', async () => {
        await this.showConfirmation('Are you sure you want to clear all scheduled jobs?', () => {
          this.clearScheduledJobs();
        });
      });
    }
  }

  async loadScheduledJobs() {
    try {
      const params = new URLSearchParams(this.state.pagination.scheduled);
      const response = await fetch(`${this.gemConfig.mountPath}/scheduled?${params}`);
      const result = await response.json();

      if (result.success) {
        this.renderScheduledJobs(result.data);
        this.renderPagination('scheduled', result.data.pagination);
        // Update tab count
        this.updateElement('sqm-scheduled-count', result.data.total_count || 0);
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to load scheduled jobs', 'error');
    }
  }

  renderScheduledJobs(data) {
    const tbody = document.getElementById('sqm-scheduled-table-body');
    if (!tbody) return;

    if (!data.jobs || data.jobs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: var(--sqm-muted-foreground);">
            No scheduled jobs found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.jobs.map(job => `
      <tr>
        <td>
          <div class="sqm-job-class">${job.class}</div>
          <div class="sqm-job-args" title="${JSON.stringify(job.args)}">${JSON.stringify(job.args)}</div>
        </td>
        <td>${job.queue}</td>
        <td style="text-align: right;">
          <div>${job.scheduled_at}</div>
          <div class="sqm-time-relative">${job.time_until_execution}</div>
        </td>
        <td style="text-align: right;">
          <span class="sqm-time-relative">${job.time_until_execution}</span>
        </td>
        <td style="text-align: right;">
          <div class="sqm-action-buttons">
            <button class="sqm-btn sqm-btn-sm sqm-btn-enqueue"
                    onclick="window.sidekiqQueueManager.enqueueScheduledJob('${job.jid}')"
                    title="Enqueue now">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 0.875rem; height: 0.875rem;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </button>
            <button class="sqm-btn sqm-btn-sm sqm-btn-destructive"
                    onclick="window.sidekiqQueueManager.deleteScheduledJob('${job.jid}')"
                    title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 0.875rem; height: 0.875rem;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async enqueueScheduledJob(jobId) {
    try {
      const response = await fetch(`${this.gemConfig.mountPath}/scheduled/${jobId}/enqueue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification('Job enqueued successfully', 'success');
        this.loadScheduledJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to enqueue job', 'error');
    }
  }

  async deleteScheduledJob(jobId) {
    try {
      const response = await fetch(`${this.gemConfig.mountPath}/scheduled/${jobId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification('Job deleted successfully', 'success');
        this.loadScheduledJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to delete job', 'error');
    }
  }

  async clearScheduledJobs() {
    try {
      const filter = this.state.pagination.scheduled.filter;
      const body = filter ? JSON.stringify({ filter }) : null;

      const response = await fetch(`${this.gemConfig.mountPath}/scheduled/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification(result.message, 'success');
        this.loadScheduledJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to clear scheduled jobs', 'error');
    }
  }

  // ========================================
  // Retry Jobs Management
  // ========================================

  setupRetryJobHandlers() {
    // Filter button
    const filterBtn = document.getElementById('sqm-retries-apply-filter');
    const filterInput = document.getElementById('sqm-retries-filter');
    const retryAllBtn = document.getElementById('sqm-retry-all-btn');
    const clearBtn = document.getElementById('sqm-clear-retries-btn');

    if (filterBtn && filterInput) {
      this.addEventListener(filterBtn, 'click', () => {
        this.state.pagination.retries.filter = filterInput.value;
        this.state.pagination.retries.page = 1;
        this.loadRetryJobs();
      });

      this.addEventListener(filterInput, 'keypress', (e) => {
        if (e.key === 'Enter') {
          this.state.pagination.retries.filter = filterInput.value;
          this.state.pagination.retries.page = 1;
          this.loadRetryJobs();
        }
      });
    }

    if (retryAllBtn) {
      this.addEventListener(retryAllBtn, 'click', async () => {
        await this.showConfirmation('Are you sure you want to retry all jobs?', () => {
          this.retryAllJobs();
        });
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', async () => {
        await this.showConfirmation('Are you sure you want to clear all retry jobs?', () => {
          this.clearRetryJobs();
        });
      });
    }
  }

  async loadRetryJobs() {
    try {
      const params = new URLSearchParams(this.state.pagination.retries);
      const response = await fetch(`${this.gemConfig.mountPath}/retries?${params}`);
      const result = await response.json();

      if (result.success) {
        this.renderRetryJobs(result.data);
        this.renderPagination('retries', result.data.pagination);
        // Update tab count
        this.updateElement('sqm-retries-count', result.data.total_count || 0);
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to load retry jobs', 'error');
    }
  }

  renderRetryJobs(data) {
    const tbody = document.getElementById('sqm-retries-table-body');
    if (!tbody) return;

    if (!data.jobs || data.jobs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--sqm-muted-foreground);">
            No retry jobs found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.jobs.map(job => `
      <tr>
        <td>
          <div class="sqm-job-class">${job.class}</div>
          <div class="sqm-error-preview" title="${job.error_message || 'No error message'}">${job.error_class || 'Unknown Error'}</div>
        </td>
        <td>${job.queue}</td>
        <td style="text-align: right;">
          <div>${job.failed_at || 'Unknown'}</div>
          <div class="sqm-time-relative">${job.failed_at_relative || ''}</div>
        </td>
        <td style="text-align: right;">
          <div>${job.retry_at || 'Now'}</div>
          <div class="sqm-time-relative">${job.next_retry_relative || ''}</div>
        </td>
        <td style="text-align: right;">
          <div class="sqm-retry-count">
            ${job.retry_count}/${job.retry_limit}
            <div class="sqm-retry-progress">
              <div class="sqm-retry-progress-bar" style="width: ${(job.retry_count / job.retry_limit) * 100}%"></div>
            </div>
          </div>
        </td>
        <td style="text-align: right;">
          <div class="sqm-action-buttons">
            <button class="sqm-btn sqm-btn-sm sqm-btn-success"
                    onclick="window.sidekiqQueueManager.retryJobNow('${job.jid}')"
                    title="Retry now">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 0.875rem; height: 0.875rem;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
            <button class="sqm-btn sqm-btn-sm sqm-btn-kill"
                    onclick="window.sidekiqQueueManager.killRetryJob('${job.jid}')"
                    title="Move to dead queue">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 0.875rem; height: 0.875rem;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </button>
            <button class="sqm-btn sqm-btn-sm sqm-btn-destructive"
                    onclick="window.sidekiqQueueManager.deleteRetryJob('${job.jid}')"
                    title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 0.875rem; height: 0.875rem;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async retryJobNow(jobId) {
    try {
      const response = await fetch(`${this.gemConfig.mountPath}/retries/${jobId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification('Job retried successfully', 'success');
        this.loadRetryJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to retry job', 'error');
    }
  }

  async killRetryJob(jobId) {
    try {
      const response = await fetch(`${this.gemConfig.mountPath}/retries/${jobId}/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification('Job moved to dead queue', 'success');
        this.loadRetryJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to kill job', 'error');
    }
  }

  async deleteRetryJob(jobId) {
    try {
      const response = await fetch(`${this.gemConfig.mountPath}/retries/${jobId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification('Job deleted successfully', 'success');
        this.loadRetryJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to delete job', 'error');
    }
  }

  async retryAllJobs() {
    try {
      const filter = this.state.pagination.retries.filter;
      const body = filter ? JSON.stringify({ filter }) : null;

      const response = await fetch(`${this.gemConfig.mountPath}/retries/retry_all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification(result.message, 'success');
        this.loadRetryJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to retry all jobs', 'error');
    }
  }

  async clearRetryJobs() {
    try {
      const filter = this.state.pagination.retries.filter;
      const body = filter ? JSON.stringify({ filter }) : null;

      const response = await fetch(`${this.gemConfig.mountPath}/retries/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification(result.message, 'success');
        this.loadRetryJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to clear retry jobs', 'error');
    }
  }

  // ========================================
  // Dead Jobs Management
  // ========================================

  setupDeadJobHandlers() {
    // Filter button
    const filterBtn = document.getElementById('sqm-dead-apply-filter');
    const filterInput = document.getElementById('sqm-dead-filter');
    const resurrectAllBtn = document.getElementById('sqm-resurrect-all-btn');
    const clearBtn = document.getElementById('sqm-clear-dead-btn');

    if (filterBtn && filterInput) {
      this.addEventListener(filterBtn, 'click', () => {
        this.state.pagination.dead.filter = filterInput.value;
        this.state.pagination.dead.page = 1;
        this.loadDeadJobs();
      });

      this.addEventListener(filterInput, 'keypress', (e) => {
        if (e.key === 'Enter') {
          this.state.pagination.dead.filter = filterInput.value;
          this.state.pagination.dead.page = 1;
          this.loadDeadJobs();
        }
      });
    }

    if (resurrectAllBtn) {
      this.addEventListener(resurrectAllBtn, 'click', async () => {
        await this.showConfirmation('Are you sure you want to resurrect all dead jobs?', () => {
          this.resurrectAllDeadJobs();
        });
      });
    }

    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', async () => {
        await this.showConfirmation('Are you sure you want to permanently delete all dead jobs?', () => {
          this.clearDeadJobs();
        });
      });
    }
  }

  async loadDeadJobs() {
    try {
      const params = new URLSearchParams(this.state.pagination.dead);
      const response = await fetch(`${this.gemConfig.mountPath}/dead?${params}`);
      const result = await response.json();

      if (result.success) {
        this.renderDeadJobs(result.data);
        this.renderPagination('dead', result.data.pagination);
        // Update tab count
        this.updateElement('sqm-dead-count', result.data.total_count || 0);
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to load dead jobs', 'error');
    }
  }

  renderDeadJobs(data) {
    const tbody = document.getElementById('sqm-dead-table-body');
    if (!tbody) return;

    if (!data.jobs || data.jobs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--sqm-muted-foreground);">
            No dead jobs found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.jobs.map(job => `
      <tr>
        <td>
          <div class="sqm-job-class">${job.class}</div>
          <div class="sqm-job-args" title="${JSON.stringify(job.args)}">${JSON.stringify(job.args)}</div>
        </td>
        <td>${job.queue}</td>
        <td style="text-align: right;">
          <div>${job.failed_at || 'Unknown'}</div>
          <div class="sqm-time-relative">${job.failed_at_relative || ''}</div>
        </td>
        <td style="text-align: right;">
          <span class="sqm-retry-count">${job.retry_count}</span>
        </td>
        <td style="text-align: right;">
          <div class="sqm-error-preview" title="${job.error_message || 'No error message'}">${job.error_class || 'Unknown Error'}</div>
        </td>
        <td style="text-align: right;">
          <div class="sqm-action-buttons">
            <button class="sqm-btn sqm-btn-sm sqm-btn-resurrect"
                    onclick="window.sidekiqQueueManager.resurrectDeadJob('${job.jid}')"
                    title="Resurrect to retry queue">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 0.875rem; height: 0.875rem;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
            <button class="sqm-btn sqm-btn-sm sqm-btn-destructive"
                    onclick="window.sidekiqQueueManager.deleteDeadJob('${job.jid}')"
                    title="Delete permanently">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 0.875rem; height: 0.875rem;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async resurrectDeadJob(jobId) {
    try {
      const response = await fetch(`${this.gemConfig.mountPath}/dead/${jobId}/resurrect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification('Job resurrected successfully', 'success');
        this.loadDeadJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to resurrect job', 'error');
    }
  }

  async deleteDeadJob(jobId) {
    try {
      const response = await fetch(`${this.gemConfig.mountPath}/dead/${jobId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification('Job deleted permanently', 'success');
        this.loadDeadJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to delete job', 'error');
    }
  }

  async resurrectAllDeadJobs() {
    try {
      const filter = this.state.pagination.dead.filter;
      const body = filter ? JSON.stringify({ filter }) : null;

      const response = await fetch(`${this.gemConfig.mountPath}/dead/resurrect_all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification(result.message, 'success');
        this.loadDeadJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to resurrect all jobs', 'error');
    }
  }

  async clearDeadJobs() {
    try {
      const filter = this.state.pagination.dead.filter;
      const body = filter ? JSON.stringify({ filter }) : null;

      const response = await fetch(`${this.gemConfig.mountPath}/dead/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      const result = await response.json();

      if (result.success) {
        this.showNotification(result.message, 'success');
        this.loadDeadJobs();
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to clear dead jobs', 'error');
    }
  }

  // ========================================
  // Pagination System
  // ========================================

  renderPagination(tabName, pagination) {
    const container = document.getElementById(`sqm-${tabName}-pagination`);
    if (!container || !pagination) return;

    const { current_page, total_pages, per_page, total_jobs, has_previous, has_next } = pagination;

    if (total_pages <= 1) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="sqm-pagination-info">
        Showing ${((current_page - 1) * per_page) + 1}-${Math.min(current_page * per_page, total_jobs)} of ${total_jobs} jobs
      </div>
      <div class="sqm-pagination-controls">
        <button class="sqm-pagination-btn" ${!has_previous ? 'disabled' : ''}
                onclick="window.sidekiqQueueManager.changePage('${tabName}', ${current_page - 1})">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        ${this.generatePageNumbers(current_page, total_pages, tabName)}
        <button class="sqm-pagination-btn" ${!has_next ? 'disabled' : ''}
                onclick="window.sidekiqQueueManager.changePage('${tabName}', ${current_page + 1})">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    `;
  }

  generatePageNumbers(current, total, tabName) {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      const isActive = i === current;
      pages.push(`
        <button class="sqm-pagination-btn ${isActive ? 'sqm-pagination-current' : ''}"
                onclick="window.sidekiqQueueManager.changePage('${tabName}', ${i})">
          ${i}
        </button>
      `);
    }

    return pages.join('');
  }

  changePage(tabName, page) {
    this.state.pagination[tabName].page = page;
    this.loadTabData(tabName);
  }

  // ========================================
  // Confirmation Dialog
  // ========================================

  async showConfirmation(message, onConfirm) {
    const confirmed = await this.showCustomConfirm('Confirm Action', message);
    if (confirmed) {
      onConfirm();
    }
  }

  // ========================================
  // Notification System
  // ========================================

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `sqm-notification sqm-notification-${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // ========================================
  // Cleanup
  // ========================================

  destroy() {
    this.stopLivePull();
    this.closeActionsMenu();

    // Remove event listeners
    this.eventHandlers.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });

    this.eventHandlers.clear();
    this.elements.clear();

    if (SidekiqQueueManagerUI.instance === this) {
      SidekiqQueueManagerUI.instance = null;
    }
  }
}

// ========================================
// Initialization
// ========================================

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get configuration from meta tags or data attributes
  const config = window.SidekiqQueueManagerConfig || {};

  // Initialize the application
  window.sidekiqQueueManager = new SidekiqQueueManagerUI(config);
});

// Export for manual initialization if needed
window.SidekiqQueueManagerUI = SidekiqQueueManagerUI;