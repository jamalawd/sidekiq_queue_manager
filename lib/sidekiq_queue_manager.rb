# frozen_string_literal: true

require_relative 'sidekiq_queue_manager/version'
require_relative 'sidekiq_queue_manager/configuration'
require_relative 'sidekiq_queue_manager/logging_middleware'
require_relative 'sidekiq_queue_manager/engine'

# SidekiqQueueManager provides a professional, real-time web interface
# for monitoring and managing Sidekiq queues in Ruby on Rails applications.
#
# Features:
# - Real-time queue statistics and monitoring
# - Pause/resume individual queues or bulk operations
# - Process limit management and job control
# - Modern, responsive UI with live updates
# - Zero-configuration setup with sensible defaults
# - Production-ready with enterprise-grade reliability
#
# @example Basic usage
#   # In your Gemfile
#   gem 'sidekiq_queue_manager'
#
#   # In config/routes.rb
#   mount SidekiqQueueManager::Engine, at: '/queue_manager'
#
# @example Advanced configuration
#   SidekiqQueueManager.configure do |config|
#     config.authentication_method = :authenticate_admin!
#     config.critical_queues = ['mailer', 'high_priority']
#     config.refresh_interval = 3000
#   end
#
module SidekiqQueueManager
  # Configuration error raised when invalid settings are provided
  class ConfigurationError < StandardError; end

  # Service error raised when Sidekiq operations fail
  class ServiceError < StandardError; end

  class << self
    # Global configuration instance
    # @return [Configuration] the current configuration
    attr_writer :configuration

    # Returns the global configuration instance
    # @return [Configuration] the current configuration
    def configuration
      @configuration ||= Configuration.new
    end

    # Yields the global configuration for modification
    #
    # @example
    #   SidekiqQueueManager.configure do |config|
    #     config.authentication_method = :authenticate_admin!
    #     config.critical_queues = ['mailer']
    #   end
    #
    # @yield [Configuration] the configuration instance
    # @return [Configuration] the updated configuration
    def configure
      yield(configuration) if block_given?
      configuration.tap(&:validate!) # Ruby idiom: tap for side effects
    end

    # Resets configuration to defaults (primarily for testing)
    # @return [Configuration] a new configuration instance
    def reset_configuration!
      @configuration = Configuration.new
    end

    # Validates that required dependencies are available
    # @return [Boolean] true if all dependencies are satisfied
    # @raise [ConfigurationError] if dependencies are missing
    def validate_dependencies!
      # Use Ruby's case statement for cleaner flow control
      if !defined?(Rails)
        raise ConfigurationError, 'Rails is required but not loaded'
      elsif !defined?(Sidekiq)
        raise ConfigurationError, 'Sidekiq is required but not loaded'
      elsif rails_version_insufficient?
        raise ConfigurationError, "Rails 7.0+ is required, got #{Rails.version}"
      elsif sidekiq_version_insufficient?
        raise ConfigurationError, "Sidekiq 7.0+ is required, got #{Sidekiq::VERSION}"
      else
        true
      end
    end

    # Check if the gem is properly configured (Ruby's truthiness approach)
    def configured?
      validate_dependencies!
      configuration.valid?
    rescue StandardError
      false
    end

    # Delegated configuration methods for cleaner API
    # These delegate to the configuration instance with proper error handling
    delegate :critical_queue?, to: :configuration

    delegate :queue_priority, to: :configuration

    delegate :basic_auth_enabled?, to: :configuration

    delegate :enable_logging?, to: :configuration

    delegate :enable_caching?, to: :configuration

    private

    # Ruby idiom: break complex conditions into intention-revealing methods
    def rails_version_insufficient?
      Rails.version < '7.0.0'
    end

    def sidekiq_version_insufficient?
      Gem::Version.new(Sidekiq::VERSION) < Gem::Version.new('7.0.0')
    end
  end
end

