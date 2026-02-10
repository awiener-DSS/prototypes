// UI Helper Functions - Loading Spinners, Confirmations, Improved Feedback

var UIHelpers = {
  
  // Loading Spinner System
  showLoadingSpinner: function(message) {
    message = message || 'Processing...';
    
    var spinnerHtml = '<div id="loading-overlay" style="' +
      'position: fixed;' +
      'top: 0;' +
      'left: 0;' +
      'width: 100%;' +
      'height: 100%;' +
      'background: rgba(0, 0, 0, 0.5);' +
      'z-index: 9999;' +
      'display: flex;' +
      'align-items: center;' +
      'justify-content: center;' +
      '">' +
      '<div style="' +
      'background: white;' +
      'padding: 30px 40px;' +
      'border-radius: 8px;' +
      'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);' +
      'text-align: center;' +
      'min-width: 200px;' +
      '">' +
      '<div class="spinner" style="' +
      'border: 4px solid #f3f4f6;' +
      'border-top: 4px solid #2563eb;' +
      'border-radius: 50%;' +
      'width: 40px;' +
      'height: 40px;' +
      'animation: spin 1s linear infinite;' +
      'margin: 0 auto 15px auto;' +
      '"></div>' +
      '<div style="color: #374151; font-weight: 500;">' + Helpers.escapeHtml(message) + '</div>' +
      '</div>' +
      '</div>';
    
    // Add spinner animation if not already added
    if (!$('#spinner-animation-style').length) {
      $('head').append(
        '<style id="spinner-animation-style">' +
        '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' +
        '</style>'
      );
    }
    
    $('body').append(spinnerHtml);
  },
  
  hideLoadingSpinner: function() {
    $('#loading-overlay').remove();
  },
  
  // Confirmation Dialog System
  showConfirmDialog: function(options) {
    var defaults = {
      title: 'Confirm Action',
      message: 'Are you sure you want to proceed?',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      confirmClass: 'btn-danger',
      onConfirm: function() {},
      onCancel: function() {}
    };
    
    var settings = $.extend({}, defaults, options);
    
    var modalHtml = '<div class="modal fade" id="confirm-dialog-modal" tabindex="-1">' +
      '<div class="modal-dialog modal-sm">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">' +
      '<span class="glyphicon glyphicon-warning-sign text-warning"></span> ' +
      Helpers.escapeHtml(settings.title) +
      '</h4>' +
      '</div>' +
      '<div class="modal-body">' +
      '<p>' + Helpers.escapeHtml(settings.message) + '</p>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" id="confirm-cancel-btn">' +
      Helpers.escapeHtml(settings.cancelText) +
      '</button>' +
      '<button type="button" class="btn ' + settings.confirmClass + '" id="confirm-ok-btn">' +
      Helpers.escapeHtml(settings.confirmText) +
      '</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#confirm-dialog-modal').modal('show');
    
    // Handle confirm
    $(document).off('click', '#confirm-ok-btn').on('click', '#confirm-ok-btn', function() {
      $('#confirm-dialog-modal').modal('hide');
      settings.onConfirm();
    });
    
    // Handle cancel
    $(document).off('click', '#confirm-cancel-btn').on('click', '#confirm-cancel-btn', function() {
      $('#confirm-dialog-modal').modal('hide');
      settings.onCancel();
    });
    
    // Cleanup on hide
    $('#confirm-dialog-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  // Enhanced Error Messages
  showError: function(title, details, technicalInfo) {
    var modalHtml = '<div class="modal fade" id="error-dialog-modal" tabindex="-1">' +
      '<div class="modal-dialog">' +
      '<div class="modal-content">' +
      '<div class="modal-header bg-danger">' +
      '<button type="button" class="close" data-dismiss="modal" style="color: white;">&times;</button>' +
      '<h4 class="modal-title" style="color: white;">' +
      '<span class="glyphicon glyphicon-exclamation-sign"></span> ' +
      Helpers.escapeHtml(title) +
      '</h4>' +
      '</div>' +
      '<div class="modal-body">' +
      '<div class="alert alert-danger">' +
      '<strong>Error:</strong> ' + Helpers.escapeHtml(details) +
      '</div>';
    
    if (technicalInfo) {
      modalHtml += '<div class="panel panel-default">' +
        '<div class="panel-heading">' +
        '<h4 class="panel-title">' +
        '<a data-toggle="collapse" href="#technical-details">' +
        '<span class="glyphicon glyphicon-chevron-right"></span> Technical Details' +
        '</a>' +
        '</h4>' +
        '</div>' +
        '<div id="technical-details" class="panel-collapse collapse">' +
        '<div class="panel-body">' +
        '<pre style="background: #f5f5f5; padding: 10px; font-size: 12px;">' +
        Helpers.escapeHtml(JSON.stringify(technicalInfo, null, 2)) +
        '</pre>' +
        '</div>' +
        '</div>' +
        '</div>';
    }
    
    modalHtml += '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#error-dialog-modal').modal('show');
    
    $('#error-dialog-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  // Progress Bar System
  showProgressBar: function(message) {
    message = message || 'Processing...';
    
    var html = '<div id="progress-overlay" style="' +
      'position: fixed;' +
      'top: 0;' +
      'left: 0;' +
      'width: 100%;' +
      'height: 100%;' +
      'background: rgba(0, 0, 0, 0.5);' +
      'z-index: 9999;' +
      'display: flex;' +
      'align-items: center;' +
      'justify-content: center;' +
      '">' +
      '<div style="' +
      'background: white;' +
      'padding: 30px 40px;' +
      'border-radius: 8px;' +
      'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);' +
      'min-width: 400px;' +
      '">' +
      '<h4 style="margin-top: 0;">' + Helpers.escapeHtml(message) + '</h4>' +
      '<div class="progress" style="margin-bottom: 10px;">' +
      '<div id="progress-bar-inner" class="progress-bar progress-bar-striped active" role="progressbar" style="width: 0%">' +
      '<span id="progress-bar-text">0%</span>' +
      '</div>' +
      '</div>' +
      '<div id="progress-status" class="text-muted text-center"></div>' +
      '</div>' +
      '</div>';
    
    $('body').append(html);
  },
  
  updateProgressBar: function(percent, status) {
    $('#progress-bar-inner').css('width', percent + '%');
    $('#progress-bar-text').text(percent + '%');
    if (status) {
      $('#progress-status').text(status);
    }
  },
  
  hideProgressBar: function() {
    $('#progress-overlay').remove();
  },
  
  // Inline Spinner for Buttons
  addButtonSpinner: function(buttonSelector) {
    var $button = $(buttonSelector);
    $button.prop('disabled', true);
    var originalText = $button.html();
    $button.data('original-text', originalText);
    $button.html('<span class="glyphicon glyphicon-refresh spinning"></span> Processing...');
    
    // Add spinning animation if not already added
    if (!$('#button-spinner-style').length) {
      $('head').append(
        '<style id="button-spinner-style">' +
        '.spinning { animation: spin 1s linear infinite; }' +
        '</style>'
      );
    }
  },
  
  removeButtonSpinner: function(buttonSelector) {
    var $button = $(buttonSelector);
    $button.prop('disabled', false);
    var originalText = $button.data('original-text');
    if (originalText) {
      $button.html(originalText);
    }
  },
  
  // Success/Info Modals
  showSuccessDialog: function(title, message) {
    var modalHtml = '<div class="modal fade" id="success-dialog-modal" tabindex="-1">' +
      '<div class="modal-dialog modal-sm">' +
      '<div class="modal-content">' +
      '<div class="modal-header bg-success">' +
      '<button type="button" class="close" data-dismiss="modal" style="color: white;">&times;</button>' +
      '<h4 class="modal-title" style="color: white;">' +
      '<span class="glyphicon glyphicon-ok-circle"></span> ' +
      Helpers.escapeHtml(title) +
      '</h4>' +
      '</div>' +
      '<div class="modal-body">' +
      '<p>' + Helpers.escapeHtml(message) + '</p>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-success" data-dismiss="modal">OK</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#success-dialog-modal').modal('show');
    
    $('#success-dialog-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  // Validation Helper
  showValidationError: function(fieldSelector, message) {
    var $field = $(fieldSelector);
    var $formGroup = $field.closest('.form-group');
    
    // Add error class
    $formGroup.addClass('has-error');
    
    // Remove any existing error message
    $formGroup.find('.help-block-error').remove();
    
    // Add error message
    $field.after('<span class="help-block help-block-error">' + Helpers.escapeHtml(message) + '</span>');
    
    // Focus the field
    $field.focus();
    
    // Remove error on input
    $field.one('input change', function() {
      $formGroup.removeClass('has-error');
      $formGroup.find('.help-block-error').remove();
    });
  },
  
  clearValidationErrors: function(formSelector) {
    $(formSelector).find('.form-group').removeClass('has-error');
    $(formSelector).find('.help-block-error').remove();
  }
};
