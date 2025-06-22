# frozen_string_literal: true

# Simple Sidekiq Queue Manager Configuration
# Copy this to config/initializers/sidekiq_queue_manager.rb

SidekiqQueueManager.configure do |config|
  # ========================================
  # REQUIRED: Authentication (Professional Standard)
  # ========================================

  # Basic HTTP Authentication (enabled by default like Sidekiq Web UI)
  # You MUST set a password for security:
  config.basic_auth_password = 'your-secure-password-here'
  # config.basic_auth_username = 'admin'  # defaults to 'admin'

  # Alternative: Use your existing authentication (advanced)
  # config.authentication_method = :authenticate_admin!
  # config.basic_auth_enabled = false

  # Development only: Disable authentication (NOT recommended for production)
  # config.basic_auth_enabled = false

  # ========================================
  # Optional Settings
  # ========================================

  # Protect critical queues from accidental bulk operations
  config.critical_queues = %w[mailers high_priority billing]

  # Set custom queue priorities (higher = more important)
  config.default_queue_priorities = {
    'mailers' => 10, # Highest priority
    'high_priority' => 8, # High priority
    'default' => 5,      # Normal priority
    'low_priority' => 2  # Low priority
  }
end

