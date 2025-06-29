# Sidekiq Queue Manager Installation Guide

## Installation

Add this line to your application's Gemfile:

```ruby
gem 'sidekiq_queue_manager'
```

And then execute:

```bash
bundle install
```

## Quick Setup

### **1. Set Authentication (REQUIRED)**

Create `config/initializers/sidekiq_queue_manager.rb`:

```ruby
SidekiqQueueManager.configure do |config|
  # REQUIRED: Set basic auth password (follows Sidekiq Web UI pattern)
  config.basic_auth_password = 'your-secure-password-here'
  
  # Optional: Protect critical queues
  config.critical_queues = %w[mailers high_priority]
end
```

**⚠️ Professional Standard**: Like Sidekiq Web UI, this gem requires explicit authentication configuration. You must set a password or configure custom authentication.

### **2. Mount the Engine**

Add to your `config/routes.rb`:

```ruby
Rails.application.routes.draw do
  mount SidekiqQueueManager::Engine => '/sidekiq_manager'
  # your other routes...
end
```

### **3. Access the Interface**

Visit `http://localhost:3000/sidekiq_manager` and login with:

- **Username**: `admin` (default)
- **Password**: `your-secure-password-here`

That's it! 🎉

## Authentication Options

### Basic HTTP Authentication (Default)

Following professional standards like Sidekiq Web UI, the gem uses explicit authentication:

```ruby
SidekiqQueueManager.configure do |config|
  config.basic_auth_password = 'your-secure-password'
  config.basic_auth_username = 'admin'  # optional, defaults to 'admin'
end
```

### Custom Authentication

Integrate with your existing Rails authentication system:

```ruby
SidekiqQueueManager.configure do |config|
  config.authentication_method = :authenticate_admin!  # Your method name
  config.basic_auth_enabled = false  # Disable basic auth when using custom
end

# Then implement in your ApplicationController:
class ApplicationController < ActionController::Base
  private

  def authenticate_admin!
    redirect_to login_path unless current_user&.admin?
  end
end
```

### Disable Authentication (Development Only)

```ruby
SidekiqQueueManager.configure do |config|
  config.basic_auth_enabled = false  # NOT recommended for production
end
```

### Professional Examples

#### Rails App with Devise

```ruby
# config/initializers/sidekiq_queue_manager.rb
SidekiqQueueManager.configure do |config|
  # Integrate with Devise authentication
  config.authentication_method = :authenticate_user!
  config.basic_auth_enabled = false
  config.critical_queues = %w[mailers]
end
```

#### Rails App with Custom Auth

```ruby
# config/initializers/sidekiq_queue_manager.rb  
SidekiqQueueManager.configure do |config|
  # Use custom authentication method
  config.authentication_method = :require_admin_access!
  config.basic_auth_enabled = false
  config.critical_queues = %w[mailers]
end
```

#### API-only Rails App (No Authentication)

```ruby
# config/initializers/sidekiq_queue_manager.rb
SidekiqQueueManager.configure do |config|
  # Basic auth required for security
  config.basic_auth_password = ENV['SIDEKIQ_ADMIN_PASSWORD']
  config.critical_queues = %w[mailers]
end
```

## Advanced Configuration

For complete configuration options, see `examples/advanced_configuration.rb`.

## What You DON'T Need to Configure

The gem handles these automatically:

- ✅ Asset compilation and loading (CSS, JavaScript, modals)
- ✅ Redis connection (uses Sidekiq's connection)
- ✅ Cache TTL and Redis key prefixes
- ✅ UI refresh rates and timeouts
- ✅ Default queue priorities

## Troubleshooting

### Configuration Error: Password Required

```bash
basic_auth_password must be set when basic_auth_enabled is true
```

**Solution**: Set a password in your configuration:

```ruby
config.basic_auth_password = ENV['SIDEKIQ_ADMIN_PASSWORD']
```

### Runtime Error: Authentication Not Configured

If you see "Sidekiq Queue Manager: Authentication Not Configured" when accessing the interface:

**Cause**: You have `basic_auth_enabled = true` (default) but haven't set a password.

**Solution**: Add password to your `config/initializers/sidekiq_queue_manager.rb`:

```ruby
SidekiqQueueManager.configure do |config|
  config.basic_auth_password = 'your-secure-password'
end
```

### Missing Sidekiq Dependencies

If you see warnings about `sidekiq-limit_fetch`:

```bash
sidekiq-limit_fetch not available
```

**Solution**: This is normal and safe. The gem works without it but some advanced features may be limited.

### Compatibility

- ✅ Rails 7.0+
- ✅ Sidekiq 7.0+  
- ✅ Ruby 3.0+
- ✅ API-only Rails apps
- ✅ Standard Rails apps with asset pipeline
