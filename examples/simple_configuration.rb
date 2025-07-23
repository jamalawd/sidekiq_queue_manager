# frozen_string_literal: true

# Simple Sidekiq Queue Manager Configuration
# Copy this to config/initializers/sidekiq_queue_manager.rb

SidekiqQueueManager.configure do |config|
  # ========================================
  # AUTHENTICATION (Recommended for Production)
  # ========================================

  # Basic HTTP Authentication (disabled by default for easy development)
  # Enable for production environments:
  config.basic_auth_enabled = true
  config.basic_auth_password = 'your-secure-password-here'
  # config.basic_auth_username = 'admin'  # defaults to 'admin'

  # Alternative: Use your existing authentication (advanced)
  # config.authentication_method = :authenticate_admin!
  # config.basic_auth_enabled = false

  # Development: Keep authentication disabled (default behavior)
  # config.basic_auth_enabled = false  # This is now the default

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

