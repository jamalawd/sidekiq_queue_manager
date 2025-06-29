# 📊 Sidekiq Queue Manager

[![Gem Version](https://badge.fury.io/rb/sidekiq_queue_manager.svg)](https://badge.fury.io/rb/sidekiq_queue_manager)
[![Rails](https://img.shields.io/badge/Rails-7.0%2B-red.svg)](https://rubyonrails.org)
[![Ruby](https://img.shields.io/badge/Ruby-3.0%2B-red.svg)](https://ruby-lang.org)
[![Sidekiq](https://img.shields.io/badge/Sidekiq-7.0%2B-orange.svg)](https://sidekiq.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Professional Sidekiq queue monitoring and management interface for Rails applications.**

A modern, real-time web interface for monitoring and managing Sidekiq queues with zero configuration required. Perfect for production environments requiring professional queue monitoring capabilities.

---

## ✨ Features

### 🚀 **Real-Time Queue Management**

- **Live Statistics** - Real-time queue metrics with 5-second auto-refresh
- **Universal Queue Discovery** - Automatically detects ALL Sidekiq queues
- **Pause/Resume Operations** - Individual and bulk queue control
- **Advanced Queue Controls** - Set limits, block queues, manage process limits
- **Job Management** - View, delete, and paginate through individual jobs

### 🎨 **Professional Interface**

- **Modern UI/UX** - Dark-mode optimized responsive design
- **Live Pull Toggle** - Enable/disable real-time updates
- **Custom Modal System** - Professional confirmations and prompts
- **Mobile Responsive** - Optimized for all device sizes
- **Accessibility Ready** - ARIA labels, keyboard navigation, screen reader support

### 🔒 **Enterprise Features**

- **Authentication Integration** - Configurable authentication methods
- **Critical Queue Protection** - Prevents accidental modification of important queues
- **Security Headers** - Built-in CSP and security middleware
- **Comprehensive Logging** - Configurable request and operation logging
- **Error Recovery** - Automatic retry logic and graceful error handling

### ⚡ **Advanced Operations**

- **Queue Limits** - Set maximum job limits per queue
- **Process Limits** - Control how many processes can work on a queue
- **Queue Blocking** - Temporarily block queues from accepting new jobs
- **Bulk Operations** - Pause/resume multiple queues simultaneously
- **Job Inspection** - View job arguments, creation time, and metadata

---

## 🚀 Quick Start

### Installation

Add to your Gemfile:

```ruby
gem 'sidekiq_queue_manager'
```

```bash
bundle install
```

### Setup

Mount the engine in your routes:

```ruby
# config/routes.rb
Rails.application.routes.draw do
  mount SidekiqQueueManager::Engine, at: '/admin/queues'
  # or mount at root level
  # mount SidekiqQueueManager::Engine, at: '/queues'
end
```

**That's it!** 🎉 Visit `/admin/queues` to access your professional queue management interface.

---

## ⚙️ Configuration

### Basic Configuration

```ruby
# config/initializers/sidekiq_queue_manager.rb
SidekiqQueueManager.configure do |config|
  # Protect critical queues from bulk operations (recommended)
  config.critical_queues = ['mailer', 'billing', 'notifications']
  
  # Add authentication (recommended for production)
  config.authentication_method = :authenticate_admin!
  
  # Customize refresh interval (milliseconds)
  config.refresh_interval = 5000
  
  # Set theme preference
  config.theme = 'auto' # 'auto', 'dark', 'light'
end
```

### Advanced Configuration

```ruby
SidekiqQueueManager.configure do |config|
  # Security & Performance
  config.enable_csp = true
  config.enable_caching = true
  config.cache_ttl = 300
  
  # Logging
  config.enable_logging = true
  config.log_level = :info
  
  # Redis Configuration
  config.redis_timeout = 5
  config.redis_key_prefix = 'sqm'
  
  # Default Queue Priorities
  config.default_queue_priorities = {
    'critical' => 10,
    'high' => 7,
    'default' => 5,
    'low' => 1
  }
end
```

### Authentication Integration

```ruby
# config/initializers/sidekiq_queue_manager.rb
SidekiqQueueManager.configure do |config|
  config.authentication_method = :authenticate_admin!
end

# In your ApplicationController
def authenticate_admin!
  redirect_to login_path unless current_user&.admin?
end
```

---

## 📖 Usage Guide

### Dashboard Overview

The main dashboard provides:

- **Global Statistics** - Processed, failed, busy, and enqueued job counts
- **Queue Summary** - Total queues, paused queues, and total jobs
- **Live Controls** - Toggle real-time updates and manual refresh
- **Queue Table** - Detailed view of all queues with actions

### Queue Operations

#### Individual Queue Actions

- **Pause/Resume** - Stop or start job processing for specific queues
- **View Jobs** - Browse jobs with pagination and search
- **Delete Jobs** - Remove specific jobs from queues
- **Set Limits** - Configure maximum jobs and process limits
- **Block/Unblock** - Prevent new jobs from being enqueued

#### Bulk Operations

- **Pause All** - Pause all non-critical queues simultaneously
- **Resume All** - Resume all paused queues
- **Critical Queue Protection** - Automatically protects specified critical queues

### Advanced Features

#### Queue Limits

```ruby
# Set maximum jobs in queue
# Via UI: Queue Actions → Set Queue Limit
# Prevents queue from growing beyond specified size
```

#### Process Limits

```ruby
# Set maximum Sidekiq processes working on queue
# Via UI: Queue Actions → Set Process Limit  
# Controls parallel processing capacity
```

#### Job Management

- **Pagination** - Navigate through large job lists
- **Job Details** - View arguments, creation time, retry count
- **Individual Deletion** - Remove problematic jobs
- **Bulk Clearing** - Clear entire queues (with confirmation)

---

## 🔌 API Reference

The gem provides a comprehensive REST API for programmatic access:

### Global Endpoints

```http
GET  /metrics              # Real-time queue statistics
GET  /queues/summary       # Queue summary statistics
POST /queues/pause_all     # Pause all non-critical queues
POST /queues/resume_all    # Resume all paused queues
```

### Queue-Specific Endpoints

```http
GET    /queues/:name/status          # Get queue status
POST   /queues/:name/pause           # Pause specific queue
POST   /queues/:name/resume          # Resume specific queue
GET    /queues/:name/jobs            # List jobs (paginated)
DELETE /queues/:name/delete_job      # Delete specific job
POST   /queues/:name/clear           # Clear all jobs in queue

# Advanced Operations
POST   /queues/:name/set_limit       # Set queue limit
DELETE /queues/:name/remove_limit    # Remove queue limit
POST   /queues/:name/set_process_limit    # Set process limit
DELETE /queues/:name/remove_process_limit # Remove process limit
POST   /queues/:name/block           # Block queue
POST   /queues/:name/unblock         # Unblock queue
```

### Real-Time Updates

```http
GET /live    # Server-Sent Events stream for real-time updates
```

---

## 🛡️ Security

### Production Recommendations

1. **Authentication Required**

   ```ruby
   config.authentication_method = :authenticate_admin!
   ```

2. **Network Security**

   ```ruby
   # Mount behind authentication
   authenticated :admin do
     mount SidekiqQueueManager::Engine, at: '/admin/queues'
   end
   ```

3. **Critical Queue Protection**

   ```ruby
   config.critical_queues = ['billing', 'payments', 'notifications']
   ```

### Security Features

- **CSRF Protection** - Built-in Rails CSRF protection
- **Content Security Policy** - Configurable CSP headers
- **Request Logging** - Comprehensive request and action logging
- **Input Validation** - All parameters validated and sanitized

---

## 🚀 Deployment

### Production Setup

After setting limits or process limits, restart your Sidekiq processes:

```bash
# Systemd
sudo systemctl restart sidekiq

# Docker
docker-compose restart sidekiq

# Manual
kill -USR1 $(pgrep -f sidekiq)
```

### Docker Integration

```dockerfile
# Dockerfile
FROM ruby:3.1
# ... your existing setup

# The gem works seamlessly in containerized environments
RUN bundle install
```

### Heroku Deployment

The gem works out-of-the-box on Heroku with no additional configuration needed.

---

## 📋 Requirements

- **Ruby** 3.0 or higher
- **Rails** 7.0 or higher  
- **Sidekiq** 7.0 or higher
- **Redis** (required by Sidekiq)

### Compatibility

- ✅ **Sidekiq Pro/Enterprise** - Full compatibility
- ✅ **Multi-process Sidekiq** - Advanced process management
- ✅ **Existing Sidekiq setups** - Zero breaking changes
- ✅ **All queue types** - Works with any Sidekiq job
- ✅ **Docker/Kubernetes** - Container-ready
- ✅ **Heroku/Cloud platforms** - Platform-agnostic

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/jamalawd/sidekiq_queue_manager.git
cd sidekiq_queue_manager
bundle install

# Run tests
bundle exec rspec

# Start development server
cd spec/dummy
rails server
```

### Reporting Bugs

Please use our [Issue Tracker](https://github.com/jamalawd/sidekiq_queue_manager/issues) to report bugs or request features.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with ❤️ for the Ruby and Rails community by [Jamal Awad](https://github.com/jamalawd)  
- Powered by [Sidekiq](https://sidekiq.org) - Simple, efficient background processing
- Designed for production environments requiring professional queue management

---

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/jamalawd/sidekiq_queue_manager/wiki)
- **Issues**: [GitHub Issues](https://github.com/jamalawd/sidekiq_queue_manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jamalawd/sidekiq_queue_manager/discussions)

---

**Created and maintained by [Jamal Awad](https://github.com/jamalawd)**  
*Ruby enthusiast, tech lead, & architect passionate about open-source development*

*Transform your Sidekiq monitoring experience with professional-grade queue management.*
