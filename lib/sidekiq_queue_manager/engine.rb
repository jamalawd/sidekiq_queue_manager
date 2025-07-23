# frozen_string_literal: true

require 'rails/engine'

module SidekiqQueueManager
  # Rails Engine for integrating SidekiqQueueManager with Rails applications
  #
  # This engine automatically:
  # - Adds gem routes to the Rails application
  # - Registers assets (CSS, JavaScript) with the asset pipeline
  # - Sets up middleware and initializers
  # - Provides mountable functionality
  #
  class Engine < ::Rails::Engine
    isolate_namespace SidekiqQueueManager

    # Engine configuration using Ruby's expressive syntax
    config.generators do |g|
      g.test_framework :rspec
      g.fixture_replacement :factory_bot
      g.assets false
      g.helper false
    end

    # Initialize the engine with Ruby's elegant error handling
    initializer 'sidekiq_queue_manager.assets' do |app|
      configure_assets(app).tap do |configured|
        Rails.logger.info asset_configuration_message(configured)
      end
    end

    # Validate dependencies and configuration on engine load
    initializer 'sidekiq_queue_manager.validate_dependencies_and_config' do
      validate_and_configure!
    rescue SidekiqQueueManager::ConfigurationError => e
      handle_configuration_error(e)
    rescue StandardError => e
      handle_dependency_error(e)
    end

    initializer 'sidekiq_queue_manager.configure_limit_fetch', before: 'sidekiq' do
      configure_sidekiq_limit_fetch
    end

    # Set up middleware for security headers and logging
    initializer 'sidekiq_queue_manager.middleware' do |app|
      configure_middleware(app) if SidekiqQueueManager.enable_logging?
    rescue StandardError => e
      Rails.logger.warn "[SidekiqQueueManager] Could not configure middleware: #{e.message}"
    end

    # Configure eager loading paths
    config.eager_load_paths << File.expand_path('../../app', __dir__)

    private

    # Asset configuration with Ruby's functional approach
    def configure_assets(app)
      return false unless asset_pipeline_available?(app)

      configure_asset_pipeline(app)
    rescue StandardError => e
      Rails.logger.warn "[SidekiqQueueManager] Asset pipeline configuration failed: #{e.message}"
      false
    end

    def asset_pipeline_available?(app)
      app.config.respond_to?(:assets) && defined?(Sprockets)
    end

    def configure_asset_pipeline(app)
      app.config.assets.precompile += %w[
        sidekiq_queue_manager/application.js
        sidekiq_queue_manager/application.css
        sidekiq_queue_manager/modals.css
      ]
      true
    end

    def asset_configuration_message(configured)
      if configured
        '[SidekiqQueueManager] Assets registered with asset pipeline'
      else
        '[SidekiqQueueManager] Asset pipeline not available - using direct asset serving via /assets/* routes'
      end
    end

    # Dependency validation with Ruby's case pattern matching
    def validate_and_configure!
      SidekiqQueueManager.validate_dependencies!
      SidekiqQueueManager.configuration.validate!
      Rails.logger.info '[SidekiqQueueManager] Configuration validated successfully'
    end

    def handle_configuration_error(error)
      Rails.logger.error "[SidekiqQueueManager] Configuration error: #{error.message}"
      Rails.logger.error '[SidekiqQueueManager] Please check your config/initializers/sidekiq_queue_manager.rb'
      # Don't raise in production to prevent app startup failures, but log clearly
      raise error unless Rails.env.production?
    end

    def handle_dependency_error(error)
      Rails.logger.error "[SidekiqQueueManager] Dependency validation failed: #{error.message}"
      # Don't raise in production to prevent app startup failures
      raise error unless Rails.env.production?
    end

    # Sidekiq limit fetch configuration using Ruby's method chaining
    def configure_sidekiq_limit_fetch
      return configure_existing_limit_fetch if sidekiq_limit_fetch_available?

      attempt_to_load_limit_fetch
    end

    def sidekiq_limit_fetch_available?
      defined?(Sidekiq::LimitFetch)
    end

    def configure_existing_limit_fetch
      configure_sidekiq_server_options
      Rails.logger.info '[SidekiqQueueManager] Configured sidekiq-limit_fetch for advanced queue management'
    end

    def attempt_to_load_limit_fetch
      require 'sidekiq-limit_fetch'

      if defined?(Sidekiq::LimitFetch)
        configure_sidekiq_server_options
        Rails.logger.info '[SidekiqQueueManager] Loaded and configured sidekiq-limit_fetch'
      end
    rescue LoadError => e
      Rails.logger.warn "[SidekiqQueueManager] sidekiq-limit_fetch not available: #{e.message}"
      Rails.logger.warn '[SidekiqQueueManager] Some advanced queue features may not work'
    end

    def configure_sidekiq_server_options
      Sidekiq.configure_server do |config|
        # Sidekiq 7.x+ removed config.options API, check if sidekiq-limit_fetch
        # supports the new configuration method
        if config.respond_to?(:options) && config.options.respond_to?(:[]=)
          # Sidekiq 6.x and earlier
          config.options[:fetch] = Sidekiq::LimitFetch
        else
          # Sidekiq 7.x+ - sidekiq-limit_fetch may need different configuration
          # or may not be compatible. Log a warning for now.
          Rails.logger.warn "[SidekiqQueueManager] sidekiq-limit_fetch configuration skipped - " \
                            "may not be compatible with Sidekiq #{Sidekiq::VERSION}"
          Rails.logger.warn '[SidekiqQueueManager] Queue limits may not work as expected'
        end
      end
    end

    # Middleware configuration using Ruby's guard clauses
    def configure_middleware(app)
      return unless SidekiqQueueManager.configuration.enable_logging?

      app.middleware.use SidekiqQueueManager::LoggingMiddleware
      Rails.logger.info '[SidekiqQueueManager] Logging middleware enabled'
    end
  end
end

