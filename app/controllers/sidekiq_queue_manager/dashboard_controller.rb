# frozen_string_literal: true

module SidekiqQueueManager
  # Main dashboard controller providing the web interface for queue management
  #
  # Handles both JSON API responses and HTML views for the queue manager interface.
  # Includes comprehensive error handling, authentication, and real-time updates.
  #
  class DashboardController < ApplicationController
    include ActionController::Live

    # Prevent CSRF token issues with JSON API requests
    protect_from_forgery with: :null_session, if: -> { request.format.json? }

    # Apply authentication if configured
    before_action :authenticate_user!, if: -> { authentication_required? }
    before_action :set_queue_name, only: %i[
      queue_status pause_queue resume_queue jobs delete_job
      set_limit remove_limit set_process_limit remove_process_limit
      block unblock clear delete_queue
    ]

    # Comprehensive error handling for all controller actions
    rescue_from StandardError, with: :handle_api_error
    rescue_from SidekiqQueueManager::ServiceError, with: :handle_service_error
    rescue_from ActionController::ParameterMissing, with: :handle_parameter_error

    # ========================================
    # Main Dashboard Actions
    # ========================================

    # Main dashboard interface - serves both HTML and JSON
    # GET /
    def index
      respond_to do |format|
        format.html { render_dashboard_html }
        format.json { render_dashboard_json }
      end
    end

    # Real-time metrics endpoint for AJAX updates
    # GET /metrics
    def metrics
      set_no_cache_headers
      render json: api_response(data: QueueService.queue_metrics)
    end

    # Server-Sent Events stream for real-time updates
    # GET /live
    def live_stream
      response.headers['Content-Type'] = 'text/event-stream'
      response.headers['Cache-Control'] = 'no-cache'
      response.headers['X-Accel-Buffering'] = 'no'

      begin
        # Send initial data
        send_sse_event('metrics', QueueService.queue_metrics)

        # Stream updates every refresh interval
        loop do
          sleep(refresh_interval_seconds)

          metrics = QueueService.queue_metrics
          send_sse_event('metrics', metrics)
        end
      rescue ActionController::Live::ClientDisconnected
        logger.info('Client disconnected from live stream')
      rescue StandardError => e
        logger.error("Live stream error: #{e.message}")
        send_sse_event('error', { message: 'Stream error occurred' })
      ensure
        response.stream.close
      end
    end

    # ========================================
    # Queue Control Actions (JSON API)
    # ========================================

    # Pause a specific queue
    # POST /queues/:name/pause
    def pause_queue
      result = QueueService.pause_queue(@queue_name)
      render json: api_response(
        success: result[:success],
        message: result[:message],
        data: result
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Resume a specific queue
    # POST /queues/:name/resume
    def resume_queue
      result = QueueService.resume_queue(@queue_name)
      render json: api_response(
        success: result[:success],
        message: result[:message],
        data: result
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Get status for a specific queue
    # GET /queues/:name/status
    def queue_status
      result = QueueService.queue_status(@queue_name)
      render json: api_response(data: result)
    end

    # Bulk pause all non-critical queues
    # POST /queues/pause_all
    def pause_all
      result = QueueService.pause_all_queues
      render json: api_response(
        success: result[:success],
        message: result[:message],
        data: result
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Bulk resume all queues
    # POST /queues/resume_all
    def resume_all
      result = QueueService.resume_all_queues
      render json: api_response(
        success: result[:success],
        message: result[:message],
        data: result
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Global summary statistics
    # GET /queues/summary
    def summary
      set_no_cache_headers

      metrics = QueueService.queue_metrics
      summary_data = {
        total_queues: metrics[:queues].size,
        total_enqueued: metrics[:global_stats][:enqueued],
        total_busy: metrics[:global_stats][:busy],
        paused_queues: metrics[:queues].count { |_, queue| queue[:paused] },
        critical_queues: metrics[:queues].count { |_, queue| queue[:critical] }
      }

      render json: api_response(data: summary_data)
    end

    # ========================================
    # Advanced Queue Operations
    # ========================================

    # View jobs in a specific queue with pagination
    # GET /queues/:name/jobs
    def jobs
      page = params[:page] || 1
      per_page = params[:per_page] || 10

      result = QueueService.view_queue_jobs(@queue_name, page: page, per_page: per_page)
      render json: api_response(
        success: result[:success],
        message: result[:message],
        data: result
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Delete a specific job from a queue
    # DELETE /queues/:name/delete_job
    def delete_job
      job_id = params.require(:job_id)

      result = QueueService.delete_job(@queue_name, job_id)
      render json: api_response(
        success: result[:success],
        message: result[:message]
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Set queue limit
    # POST /queues/:name/set_limit
    def set_limit
      limit = params.require(:limit).to_i

      result = QueueService.set_queue_limit(@queue_name, limit)
      render json: api_response(
        success: result[:success],
        message: result[:message]
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Remove queue limit
    # DELETE /queues/:name/remove_limit
    def remove_limit
      result = QueueService.remove_queue_limit(@queue_name)
      render json: api_response(
        success: result[:success],
        message: result[:message]
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Set process limit
    # POST /queues/:name/set_process_limit
    def set_process_limit
      limit = params.require(:limit).to_i

      result = QueueService.set_process_limit(@queue_name, limit)
      render json: api_response(
        success: result[:success],
        message: result[:message]
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Remove process limit
    # DELETE /queues/:name/remove_process_limit
    def remove_process_limit
      result = QueueService.remove_process_limit(@queue_name)
      render json: api_response(
        success: result[:success],
        message: result[:message]
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Block a queue
    # POST /queues/:name/block
    def block
      result = QueueService.block_queue(@queue_name)
      render json: api_response(
        success: result[:success],
        message: result[:message]
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Unblock a queue
    # POST /queues/:name/unblock
    def unblock
      result = QueueService.unblock_queue(@queue_name)
      render json: api_response(
        success: result[:success],
        message: result[:message]
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Clear all jobs from a queue
    # POST /queues/:name/clear
    def clear
      result = QueueService.clear_queue(@queue_name)
      render json: api_response(
        success: result[:success],
        message: result[:message],
        data: result[:data]
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    # Delete a queue completely
    # DELETE /queues/:name
    def delete_queue
      result = QueueService.delete_queue(@queue_name)
      render json: api_response(
        success: result[:success],
        message: result[:message],
        data: result[:data]
      ), status: result[:success] ? :ok : :unprocessable_entity
    end

    private

    # ========================================
    # Helper Methods
    # ========================================

    def render_dashboard_html
      @initial_metrics = QueueService.queue_metrics
      @configuration = SidekiqQueueManager.configuration.to_h
      render template: 'sidekiq_queue_manager/dashboard/index'
    end

    def render_dashboard_json
      set_no_cache_headers
      render json: api_response(data: QueueService.queue_metrics)
    end

    def set_queue_name
      @queue_name = params[:name] || params[:queue_name]

      if @queue_name.blank?
        render json: api_error_response('Queue name is required'), status: :bad_request
        return
      end

      # Validate queue name exists
      return if available_queue_names.include?(@queue_name)

      render json: api_error_response("Invalid queue name: #{@queue_name}"), status: :not_found
      nil
    end

    def available_queue_names
      @available_queue_names ||= SidekiqQueueManager::QueueService.send(:available_queues)
    end

    def authentication_required?
      SidekiqQueueManager.configuration.authentication_method.present?
    end

    def authenticate_user!
      method_name = SidekiqQueueManager.configuration.authentication_method
      send(method_name) if respond_to?(method_name, true)
    end

    def refresh_interval_seconds
      SidekiqQueueManager.configuration.refresh_interval / 1000.0
    end

    # ========================================
    # Server-Sent Events Helpers
    # ========================================

    def send_sse_event(event_type, data)
      response.stream.write("event: #{event_type}\n")
      response.stream.write("data: #{data.to_json}\n\n")
    rescue StandardError => e
      logger.error("Failed to send SSE event: #{e.message}")
    end

    # ========================================
    # Response Formatters
    # ========================================

    def api_response(success: true, message: nil, data: nil, **extra)
      response_hash = {
        success: success,
        timestamp: Time.current.iso8601
      }

      response_hash[:message] = message if message.present?
      response_hash[:data] = data if data.present?
      response_hash.merge!(extra) if extra.any?

      response_hash
    end

    def api_error_response(message, **extra)
      api_response(success: false, message: message, **extra)
    end

    # ========================================
    # HTTP Headers
    # ========================================

    def set_no_cache_headers
      response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
      response.headers['Pragma'] = 'no-cache'
      response.headers['Expires'] = '0'
    end

    # ========================================
    # Error Handlers
    # ========================================

    def handle_api_error(exception)
      logger.error("API Error: #{exception.class} - #{exception.message}")
      logger.error(exception.backtrace.join("\n")) if Rails.env.development?

      error_message = if Rails.env.production?
                        'An unexpected error occurred'
                      else
                        "#{exception.class}: #{exception.message}"
                      end

      render json: api_error_response(error_message), status: :internal_server_error
    end

    def handle_service_error(exception)
      logger.error("Service Error: #{exception.message}")
      render json: api_error_response(exception.message), status: :unprocessable_entity
    end

    def handle_parameter_error(exception)
      logger.warn("Parameter Error: #{exception.message}")
      render json: api_error_response("Missing required parameter: #{exception.param}"),
             status: :bad_request
    end
  end
end

