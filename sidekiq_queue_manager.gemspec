# frozen_string_literal: true

require_relative 'lib/sidekiq_queue_manager/version'

Gem::Specification.new do |spec|
  spec.name = 'sidekiq_queue_manager'
  spec.version = SidekiqQueueManager::VERSION
  spec.authors = ['Jamal Awad']
  spec.email = ['jamal.a@crawlbase.com']

  spec.summary = 'Professional Sidekiq queue monitoring and management interface'
  spec.description = <<~DESC
    A modern, real-time web interface for monitoring and managing Sidekiq queues.
    Features include live queue statistics, pause/resume operations, process limit management,
    bulk operations, and a responsive UI with zero configuration required.

    Perfect for production environments requiring professional queue monitoring capabilities.
    Built with Rails 7+ and shadcn-inspired design system for optimal user experience.
  DESC

  spec.homepage = 'https://github.com/jamalawd/sidekiq_queue_manager'
  spec.license = 'MIT'
  spec.required_ruby_version = '>= 3.0.0'

  # Enhanced metadata for better gem discoverability and tooling
  spec.metadata = {
    'homepage_uri' => spec.homepage,
    'source_code_uri' => "#{spec.homepage}/tree/master",
    'changelog_uri' => "#{spec.homepage}/blob/master/CHANGELOG.md",
    'bug_tracker_uri' => "#{spec.homepage}/issues",
    'documentation_uri' => "#{spec.homepage}/blob/master/README.md",
    'wiki_uri' => "#{spec.homepage}/wiki",
    'mailing_list_uri' => "#{spec.homepage}/discussions",
    'funding_uri' => "#{spec.homepage}/sponsors",
    'rubygems_mfa_required' => 'true',
    'allowed_push_host' => 'https://rubygems.org'
  }

  # Precise file inclusion - only include what's necessary for the gem
  spec.files = Dir.chdir(__dir__) do
    Dir[
      # Core library files
      'lib/**/*.rb',
      # Rails engine assets and views
      'app/assets/**/*',
      'app/controllers/**/*.rb',
      'app/services/**/*.rb',
      'app/views/**/*',
      # Configuration
      'config/**/*',
      # Documentation
      'README.md',
      'INSTALLATION.md',
      'LICENSE*',
      'CHANGELOG*'
    ].select { |f| File.file?(f) } +
      # Include hidden files that are important
      Dir['.github/workflows/*.yml'].select { |f| File.file?(f) }
  end

  spec.bindir = 'exe'
  spec.executables = spec.files.grep(%r{\Aexe/}) { |f| File.basename(f) }
  spec.require_paths = ['lib']

  # ========================================
  # Runtime Dependencies
  # ========================================

  # Core Rails framework - engine functionality
  spec.add_dependency 'rails', '>= 7.0.0', '< 8.0'

  # Sidekiq for background job processing
  spec.add_dependency 'sidekiq', '>= 7.0.0', '< 8.0'

  # Redis client (required by Sidekiq but explicit for clarity)
  spec.add_dependency 'redis', '>= 4.8.0', '< 6.0'

  # Enhanced queue management capabilities
  spec.add_dependency 'sidekiq-limit_fetch', '~> 4.4', '>= 4.4.0'

  # JSON handling for API responses
  spec.add_dependency 'multi_json', '~> 1.15'

  # ========================================
  # Development Dependencies
  # ========================================

  # Build tools only
  spec.add_development_dependency 'rake', '~> 13.0'
  spec.add_development_dependency 'rubocop', '~> 1.60'
  spec.add_development_dependency 'rubocop-performance', '~> 1.20'
  spec.add_development_dependency 'rubocop-rails', '~> 2.23'
end

