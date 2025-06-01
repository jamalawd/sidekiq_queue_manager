# frozen_string_literal: true

module SidekiqQueueManager
  # Configuration class for customizing SidekiqQueueManager behavior
  # Focus on essential user-configurable options only
  class Configuration
    # Essential user-configurable options
    attr_accessor :authentication_method, :critical_queues, :theme
    attr_accessor :basic_auth_enabled, :basic_auth_username, :basic_auth_password

    # Advanced options (rarely changed, but available)
    attr_accessor :refresh_interval, :enable_logging, :enable_caching, :default_queue_priorities

    # Internal options (sensible defaults, not typically user-configured)
    attr_reader :redis_key_prefix, :redis_timeout, :log_level, :enable_csp, :cache_ttl

    def initialize
      # Essential defaults (what most users care about)
      @authentication_method = nil          # Custom auth method (optional)
      @critical_queues = []                 # No protected queues by default
      @theme = 'auto'                       # Auto light/dark theme

      # Basic HTTP Authentication (professional standard - explicit configuration required)
      @basic_auth_enabled = true            # Secure by default like Sidekiq Web UI
      @basic_auth_username = 'admin'        # Standard admin username
      @basic_auth_password = nil            # MUST be explicitly set by user

      # Advanced defaults (rarely changed)
      @refresh_interval = 5000              # 5 second UI refresh
      @enable_logging = true                # Log queue operations
      @enable_caching = true                # Cache queue stats for performance
      @default_queue_priorities = {}        # User-defined queue priorities

      # Internal defaults (best practices, rarely modified)
      @redis_key_prefix = 'sidekiq_queue_manager' # Namespace Redis keys
      @redis_timeout = 5                    # 5 second Redis timeout
      @log_level = :info                    # Standard logging level
      @enable_csp = true                    # Security headers enabled
      @cache_ttl = 300                      # 5 minute cache TTL
    end

    # Validate essential user-provided configuration
    def validate!
      validate_basic_settings!
      validate_authentication!
      self # Return self for method chaining (Ruby idiom)
    end

    # Check if configuration is valid without raising (Ruby's truthiness approach)
    def valid?
      validate!
      true
    rescue ConfigurationError
      false
    end

    # Export configuration as hash (for JavaScript and internal use)
    def to_h
      {
        # Essential user options
        authentication_method: @authentication_method,
        critical_queues: @critical_queues,
        theme: @theme,
        basic_auth_enabled: @basic_auth_enabled,
        basic_auth_username: @basic_auth_username,
        # NOTE: basic_auth_password excluded for security

        # Advanced options
        refresh_interval: @refresh_interval,
        enable_logging: @enable_logging,
        enable_caching: @enable_caching,
        default_queue_priorities: @default_queue_priorities,

        # Internal options (included for completeness)
        redis_key_prefix: @redis_key_prefix,
        redis_timeout: @redis_timeout,
        log_level: @log_level,
        enable_csp: @enable_csp,
        cache_ttl: @cache_ttl
      }
    end

    # Essential configuration summary (for debugging) - more Ruby-like
    def summary
      auth_status = if basic_auth_enabled?
                      "basic auth (#{basic_auth_username})"
                    elsif authentication_method
                      "custom (#{authentication_method})"
                    else
                      'disabled'
                    end

      {
        critical_queues: critical_queues.presence || 'none',
        theme: theme,
        authentication: auth_status,
        caching: enable_caching? ? 'enabled' : 'disabled'
      }
    end

    # Predicate methods (Ruby convention for boolean checks)
    def basic_auth_enabled? = @basic_auth_enabled
    def enable_logging? = @enable_logging
    def enable_caching? = @enable_caching
    def enable_csp? = @enable_csp
    def custom_authentication? = @authentication_method.present?

    # Check if queue is critical (more Ruby-like with inclusion check)
    def critical_queue?(queue_name)
      critical_queues.include?(queue_name.to_s)
    end

    # Get queue priority with Ruby's Hash#fetch for elegant defaults
    def queue_priority(queue_name)
      default_queue_priorities.fetch(queue_name.to_s, 1)
    end

    private

    # Validate basic configuration settings
    def validate_basic_settings!
      # Use Ruby's case statements for more readable validation
      case refresh_interval
      when Integer
        raise ConfigurationError, 'refresh_interval must be positive' unless refresh_interval.positive?
      else
        raise ConfigurationError, 'refresh_interval must be a positive Integer'
      end

      raise ConfigurationError, 'critical_queues must be an Array' unless critical_queues.is_a?(Array)

      raise ConfigurationError, 'theme must be one of: auto, light, dark' unless %w[auto light dark].include?(theme)

      self
    end

    # Validate authentication configuration (explicit, professional standard)
    def validate_authentication!
      # Only validate if basic auth is enabled (explicit choice)
      return self unless basic_auth_enabled?

      # Use Ruby's presence for more elegant nil/empty checks
      if basic_auth_password.blank?
        raise ConfigurationError, 'basic_auth_password must be set when basic_auth_enabled is true. ' \
                                  'Set config.basic_auth_password in your initializer or disable with ' \
                                  'basic_auth_enabled = false'
      end

      if basic_auth_username.blank?
        raise ConfigurationError, 'basic_auth_username cannot be empty when basic_auth_enabled is true'
      end

      self
    end
  end
end

