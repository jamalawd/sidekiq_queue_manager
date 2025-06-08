# frozen_string_literal: true

module SidekiqQueueManager
  # Controller to serve assets when the asset pipeline is not available
  # This ensures CSS and JavaScript work in API-only Rails apps
  class AssetsController < ApplicationController
    # Skip CSRF protection for asset requests
    skip_before_action :verify_authenticity_token

    # Serve CSS file
    def css
      css_content = load_asset_file('application.css')

      respond_to do |format|
        format.css do
          render plain: css_content, content_type: 'text/css'
        end
        format.all do
          render plain: css_content, content_type: 'text/css'
        end
      end
    rescue StandardError => e
      Rails.logger.error "[SidekiqQueueManager] Error serving CSS: #{e.message}"
      render plain: "/* CSS loading error: #{e.message} */", content_type: 'text/css'
    end

    # Serve JavaScript file
    def js
      js_content = load_asset_file('application.js')

      respond_to do |format|
        format.js do
          render plain: js_content, content_type: 'application/javascript'
        end
        format.all do
          render plain: js_content, content_type: 'application/javascript'
        end
      end
    rescue StandardError => e
      Rails.logger.error "[SidekiqQueueManager] Error serving JS: #{e.message}"
      render plain: "/* JavaScript loading error: #{e.message} */", content_type: 'application/javascript'
    end

    # Serve modals CSS file
    def modals_css
      css_content = load_asset_file('modals.css')

      respond_to do |format|
        format.css do
          render plain: css_content, content_type: 'text/css'
        end
        format.all do
          render plain: css_content, content_type: 'text/css'
        end
      end
    rescue StandardError => e
      Rails.logger.error "[SidekiqQueueManager] Error serving modals CSS: #{e.message}"
      render plain: "/* Modals CSS loading error: #{e.message} */", content_type: 'text/css'
    end

    private

    # Load asset file from the gem's asset directory
    def load_asset_file(filename)
      asset_path = case filename
                   when 'application.css'
                     File.join(gem_assets_path, 'stylesheets', 'sidekiq_queue_manager', 'application.css')
                   when 'modals.css'
                     File.join(gem_assets_path, 'stylesheets', 'sidekiq_queue_manager', 'modals.css')
                   when 'application.js'
                     File.join(gem_assets_path, 'javascripts', 'sidekiq_queue_manager', 'application.js')
                   else
                     raise "Unknown asset: #{filename}"
                   end

      raise "Asset file not found: #{asset_path}" unless File.exist?(asset_path)

      File.read(asset_path)
    end

    # Get the path to the gem's assets directory
    def gem_assets_path
      @gem_assets_path ||= File.expand_path('../../assets', __dir__)
    end
  end
end

