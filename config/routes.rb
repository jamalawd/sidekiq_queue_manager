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

