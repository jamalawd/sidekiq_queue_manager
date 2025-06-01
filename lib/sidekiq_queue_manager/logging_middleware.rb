# frozen_string_literal: true

module SidekiqQueueManager
  # Simple logging middleware for SidekiqQueueManager requests
  class LoggingMiddleware
    def initialize(app)
      @app = app
    end

    def call(env)
      # Only log requests to our gem's paths
      if env['PATH_INFO'].start_with?('/sidekiq_dashboard')
        start_time = Time.current

        status, headers, body = @app.call(env)

        end_time = Time.current
        duration = (end_time - start_time) * 1000 # milliseconds

        Rails.logger.info "[SidekiqQueueManager] #{env['REQUEST_METHOD']} #{env['PATH_INFO']} - #{status} (#{duration.round(2)}ms)"

        [status, headers, body]
      else
        @app.call(env)
      end
    end
  end
end

