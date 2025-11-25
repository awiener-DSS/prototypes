// Helper utility functions

var Helpers = {
  // Format currency
  formatCurrency: function(value) {
    return '$' + parseFloat(value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  },
  
  // Format date
  formatDate: function(dateString) {
    if (!dateString || dateString === '' || dateString === null || dateString === undefined) {
      return '-';
    }
    var date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  },
  
  // Format number with commas
  formatNumber: function(value) {
    return parseInt(value, 10).toLocaleString();
  },
  
  // Escape HTML entities to prevent XSS
  escapeHtml: function(text) {
    if (text === null || text === undefined) {
      return '';
    }
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
  },
  
  // Generate unique ID
  generateId: function() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
  },
  
  // Show alert message - Always show in fixed position at top for visibility
  showAlert: function(message, type, targetElement) {
    // Remove existing alerts first
    $('.contextual-alert').remove();
    $('.app-alert-container .alert').remove();
    
    // Always show alerts in fixed position at top for better visibility
    if ($('.app-alert-container').length === 0) {
      $('body').append('<div class="app-alert-container"></div>');
    }
    
    // Determine icon SVG based on type
    var iconSvg = '';
    var alertType = type || 'info';
    
    switch(alertType) {
      case 'success':
        iconSvg = '<svg class="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z" fill="currentColor"/></svg>';
        break;
      case 'danger':
      case 'error':
        iconSvg = '<svg class="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" fill="currentColor"/></svg>';
        break;
      case 'warning':
        iconSvg = '<svg class="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 18h18L10 2 1 18zm2-2l7-12 7 12H3zm7-3v-2h2v2h-2zm0-4h2v2h-2V9z" fill="currentColor"/></svg>';
        break;
      default: // info
        iconSvg = '<svg class="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-4h2v4zm0-6H9V5h2v4z" fill="currentColor"/></svg>';
    }
    
    var alertHtml = '<div class="alert alert-' + alertType + ' alert-dismissible fade-in" role="alert">' +
      '<div class="alert-content">' +
      iconSvg +
      '<span class="alert-message">' + Helpers.escapeHtml(message) + '</span>' +
      '</div>' +
      '<button type="button" class="alert-close" data-dismiss="alert" aria-label="Close">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '</button>' +
      '</div>';
    
    $('.app-alert-container').html(alertHtml);
    
    // Add click handler for close button
    $('.app-alert-container .alert-close').on('click', function() {
      var $alert = $(this).closest('.alert');
      $alert.addClass('fade-out');
      setTimeout(function() {
        $alert.remove();
      }, 300);
    });
    
    // Scroll to top smoothly to ensure alert is visible (only if not in a modal)
    if ($('.modal:visible').length === 0) {
      $('html, body').animate({
        scrollTop: 0
      }, 300);
    }
    
    // Auto dismiss after 6 seconds
    setTimeout(function() {
      var $alert = $('.app-alert-container .alert');
      if ($alert.length > 0) {
        $alert.addClass('fade-out');
        setTimeout(function() {
          $alert.remove();
        }, 300);
      }
    }, 6000);
  },
  
  // Get status badge class
  getStatusBadgeClass: function(status) {
    var map = {
      'Processing': 'status-processing',
      'Shipped': 'status-shipped',
      'Cancelled': 'status-cancelled',
      'Returned': 'status-returned',
      'Active': 'label-success',
      'Inactive': 'label-default'
    };
    return map[status] || 'label-default';
  },
  
  // Debounce function
  debounce: function(func, wait) {
    var timeout;
    return function() {
      var context = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  },
  
  // Export to CSV
  exportToCSV: function(data, filename) {
    if (!data || !data.length) {
      Helpers.showAlert('No data to export', 'warning');
      return;
    }
    
    // Get headers from first object
    var headers = Object.keys(data[0]);
    
    // Build CSV content
    var csvContent = headers.join(',') + '\n';
    
    data.forEach(function(row) {
      var values = headers.map(function(header) {
        var val = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof val === 'string' && (val.indexOf(',') > -1 || val.indexOf('"') > -1)) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      });
      csvContent += values.join(',') + '\n';
    });
    
    // Create download link
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    if (link.download !== undefined) {
      var url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename || 'export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      Helpers.showAlert('Export successful', 'success');
    }
  }
};