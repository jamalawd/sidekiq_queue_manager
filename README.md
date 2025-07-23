# 📊 Sidekiq Queue Manager

[![Gem Version](https://badge.fury.io/rb/sidekiq_queue_manager.svg)](https://badge.fury.io/rb/sidekiq_queue_manager)
[![Rails](https://img.shields.io/badge/Rails-7.0%2B-red.svg)](https://rubyonrails.org)
[![Ruby](https://img.shields.io/badge/Ruby-3.0%2B-red.svg)](https://ruby-lang.org)
[![Sidekiq](https://img.shields.io/badge/Sidekiq-7.0%2B-orange.svg)](https://sidekiq.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Complete Sidekiq management suite with tabbed interface for queues, scheduled jobs, retries, and dead jobs.**

A modern, real-time web interface for comprehensive Sidekiq management with zero configuration required. Features match and extend the official Sidekiq Web UI with enhanced filtering, smart number formatting, and professional design. Perfect for production environments requiring full-featured job management capabilities.

---

## ✨ Features

### 🚀 **Complete Sidekiq Management Suite**

- **Live Statistics** - Real-time queue metrics with smart number formatting (K, M, B, T)
- **Universal Queue Discovery** - Automatically detects ALL Sidekiq queues
- **Tabbed Interface** - Organized views for Queues, Scheduled, Retries, and Dead jobs
- **Scheduled Jobs Management** - View, delete, enqueue, and bulk clear scheduled jobs
- **Retry Jobs Management** - Retry now, delete, kill, or bulk operations on failed jobs
- **Dead Jobs Management** - Resurrect, delete permanently, or bulk operations on dead jobs
- **Advanced Queue Controls** - Set limits, block queues, manage process limits
- **Job Management** - View, delete, and paginate through jobs with filtering

### 🎨 **Professional Interface**

- **Modern Tabbed UI** - Organized interface with Queues, Scheduled, Retries, and Dead job views
- **Smart Number Display** - Large numbers automatically formatted (92.9M, 1.2B, 5T) to prevent overflow
- **Dark-mode Optimized** - Beautiful responsive design that works on all screen sizes
- **Live Pull Toggle** - Enable/disable real-time updates with visual indicators
- **Custom Modal System** - Professional confirmations and prompts (no browser alerts)
- **Advanced Filtering** - Filter jobs by class name across all tabs
- **Pagination** - Efficient browsing through large job sets
- **Mobile Responsive** - Optimized layouts for desktop, tablet, and mobile
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

- **Enhanced Global Statistics** - Processed, failed, busy, enqueued, scheduled, retry, and dead job counts with smart formatting
- **Tabbed Interface** - Four main sections: Queues, Scheduled, Retries, and Dead jobs with real-time counts
- **Live Controls** - Toggle real-time updates and manual refresh with visual indicators
- **Advanced Filtering** - Filter jobs by class name across all tabs
- **Responsive Design** - Optimized layouts that prevent number overflow on all screen sizes

### Job Management by Type

#### 📅 Scheduled Jobs Tab

- **View Scheduled Jobs** - Browse future jobs with execution times and time remaining
- **Enqueue Now** - Execute scheduled jobs immediately
- **Delete Jobs** - Remove scheduled jobs before execution
- **Clear All** - Bulk delete all scheduled jobs (with optional filtering)
- **Pagination** - Navigate through large lists of scheduled jobs
- **Filtering** - Filter by job class name for easy searching

#### 🔄 Retries Tab

- **View Failed Jobs** - See jobs that failed and are awaiting retry
- **Retry Now** - Execute retry jobs immediately
- **Kill Jobs** - Move retry jobs to dead queue
- **Delete Jobs** - Permanently remove retry jobs
- **Retry All** - Bulk retry all failed jobs (with optional filtering)
- **Clear All** - Bulk delete all retry jobs (with optional filtering)
- **Progress Indicators** - Visual progress bars showing retry attempts vs limits

#### ☠️ Dead Jobs Tab

- **View Dead Jobs** - Browse jobs that have exhausted all retry attempts
- **Resurrect Jobs** - Move dead jobs back to retry queue
- **Delete Permanently** - Remove dead jobs forever
- **Resurrect All** - Bulk resurrect all dead jobs (with optional filtering)
- **Clear All** - Bulk delete all dead jobs permanently (with optional filtering)
- **Error Details** - View error messages and stack traces

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

### Scheduled Jobs Endpoints

```http
GET    /scheduled                    # List scheduled jobs (paginated, filterable)
DELETE /scheduled/:id                # Delete specific scheduled job
POST   /scheduled/:id/enqueue        # Enqueue scheduled job immediately
POST   /scheduled/clear              # Clear all scheduled jobs (with optional filter)
```

### Retry Jobs Endpoints

```http
GET    /retries                      # List retry jobs (paginated, filterable)
POST   /retries/:id/retry            # Retry specific job immediately
DELETE /retries/:id                  # Delete specific retry job
POST   /retries/:id/kill             # Kill retry job (move to dead queue)
POST   /retries/retry_all            # Retry all jobs (with optional filter)
POST   /retries/clear                # Clear all retry jobs (with optional filter)
```

### Dead Jobs Endpoints

```http
GET    /dead                         # List dead jobs (paginated, filterable)
POST   /dead/:id/resurrect           # Resurrect dead job to retry queue
DELETE /dead/:id                     # Delete dead job permanently
POST   /dead/resurrect_all           # Resurrect all dead jobs (with optional filter)
POST   /dead/clear                   # Clear all dead jobs (with optional filter)
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

1. **Enable Authentication** (disabled by default for development)

   ```ruby
   # Enable basic auth
   config.basic_auth_enabled = true
   config.basic_auth_password = 'secure-password'
   
   # OR use custom authentication
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

- ✅ **Sidekiq Web UI Feature Parity** - Matches and extends official Sidekiq Web functionality
- ✅ **Sidekiq Pro/Enterprise** - Full compatibility with all Sidekiq editions
- ✅ **Multi-process Sidekiq** - Advanced process management
- ✅ **Existing Sidekiq setups** - Zero breaking changes, drop-in replacement
- ✅ **All job types** - Works with queued, scheduled, retry, and dead jobs
- ✅ **Docker/Kubernetes** - Container-ready with health checks
- ✅ **Heroku/Cloud platforms** - Platform-agnostic deployment

---

## 📝 Changelog

### Version 1.1.0 (Latest)

🎉 **Major Feature Release - Complete Sidekiq Management Suite**

**New Features:**
- ✨ **Tabbed Interface** - Organized views for Queues, Scheduled, Retries, and Dead jobs
- 📅 **Scheduled Jobs Management** - View, delete, enqueue immediately, and bulk operations
- 🔄 **Retry Jobs Management** - Retry now, delete, kill, and bulk operations with progress indicators
- ☠️ **Dead Jobs Management** - Resurrect, delete permanently, and bulk operations
- 📊 **Enhanced Statistics** - Added scheduled, retry, and dead job counts to main dashboard
- 🔢 **Smart Number Formatting** - Large numbers automatically formatted (92.9M, 1.2B, 5T) to prevent overflow
- 🔍 **Advanced Filtering** - Filter jobs by class name across all tabs
- 📄 **Pagination** - Efficient browsing through large job sets
- 💬 **Custom Modals** - Professional confirmation dialogs (no browser alerts)

**API Enhancements:**
- 🚀 **18 New REST Endpoints** - Complete API coverage for scheduled, retry, and dead jobs
- 📡 **Real-time Tab Counts** - Live updates for all job type counts
- 🎯 **Enhanced Error Handling** - Comprehensive error responses and validation

**UI/UX Improvements:**
- 📱 **Responsive Grid System** - Optimized 7-card stats layout that prevents overflow
- 🎨 **Enhanced Visual Design** - Progress bars, status indicators, and improved typography
- ⚡ **Performance Optimized** - Efficient loading and rendering of large job lists

**Backward Compatibility:**
- ✅ **Zero Breaking Changes** - All existing functionality preserved
- 🔄 **Seamless Upgrade** - Drop-in replacement for previous versions

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

*Transform your Sidekiq experience with comprehensive job management - queues, scheduled jobs, retries, and dead jobs in one professional interface.*
