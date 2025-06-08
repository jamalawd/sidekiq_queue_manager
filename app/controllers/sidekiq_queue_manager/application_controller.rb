# frozen_string_literal: true

module SidekiqQueueManager
  # Base application controller for the SidekiqQueueManager engine
  #
  # Provides common functionality, security measures, and configuration
  # for all controllers within the gem.
  #
  # Inherits from the main application's ApplicationController to ensure
  # access to authentication methods and other application-specific functionality.
  #
  class ApplicationController < (defined?(::ApplicationController) ? ::ApplicationController : ActionController::Base)
    # Engine-specific layout
    layout 'sidekiq_queue_manager/application'

    # Authentication and security using Ruby's declarative approach
    before_action :authenticate_access
    before_action :set_security_headers

    protected

    # Handle authentication - explicit configuration following professional standards
    def authenticate_access
      return custom_authentication if custom_authentication_configured?

      basic_authentication if basic_authentication_enabled?

      # If both disabled, access is allowed (explicit choice for development)
    end

    private

    # Ruby's case-based authentication routing
    def custom_authentication
      return unless respond_to?(authentication_method, true)

      send(authentication_method)
    end

    def basic_authentication
      validate_basic_auth_configuration!
      perform_basic_authentication
    end

    # Predicate methods for cleaner conditionals (Ruby convention)
    def custom_authentication_configured?
      SidekiqQueueManager.configuration.custom_authentication?
    end

    def basic_authentication_enabled?
      SidekiqQueueManager.basic_auth_enabled?
    end

    def authentication_method
      SidekiqQueueManager.configuration.authentication_method
    end

    # Configuration validation with descriptive error handling
    def validate_basic_auth_configuration!
      return if basic_auth_password.present?

      render_authentication_configuration_error
    end

    def basic_auth_password
      SidekiqQueueManager.configuration.basic_auth_password
    end

    def basic_auth_username
      SidekiqQueueManager.configuration.basic_auth_username
    end

    # Ruby's multiline string with here-doc for readable error messages
    def render_authentication_configuration_error
      Rails.logger.error '[SidekiqQueueManager] basic_auth_password not configured - authentication will fail'

      error_message = <<~ERROR
        Sidekiq Queue Manager: Authentication Not Configured

        Basic authentication is enabled but no password is set.

        To fix this, add the following to config/initializers/sidekiq_queue_manager.rb:

        SidekiqQueueManager.configure do |config|
          config.basic_auth_password = 'your-secure-password-here'
        end

        Or disable authentication (NOT recommended for production):

        SidekiqQueueManager.configure do |config|
          config.basic_auth_enabled = false
        end
      ERROR

      render plain: error_message, status: :internal_server_error
    end

    # HTTP Basic Authentication implementation with Ruby's secure comparison
    def perform_basic_authentication
      authenticate_or_request_with_http_basic('Sidekiq Queue Manager') do |username, password|
        # Use secure comparison to prevent timing attacks
        credentials_valid?(username, password)
      end
    end

    def credentials_valid?(username, password)
      username_match = ActiveSupport::SecurityUtils.secure_compare(username, basic_auth_username)
      password_match = ActiveSupport::SecurityUtils.secure_compare(password, basic_auth_password)

      username_match && password_match
    end

    # Set security headers for all responses using Ruby's functional approach
    def set_security_headers
      apply_standard_security_headers
      apply_csp_header if SidekiqQueueManager.configuration.enable_csp?
    end

    def apply_standard_security_headers
      response.headers.merge!(
        'X-Frame-Options' => 'SAMEORIGIN',
        'X-Content-Type-Options' => 'nosniff',
        'X-XSS-Protection' => '1; mode=block',
        'Referrer-Policy' => 'strict-origin-when-cross-origin'
      )
    end

    def apply_csp_header
      response.headers['Content-Security-Policy'] = content_security_policy
    end

    # Build Content Security Policy header using Ruby's array joining
    def content_security_policy
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'"
      ].join('; ')
    end

    # Helper to determine asset serving strategy using Ruby's expressive error handling
    def asset_serving_info
      @asset_serving_info ||= detect_asset_serving_strategy
    end
    helper_method :asset_serving_info

    def detect_asset_serving_strategy
      asset_pipeline_strategy
    rescue StandardError
      direct_serving_strategy
    end

    def asset_pipeline_strategy
      {
        css_path: asset_path('sidekiq_queue_manager/application.css'),
        js_path: asset_path('sidekiq_queue_manager/application.js'),
        modals_css_path: asset_path('sidekiq_queue_manager/modals.css'),
        use_asset_pipeline: true
      }
    end

    def direct_serving_strategy
      mount_path = sidekiq_dashboard.root_path.chomp('/')

      {
        css_path: "#{mount_path}/assets/sidekiq_queue_manager/application.css",
        js_path: "#{mount_path}/assets/sidekiq_queue_manager/application.js",
        modals_css_path: "#{mount_path}/assets/sidekiq_queue_manager/modals.css",
        use_asset_pipeline: false
      }
    end

    # Common helper for accessing main application methods
    def main_app
      @main_app ||= Rails.application.routes.url_helpers
    end

    # Logging helpers with gem prefix using Ruby's method delegation
    %w[info error].each do |level|
      define_method "log_#{level}" do |message|
        Rails.logger.public_send(level, "[SidekiqQueueManager] #{message}")
      end
    end
  end
end

