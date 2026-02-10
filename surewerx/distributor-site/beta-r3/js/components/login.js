// Login Component

var LoginComponent = {
  init: function() {
    this.render();
    this.attachEvents();
  },
  
  render: function() {
    $('#app-container').html(Templates.loginPage());
  },
  
  attachEvents: function() {
    var self = this;
    
    // Login form submission
    $(document).on('submit', '#login-form', function(e) {
      e.preventDefault();
      self.handleLogin(e);
    });
    
    // Forgot password link
    $(document).on('click', '#forgot-password-link', function(e) {
      e.preventDefault();
      self.showForgotPasswordModal();
    });
    
    // Forgot password form submission
    $(document).on('submit', '#forgot-password-form', function(e) {
      e.preventDefault();
      self.handleForgotPassword();
    });
    
    // Microsoft sign-in button
    $(document).on('click', '#microsoft-signin-btn', function(e) {
      e.preventDefault();
      self.handleMicrosoftSignIn();
    });
    
    // Toggle demo credentials when logo is clicked
    $(document).on('click', '#login-logo-toggle', function(e) {
      e.preventDefault();
      $('#demo-credentials-section').slideToggle();
    });
  },
  
  handleLogin: function(e) {
    e.preventDefault();
    
    var email = $('#login-email').val();
    var password = $('#login-password').val();
    
    // Use AppState.login() which properly saves to localStorage
    var success = AppState.login(email, password);
    
    if (success) {
      var user = AppState.currentUser;
      
      // Navigate based on user role
      if (user.role === 'Distributor') {
        window.location.href = 'dashboard.html';
      } else if (user.role === 'Customer') {
        // Navigate to their specific partner detail page
        if (user.customerId) {
          window.location.href = 'customer-detail.html?customerId=' + user.customerId;
        } else {
          Helpers.showAlert('Partner account configuration error', 'danger', e.target);
        }
      } else if (user.role === 'SureWerx') {
        // Show distributor selection modal
        this.showDistributorSelectionModal();
      }
    } else {
      // Login failed
      Helpers.showAlert('Invalid email or password', 'danger', e.target);
    }
  },
  
  showDistributorSelectionModal: function() {
    var self = this;
    
    // Add modal to page if not exists
    if ($('#distributor-selection-modal').length === 0) {
      $('body').append(Templates.distributorSelectionModal());
    }
    
    // Initialize distributor typeahead for modal
    this.initializeModalDistributorTypeahead();
    
    $('#distributor-selection-modal').modal('show');
    
    // Show all distributors when input is focused or clicked
    $(document).off('focus click', '#selected-distributor').on('focus click', '#selected-distributor', function(e) {
      e.stopPropagation();
      self.showAllModalDistributors();
    });
    
    // Also show dropdown when clicking on the container
    $(document).off('click', '#distributor-selection-modal .distributor-typeahead-container').on('click', '#distributor-selection-modal .distributor-typeahead-container', function(e) {
      if ($(e.target).closest('.distributor-typeahead-results').length) {
        return;
      }
      var input = $(this).find('#selected-distributor');
      if (input.length) {
        input.focus();
        self.showAllModalDistributors();
      }
    });
    
    // Distributor typeahead input
    $(document).off('input', '#selected-distributor').on('input', '#selected-distributor', function() {
      var query = $(this).val();
      if (query.length > 0) {
        self.showModalDistributorSuggestions(query);
      } else {
        self.hideModalDistributorTypeahead();
      }
    });
    
    // Distributor typeahead selection
    $(document).off('click', '#modal-distributor-typeahead-results .distributor-typeahead-item').on('click', '#modal-distributor-typeahead-results .distributor-typeahead-item', function() {
      var distributorId = $(this).data('distributor-id');
      var distributorName = $(this).data('distributor-name');
      if (distributorId) {
        $('#selected-distributor').val(distributorName);
        $('#selected-distributor-id').val(distributorId);
        self.hideModalDistributorTypeahead();
      }
    });
    
    // Hide typeahead when clicking outside
    $(document).off('click', '#distributor-selection-modal').on('click', '#distributor-selection-modal', function(e) {
      if (!$(e.target).closest('.distributor-typeahead-container').length) {
        self.hideModalDistributorTypeahead();
      }
    });
    
    // Handle Enter key
    $(document).off('keydown', '#selected-distributor').on('keydown', '#selected-distributor', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var query = $(this).val().trim();
        if (query) {
          var matchingDistributor = self.modalAvailableDistributors.find(function(d) {
            return d.name.toLowerCase() === query.toLowerCase();
          });
          if (matchingDistributor) {
            $('#selected-distributor').val(matchingDistributor.name);
            $('#selected-distributor-id').val(matchingDistributor.id);
            self.hideModalDistributorTypeahead();
          }
        }
      }
    });
    
    // Handle form submission
    $(document).off('submit', '#distributor-selection-form').on('submit', '#distributor-selection-form', function(e) {
      e.preventDefault();
      var distributorId = $('#selected-distributor-id').val();
      if (distributorId) {
        AppState.setSelectedDistributor(distributorId);
        $('#distributor-selection-modal').modal('hide');
        window.location.href = 'dashboard.html';
      } else {
        Helpers.showAlert('Please select a distributor', 'warning');
      }
    });
  },
  
  modalAvailableDistributors: [],
  
  initializeModalDistributorTypeahead: function() {
    var distributors = AppState.distributors || [];
    this.modalAvailableDistributors = distributors.map(function(distributor) {
      return {
        id: distributor.id,
        name: distributor.name,
        original: distributor
      };
    }).sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
  },
  
  showAllModalDistributors: function() {
    var self = this;
    var resultsContainer = $('#modal-distributor-typeahead-results');
    
    if (!resultsContainer.length) {
      return;
    }
    
    if (this.modalAvailableDistributors.length === 0) {
      this.initializeModalDistributorTypeahead();
    }
    
    if (this.modalAvailableDistributors.length === 0) {
      resultsContainer.html('<div class="distributor-typeahead-item distributor-typeahead-no-results">No distributors available</div>');
      resultsContainer.css({
        'display': 'block',
        'visibility': 'visible',
        'opacity': '1'
      });
      return;
    }
    
    var distributorsToShow = this.modalAvailableDistributors;
    
    var html = distributorsToShow.map(function(dist) {
      return '<div class="distributor-typeahead-item" data-distributor-id="' + Helpers.escapeHtml(dist.id) + '" data-distributor-name="' + Helpers.escapeHtml(dist.name) + '">' +
             Helpers.escapeHtml(dist.name) +
             '</div>';
    }).join('');
    
    resultsContainer.html(html);
    resultsContainer.css({
      'display': 'block',
      'visibility': 'visible',
      'opacity': '1'
    });
  },
  
  showModalDistributorSuggestions: function(query) {
    var self = this;
    var queryLower = query.toLowerCase();
    var resultsContainer = $('#modal-distributor-typeahead-results');
    
    if (!resultsContainer.length) {
      return;
    }
    
    var matchingDistributors = this.modalAvailableDistributors.filter(function(dist) {
      return dist.name.toLowerCase().indexOf(queryLower) > -1;
    });
    
    if (matchingDistributors.length === 0) {
      resultsContainer.html('<div class="distributor-typeahead-item distributor-typeahead-no-results">No distributors found</div>');
      resultsContainer.css({
        'display': 'block',
        'visibility': 'visible',
        'opacity': '1'
      });
      return;
    }
    
    var html = matchingDistributors.map(function(dist) {
      var highlightedName = self.highlightModalMatch(dist.name, query);
      return '<div class="distributor-typeahead-item" data-distributor-id="' + Helpers.escapeHtml(dist.id) + '" data-distributor-name="' + Helpers.escapeHtml(dist.name) + '">' +
             highlightedName +
             '</div>';
    }).join('');
    
    resultsContainer.html(html);
    resultsContainer.css({
      'display': 'block',
      'visibility': 'visible',
      'opacity': '1'
    });
  },
  
  highlightModalMatch: function(text, query) {
    var queryLower = query.toLowerCase();
    var textLower = text.toLowerCase();
    var index = textLower.indexOf(queryLower);
    
    if (index === -1) {
      return Helpers.escapeHtml(text);
    }
    
    var before = text.substring(0, index);
    var match = text.substring(index, index + query.length);
    var after = text.substring(index + query.length);
    
    return Helpers.escapeHtml(before) + '<strong>' + Helpers.escapeHtml(match) + '</strong>' + Helpers.escapeHtml(after);
  },
  
  hideModalDistributorTypeahead: function() {
    $('#modal-distributor-typeahead-results').css({
      'display': 'none',
      'visibility': 'hidden',
      'opacity': '0'
    });
  },
  
  showForgotPasswordModal: function() {
    // Add modal to page if not exists
    if ($('#forgot-password-modal').length === 0) {
      $('body').append(Templates.forgotPasswordModal());
    }
    
    $('#forgot-password-modal').modal('show');
  },
  
  handleMicrosoftSignIn: function() {
    // Microsoft SSO sign-in handler
    // In a real implementation, this would redirect to Microsoft OAuth
    Helpers.showAlert('Microsoft sign-in is not yet implemented. Please use the regular login form.', 'info');
    
    // TODO: Implement Microsoft OAuth flow
    // Example flow:
    // 1. Redirect to Microsoft OAuth endpoint
    // 2. Handle callback with authorization code
    // 3. Exchange code for token
    // 4. Get user info from Microsoft Graph API
    // 5. Map Microsoft user to application user
    // 6. Login user via AppState.login()
  },
  
  handleForgotPassword: function() {
    var email = $('#reset-email').val();
    
    // Simulate sending reset email
    $('#forgot-password-modal').modal('hide');
    Helpers.showAlert('Password reset link sent to ' + email, 'success');
    
    // Clear form
    $('#reset-email').val('');
  }
};