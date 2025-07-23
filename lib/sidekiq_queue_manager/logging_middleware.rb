# frozen_string_literal: true

module SidekiqQueueManager
  # Simple logging middleware for SidekiqQueueManager requests
  class LoggingMiddleware
    def initialize(app)
      @app = app
    end

    def call(env)
      start_time = Time.current
      status, headers, body = @app.call(env)

      # Only log if this request was handled by our engine
      if handled_by_sidekiq_queue_manager?(env)
        end_time = Time.current
        duration = (end_time - start_time) * 1000 # milliseconds
        path_info = env['PATH_INFO'] || ''

        Rails.logger.info "[SidekiqQueueManager] #{env['REQUEST_METHOD']} #{path_info} - #{status} (#{duration.round(2)}ms)"
      end

      [status, headers, body]
    end

    private

    # Check if the request was handled by our engine controllers
    def handled_by_sidekiq_queue_manager?(env)
      # Check if the controller class is from our engine
      controller_class = env['action_controller.instance']&.class&.name
      controller_class&.start_with?('SidekiqQueueManager::')
    end
  end
end

