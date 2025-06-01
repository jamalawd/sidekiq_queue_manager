# frozen_string_literal: true

module SidekiqQueueManager
  # Core service class for managing ANY Sidekiq queues
  #
  # Automatically discovers and provides management for all Sidekiq queues
  # in the application. Works with any queue names, job types, and configurations.
  #
  # Features:
  # - Queue pause/resume operations for any queue
  # - Real-time statistics and monitoring
  # - Bulk operations across multiple queues
  # - Configurable queue priorities and protection
  # - Health monitoring and diagnostics
  #
  # All operations return structured responses with success/failure status
  # and detailed error messages for proper error handling.
  #
  class QueueService
    # Default queue priority for unknown queues (higher number = higher priority)
    DEFAULT_QUEUE_PRIORITY = 1

    class << self
      # ========================================
      # Queue Control Operations
      # ========================================

      # Pause a specific queue
      # @param queue_name [String] the name of the queue to pause
      # @return [Hash] response with success status and message
      def pause_queue(queue_name)
        return failure_response('Invalid queue name') unless valid_queue?(queue_name)
        return failure_response('Cannot pause critical queue') if critical_queue?(queue_name)

        queue = Sidekiq::Queue[queue_name]
        result = queue.pause

        if operation_successful?(result)
          update_queue_stats(queue_name, 'paused')
          log_operation("Queue '#{queue_name}' paused - result: #{result}")
          success_response("Queue '#{queue_name}' paused successfully")
        else
          log_error("Failed to pause queue '#{queue_name}': unexpected result '#{result}'")
          failure_response("Failed to pause queue '#{queue_name}'")
        end
      rescue StandardError => e
        handle_service_error(e, "pause queue '#{queue_name}'")
      end

      # Resume a specific queue
      # @param queue_name [String] the name of the queue to resume
      # @return [Hash] response with success status and message
      def resume_queue(queue_name)
        return failure_response('Invalid queue name') unless valid_queue?(queue_name)

        queue = Sidekiq::Queue[queue_name]
        result = queue.unpause

        if operation_successful?(result)
          update_queue_stats(queue_name, 'active')
          status_msg = result.zero? ? '(already active)' : ''
          log_operation("Queue '#{queue_name}' resumed - result: #{result} #{status_msg}")
          success_response("Queue '#{queue_name}' resumed successfully")
        else
          log_error("Failed to resume queue '#{queue_name}': unexpected result '#{result}'")
          failure_response("Failed to resume queue '#{queue_name}'")
        end
      rescue StandardError => e
        handle_service_error(e, "resume queue '#{queue_name}'")
      end

      # Pause all non-critical queues using Ruby's functional approach
      # @return [Hash] response with count of paused queues
      def pause_all_queues
        results = available_queues.filter_map do |queue_name|
          next :skipped if critical_queue?(queue_name)

          pause_queue(queue_name)[:success] ? :paused : queue_name
        end

        paused_count = results.count(:paused)
        skipped_count = results.count(:skipped)
        failed_queues = results - %i[paused skipped]

        message = build_bulk_operation_message('pause', paused_count, skipped_count, failed_queues)
        log_operation(message)

        success_response(message,
                         paused: paused_count,
                         skipped: skipped_count,
                         failed: failed_queues)
      rescue StandardError => e
        handle_service_error(e, 'bulk pause operation')
      end

      # Resume all queues using Ruby's functional approach
      # @return [Hash] response with count of resumed queues
      def resume_all_queues
        results = available_queues.filter_map do |queue_name|
          next :skipped if critical_queue?(queue_name)

          resume_queue(queue_name)[:success] ? :resumed : queue_name
        end

        resumed_count = results.count(:resumed)
        skipped_count = results.count(:skipped)
        failed_queues = results - %i[resumed skipped]

        message = build_bulk_operation_message('resume', resumed_count, skipped_count, failed_queues)
        log_operation(message)

        success_response(message,
                         resumed: resumed_count,
                         skipped: skipped_count,
                         failed: failed_queues)
      rescue StandardError => e
        handle_service_error(e, 'bulk resume operation')
      end

      # ========================================
      # Statistics and Monitoring
      # ========================================

      # Get comprehensive queue metrics using Ruby's expressive data transformation
      # @return [Hash] complete queue statistics and global metrics
      def queue_metrics
        sidekiq_stats = Sidekiq::Stats.new
        queue_stats = available_queues.index_with { |name| build_queue_metrics(name) }

        {
          global_stats: extract_global_stats(sidekiq_stats),
          queues: queue_stats,
          timestamp: Time.current.iso8601,
          cache_buster: Time.current.to_f
        }
      rescue StandardError => e
        handle_service_error(e, 'get queue metrics')
      end

      # Get status information for a specific queue or all queues
      # @param queue_name [String, nil] specific queue name or nil for all queues
      # @return [Hash] queue status information
      def queue_status(queue_name = nil)
        return single_queue_status(queue_name) if queue_name

        available_queues.map { |name| single_queue_status(name) }
      rescue StandardError => e
        handle_service_error(e, 'get queue status')
      end

      # ========================================
      # Advanced Queue Operations
      # ========================================

      def view_queue_jobs(queue_name, page: 1, per_page: 10)
        return failure_response('Invalid queue name') unless valid_queue?(queue_name)

        # Ruby idiom: use clamp for bounds checking
        page = page.to_i.clamp(1, Float::INFINITY)
        per_page = per_page.to_i.clamp(1, 100) # Max 100 per page for performance

        queue = Sidekiq::Queue[queue_name]
        total_jobs = queue.size

        # Use Ruby's slice and map for elegant data transformation
        offset = (page - 1) * per_page
        jobs = queue.to_a.slice(offset, per_page)&.map&.with_index do |job, index|
          format_job_data(job, offset + index + 1)
        end || []

        success_response('Queue jobs retrieved successfully',
                         queue_name: queue_name,
                         size: total_jobs,
                         latency: queue.latency.round(2),
                         jobs: jobs,
                         pagination: build_pagination_data(page, per_page, total_jobs))
      rescue StandardError => e
        handle_service_error(e, "get jobs for queue '#{queue_name}'")
      end

      def delete_job(queue_name, job_id)
        return failure_response('Invalid queue name') unless valid_queue?(queue_name)
        return failure_response('Invalid job ID') if job_id.blank?

        queue = Sidekiq::Queue[queue_name]
        job = queue.find_job(job_id)

        return failure_response('Job not found') unless job

        job.delete
        log_operation("Job #{job_id} deleted from queue '#{queue_name}'")
        success_response("Job #{job_id} deleted successfully")
      rescue StandardError => e
        handle_service_error(e, "delete job #{job_id} from queue '#{queue_name}'")
      end

      # Enhanced queue management methods with Ruby idioms
      %w[set_queue_limit remove_queue_limit set_process_limit remove_process_limit
         block_queue unblock_queue].each do |method_name|
        define_method method_name do |queue_name, *args|
          return failure_response('Invalid queue name') unless valid_queue?(queue_name)

          queue = Sidekiq::Queue[queue_name]
          operation = method_name.split('_')[0] # 'set', 'remove', 'block', 'unblock'
          attribute = method_name.match(/_(queue_|process_)?(.+)$/)[2] # 'limit', 'process_limit'

          perform_queue_operation(queue, queue_name, operation, attribute, *args)
        rescue StandardError => e
          handle_service_error(e, "#{method_name.humanize.downcase} for queue '#{queue_name}'")
        end
      end

      def clear_queue(queue_name)
        return failure_response('Invalid queue name') unless valid_queue?(queue_name)
        return failure_response('Cannot clear critical queue') if critical_queue?(queue_name)

        queue = Sidekiq::Queue[queue_name]
        jobs_cleared = queue.size
        queue.clear

        log_operation("Queue '#{queue_name}' cleared - #{jobs_cleared} jobs removed")
        success_response("Queue '#{queue_name}' cleared successfully", jobs_cleared: jobs_cleared)
      rescue StandardError => e
        handle_service_error(e, "clear queue '#{queue_name}'")
      end

      private

      # ========================================
      # Queue Information Helpers
      # ========================================

      def available_queues
        @available_queues ||= discover_queues
      end

      # Ruby's functional approach to queue discovery
      def discover_queues
        [
          # Method 1: Sidekiq's built-in discovery
          -> { Sidekiq::Queue.all.map(&:name) },
          # Method 2: Redis queues set
          -> { Sidekiq.redis { |conn| conn.smembers('queues') } },
          # Method 3: Redis queue keys
          -> { discover_redis_queue_keys }
        ].flat_map(&:call).uniq.sort
      end

      def discover_redis_queue_keys
        Sidekiq.redis do |conn|
          conn.keys('queue:*').filter_map do |key|
            key.delete_prefix('queue:').presence
          end
        end
      end

      # Ruby predicate methods for cleaner conditionals
      def valid_queue?(queue_name) = queue_name.is_a?(String) && available_queues.include?(queue_name)
      def critical_queue?(queue_name) = SidekiqQueueManager.critical_queue?(queue_name)
      def queue_paused?(queue_name) = Sidekiq::Queue[queue_name].paused?
      def queue_priority(queue_name) = SidekiqQueueManager.queue_priority(queue_name)

      # ========================================
      # Statistics Builders
      # ========================================

      def build_queue_metrics(queue_name)
        queue = Sidekiq::Queue[queue_name]

        {
          name: queue_name,
          size: queue.size,
          latency: queue.latency.round(2),
          paused: queue_paused?(queue_name),
          critical: critical_queue?(queue_name),
          priority: queue_priority(queue_name),
          busy: busy_workers_for_queue(queue_name),
          # sidekiq-limit_fetch integration with safe attribute access
          limit: safe_queue_attribute(queue, :limit),
          process_limit: safe_queue_attribute(queue, :process_limit),
          blocked: safe_queue_attribute(queue, :blocking?, false)
        }
      end

      def extract_global_stats(sidekiq_stats)
        {
          processed: sidekiq_stats.processed,
          failed: sidekiq_stats.failed,
          busy: total_busy_workers,
          enqueued: total_enqueued_jobs,
          processes: sidekiq_stats.processes_size,
          workers: sidekiq_stats.workers_size,
          retry_size: sidekiq_stats.retry_size,
          dead_size: sidekiq_stats.dead_size,
          scheduled_size: sidekiq_stats.scheduled_size
        }
      end

      # ========================================
      # Helper Methods
      # ========================================

      # Ruby idiom: intention-revealing method names
      def operation_successful?(result) = ['OK', 1, 0].include?(result)
      def positive_integer?(value) = value.is_a?(Integer) && value.positive?

      def single_queue_status(queue_name)
        return failure_response('Invalid queue name') unless valid_queue?(queue_name)

        queue = Sidekiq::Queue[queue_name]
        {
          name: queue_name,
          size: queue.size,
          latency: queue.latency.round(2),
          paused: queue_paused?(queue_name),
          critical: critical_queue?(queue_name),
          priority: queue_priority(queue_name)
        }
      end

      def format_job_data(job, position)
        {
          position: position,
          jid: job.jid,
          class: job.klass,
          args: job.args,
          created_at: job.created_at&.strftime('%Y-%m-%d %H:%M:%S'),
          enqueued_at: job.enqueued_at&.strftime('%Y-%m-%d %H:%M:%S'),
          retry_count: job['retry_count'] || 0,
          queue: job.queue
        }
      end

      def build_bulk_operation_message(operation, success_count, skipped_count, failed_queues)
        message = "Bulk #{operation} completed. #{operation.capitalize}d: #{success_count}, Skipped: #{skipped_count}"
        message += ", Failed: #{failed_queues.join(', ')}" if failed_queues.any?
        message
      end

      def perform_queue_operation(queue, queue_name, operation, attribute, *args)
        case operation
        when 'set'
          limit = args.first&.to_i
          return failure_response('Invalid limit') unless positive_integer?(limit)

          queue.public_send("#{attribute}=", limit)
          log_operation("Queue '#{queue_name}' #{attribute} set to #{limit}")
          success_response("Queue '#{queue_name}' #{attribute} set to #{limit}")
        when 'remove'
          queue.public_send("#{attribute}=", nil)
          log_operation("Queue '#{queue_name}' #{attribute} removed")
          success_response("Queue '#{queue_name}' #{attribute} removed")
        when 'block'
          queue.block
          log_operation("Queue '#{queue_name}' blocked")
          success_response("Queue '#{queue_name}' blocked successfully")
        when 'unblock'
          queue.unblock
          log_operation("Queue '#{queue_name}' unblocked")
          success_response("Queue '#{queue_name}' unblocked successfully")
        end
      end

      # Safe attribute access with Ruby's method handling
      def safe_queue_attribute(queue, attribute, default = nil)
        queue.public_send(attribute)
      rescue StandardError
        default
      end

      def busy_workers_for_queue(queue_name)
        Sidekiq::Workers.new.count { |_, _, work| work['queue'] == queue_name }
      rescue StandardError => e
        log_error("Failed to get busy workers for queue '#{queue_name}': #{e.message}")
        0
      end

      def total_busy_workers
        Sidekiq::Workers.new.size
      rescue StandardError => e
        log_error("Failed to get total busy workers: #{e.message}")
        0
      end

      def total_enqueued_jobs
        available_queues.sum { |queue_name| Sidekiq::Queue[queue_name].size }
      rescue StandardError => e
        log_error("Failed to get total enqueued jobs: #{e.message}")
        0
      end

      # ========================================
      # Response Builders (Ruby's expressive approach)
      # ========================================

      def success_response(message, **data)
        build_response(true, message, **data)
      end

      def failure_response(message, **data)
        build_response(false, message, **data)
      end

      def build_response(success, message, **data)
        {
          success: success,
          message: message,
          timestamp: Time.current.iso8601
        }.merge(data)
      end

      # ========================================
      # Error Handling (Ruby's approach to exceptions)
      # ========================================

      def handle_service_error(error, operation)
        log_error("Failed to #{operation}: #{error.message}")
        failure_response("Failed to #{operation}: #{error.message}")
      end

      # ========================================
      # Logging Helpers
      # ========================================

      def log_operation(message)
        return unless SidekiqQueueManager.enable_logging?

        Rails.logger.public_send(
          SidekiqQueueManager.configuration.log_level,
          "[SidekiqQueueManager] #{message}"
        )
      end

      def log_error(message)
        return unless SidekiqQueueManager.enable_logging?

        Rails.logger.error("[SidekiqQueueManager] #{message}")
      end

      # ========================================
      # Data Management
      # ========================================

      def update_queue_stats(queue_name, status)
        return unless SidekiqQueueManager.enable_caching?

        stats_key = "#{redis_key_prefix}:#{queue_name}"

        Sidekiq.redis do |conn|
          conn.hset(stats_key, 'status', status.to_s)
          conn.hset(stats_key, 'updated_at', Time.current.to_i.to_s)
          conn.expire(stats_key, SidekiqQueueManager.configuration.cache_ttl)
        end
      rescue StandardError => e
        log_error("Failed to update queue stats for '#{queue_name}': #{e.message}")
      end

      def redis_key_prefix = SidekiqQueueManager.configuration.redis_key_prefix

      def build_pagination_data(page, per_page, total_items)
        total_pages = (total_items.to_f / per_page).ceil

        {
          current_page: page,
          per_page: per_page,
          total_pages: total_pages,
          total_jobs: total_items,
          has_previous: page > 1,
          has_next: page < total_pages
        }
      end
    end
  end
end

