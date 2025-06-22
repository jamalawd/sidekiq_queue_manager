# frozen_string_literal: true

# Advanced Sidekiq Queue Manager Configuration
# For users who need more control (rarely needed)

SidekiqQueueManager.configure do |config|
  # ========================================
  # Authentication Options (Professional Standard)
  # ========================================

  # Following Sidekiq Web UI patterns - explicit authentication required

  # Option 1: Basic HTTP Authentication (default, recommended)
  config.basic_auth_enabled = true
  config.basic_auth_username = 'sidekiq_admin'
  config.basic_auth_password = ENV.fetch('SIDEKIQ_ADMIN_PASSWORD', nil) # Use env var for security

  # Option 2: Custom authentication method (advanced)
  # Integrate with your existing Rails authentication
  # config.authentication_method = :authenticate_admin!  # Your custom method
  # config.basic_auth_enabled = false  # Disable basic auth when using custom

  # Option 3: Disable authentication (development only, NOT recommended for production)
  # config.basic_auth_enabled = false

  # ========================================
  # Essential Settings (most common)
  # ========================================

  # Protect critical queues from bulk operations
  config.critical_queues = %w[
    mailers
    notifications
    billing
    high_priority
    payment_processing
  ]

  # Theme preference
  config.theme = 'dark' # 'auto', 'light', 'dark'

  # ========================================
  # Advanced Settings (rarely changed)
  # ========================================

  # UI refresh interval in milliseconds
  config.refresh_interval = 3000 # 3 seconds (faster than default 5s)

  # Disable logging if you have your own monitoring
  config.enable_logging = false

  # Disable caching for real-time accuracy (may impact performance)
  config.enable_caching = false

  # Set custom queue priorities (higher number = higher priority)
  config.default_queue_priorities = {
    'mailers' => 10, # Highest priority
    'notifications' => 8, # High priority
    'billing' => 7,            # High priority
    'high_priority' => 6,      # Medium-high priority
    'default' => 5,            # Normal priority
    'low_priority' => 2        # Low priority
  }
end

# NOTE: The following are handled automatically and rarely need changes:
# - Redis connection (uses Sidekiq's connection)
# - Cache TTL (300 seconds)
# - Redis key prefixes
# - Retry logic for failed operations
# - Security headers (CSP)
# - Asset compilation

