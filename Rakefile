# frozen_string_literal: true

require 'bundler/gem_tasks'

begin
  require 'rubocop/rake_task'
  RuboCop::RakeTask.new
rescue LoadError
  # RuboCop not available
end

# ========================================
# Default Task
# ========================================

task default: [:build]

# ========================================
# Utility Tasks
# ========================================

desc 'Show gem version'
task version: :environment do
  require_relative 'lib/sidekiq_queue_manager/version'
  puts "Sidekiq Queue Manager v#{SidekiqQueueManager::VERSION}"
end

desc 'Clean up generated files'
task clean: :environment do
  FileUtils.rm_rf('pkg')
  FileUtils.rm_f(Dir.glob('*.gem'))
  puts '✅ Cleaned up generated files'
end

# ========================================
# Asset Tasks
# ========================================

desc 'Verify assets exist'
task assets: :environment do
  css_file = 'app/assets/stylesheets/sidekiq_queue_manager/application.css'
  js_file = 'app/assets/javascripts/sidekiq_queue_manager/application.js'

  if File.exist?(css_file) && File.exist?(js_file)
    puts '✅ Asset files found and ready'
  else
    puts '❌ Asset files missing!'
    exit 1
  end
end

