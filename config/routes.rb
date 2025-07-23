# frozen_string_literal: true

SidekiqQueueManager::Engine.routes.draw do
  # Asset serving routes (for apps without asset pipeline)
  get '/assets/sidekiq_queue_manager/application.css', to: 'assets#css'
  get '/assets/sidekiq_queue_manager/application.js', to: 'assets#js'
  get '/assets/sidekiq_queue_manager/modals.css', to: 'assets#modals_css'
  get '/stylesheets/sidekiq_queue_manager/application.css', to: 'assets#css'
  get '/stylesheets/sidekiq_queue_manager/modals.css', to: 'assets#modals_css'
  get '/javascripts/sidekiq_queue_manager/application.js', to: 'assets#js'
  get '/sidekiq_queue_manager/application.css', to: 'assets#css'
  get '/sidekiq_queue_manager/application.js', to: 'assets#js'
  get '/sidekiq_queue_manager/modals.css', to: 'assets#modals_css'

  # Main queue manager interface
  root 'dashboard#index'

  # Dashboard and metrics
  get '/', to: 'dashboard#index', as: :dashboard
  get '/metrics', to: 'dashboard#metrics', as: :metrics

  # Bulk operations (collection actions)
  post '/queues/pause_all', to: 'dashboard#pause_all', as: :pause_all_queues
  post '/queues/resume_all', to: 'dashboard#resume_all', as: :resume_all_queues
  get '/queues/summary', to: 'dashboard#summary', as: :queues_summary

  # Scheduled jobs management
  get '/scheduled', to: 'dashboard#scheduled_jobs', as: :scheduled_jobs
  delete '/scheduled/:id', to: 'dashboard#delete_scheduled_job', as: :delete_scheduled_job
  post '/scheduled/:id/enqueue', to: 'dashboard#enqueue_scheduled_job', as: :enqueue_scheduled_job
  post '/scheduled/clear', to: 'dashboard#clear_scheduled_jobs', as: :clear_scheduled_jobs

  # Retry jobs management
  get '/retries', to: 'dashboard#retry_jobs', as: :retry_jobs
  post '/retries/:id/retry', to: 'dashboard#retry_job_now', as: :retry_job_now
  delete '/retries/:id', to: 'dashboard#delete_retry_job', as: :delete_retry_job
  post '/retries/:id/kill', to: 'dashboard#kill_retry_job', as: :kill_retry_job
  post '/retries/clear', to: 'dashboard#clear_retry_jobs', as: :clear_retry_jobs
  post '/retries/retry_all', to: 'dashboard#retry_all_jobs', as: :retry_all_jobs

  # Dead jobs management
  get '/dead', to: 'dashboard#dead_jobs', as: :dead_jobs
  post '/dead/:id/resurrect', to: 'dashboard#resurrect_dead_job', as: :resurrect_dead_job
  delete '/dead/:id', to: 'dashboard#delete_dead_job', as: :delete_dead_job
  post '/dead/clear', to: 'dashboard#clear_dead_jobs', as: :clear_dead_jobs
  post '/dead/resurrect_all', to: 'dashboard#resurrect_all_dead_jobs', as: :resurrect_all_dead_jobs

  # Individual queue operations
  post '/queues/:name/pause', to: 'dashboard#pause_queue', as: :pause_queue
  post '/queues/:name/resume', to: 'dashboard#resume_queue', as: :resume_queue
  get '/queues/:name/status', to: 'dashboard#queue_status', as: :queue_status
  get '/queues/:name/jobs', to: 'dashboard#jobs', as: :queue_jobs
  delete '/queues/:name/delete_job', to: 'dashboard#delete_job', as: :delete_queue_job
  post '/queues/:name/clear', to: 'dashboard#clear', as: :clear_queue
  delete '/queues/:name', to: 'dashboard#delete_queue', as: :delete_queue

  # Queue limits and configuration
  post '/queues/:name/set_limit', to: 'dashboard#set_limit', as: :set_queue_limit
  delete '/queues/:name/remove_limit', to: 'dashboard#remove_limit', as: :remove_queue_limit
  post '/queues/:name/set_process_limit', to: 'dashboard#set_process_limit', as: :set_queue_process_limit
  delete '/queues/:name/remove_process_limit', to: 'dashboard#remove_process_limit', as: :remove_queue_process_limit

  # Advanced queue operations
  post '/queues/:name/block', to: 'dashboard#block', as: :block_queue
  post '/queues/:name/unblock', to: 'dashboard#unblock', as: :unblock_queue

  # Real-time updates via Server-Sent Events
  get '/live', to: 'dashboard#live_stream', as: :live_stream
end

