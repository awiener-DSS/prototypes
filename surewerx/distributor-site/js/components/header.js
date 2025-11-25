// Header Component

var HeaderComponent = {
  availableDistributors: [],
  
  attachEvents: function() {
    var self = this;
    
    // Initialize distributor typeahead if SureWerx user
    if (AppState.currentUser && AppState.currentUser.role === 'SureWerx') {
      this.initializeDistributorTypeahead();
    }
    
    // Logo click - navigate to dashboard (distributors only)
    $(document).on('click', '#header-logo', function(e) {
      e.preventDefault();
      var user = AppState.currentUser;
      var isDistributor = user && (user.role === 'Distributor' || (user.role === 'SureWerx' && AppState.selectedDistributorId));
      if (isDistributor) {
        window.location.href = 'dashboard.html';
      }
    });
    
    // Distributor typeahead input (for SureWerx employees)
    $(document).on('input', '#header-distributor-select', function() {
      var query = $(this).val();
      if (query.length > 0) {
        self.showDistributorSuggestions(query);
      } else {
        self.hideDistributorTypeahead();
      }
    });
    
    // Show all distributors when input is focused or clicked
    $(document).on('focus click', '#header-distributor-select', function(e) {
      e.stopPropagation();
      // Always show all distributors when clicking/focusing
      self.showAllDistributors();
    });
    
    // Also show dropdown when clicking on the container
    $(document).on('click', '.distributor-typeahead-container', function(e) {
      // Don't trigger if clicking on the results dropdown itself
      if ($(e.target).closest('.distributor-typeahead-results').length) {
        return;
      }
      var input = $(this).find('#header-distributor-select');
      if (input.length) {
        input.focus();
        // Always show all distributors when clicking container
        self.showAllDistributors();
      }
    });
    
    // Distributor typeahead selection
    $(document).on('click', '.distributor-typeahead-item', function() {
      var distributorId = $(this).data('distributor-id');
      var distributorName = $(this).data('distributor-name');
      if (distributorId) {
        AppState.setSelectedDistributor(distributorId);
        $('#header-distributor-select').val(distributorName);
        self.hideDistributorTypeahead();
        // Reload the page to update the header and content
        window.location.reload();
      }
    });
    
    // Hide typeahead when clicking outside
    $(document).on('click', function(e) {
      if (!$(e.target).closest('.distributor-typeahead-container').length) {
        self.hideDistributorTypeahead();
      }
    });
    
    // Handle Enter key on distributor input
    $(document).on('keydown', '#header-distributor-select', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var query = $(this).val().trim();
        if (query) {
          // Try to find exact match
          var matchingDistributor = self.availableDistributors.find(function(d) {
            return d.name.toLowerCase() === query.toLowerCase();
          });
          if (matchingDistributor) {
            AppState.setSelectedDistributor(matchingDistributor.id);
            $(this).val(matchingDistributor.name);
            self.hideDistributorTypeahead();
            window.location.reload();
          }
        }
      }
    });
    
    // Logout
    $(document).on('click', '#logout-btn', function(e) {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        AppState.logout();
        window.location.href = 'login.html';
      }
    });
  },
  
  initializeDistributorTypeahead: function() {
    // Make sure AppState is initialized
    if (!AppState.distributors || AppState.distributors.length === 0) {
      // If distributors aren't loaded yet, try to get them
      if (typeof AppState.initializeData === 'function') {
        // Distributors should already be initialized, but just in case
        console.log('Distributors not found, checking AppState...');
      }
    }
    
    var distributors = AppState.distributors || [];
    this.availableDistributors = distributors.map(function(distributor) {
      return {
        id: distributor.id,
        name: distributor.name,
        original: distributor
      };
    }).sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
    
    console.log('Initialized distributor typeahead with', this.availableDistributors.length, 'distributors');
  },
  
  showAllDistributors: function() {
    var self = this;
    var resultsContainer = $('#distributor-typeahead-results');
    
    if (!resultsContainer.length) {
      console.log('Distributor typeahead results container not found');
      return; // Container doesn't exist yet
    }
    
    // Re-initialize if needed
    if (this.availableDistributors.length === 0) {
      this.initializeDistributorTypeahead();
    }
    
    if (this.availableDistributors.length === 0) {
      resultsContainer.html('<div class="distributor-typeahead-item distributor-typeahead-no-results">No distributors available</div>');
      resultsContainer.css({
        'display': 'block',
        'visibility': 'visible',
        'opacity': '1'
      });
      return;
    }
    
    // Show all distributors
    var distributorsToShow = this.availableDistributors;
    
    // Build HTML for suggestions
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
    console.log('Showing', distributorsToShow.length, 'distributors in dropdown');
  },
  
  showDistributorSuggestions: function(query) {
    var self = this;
    var queryLower = query.toLowerCase();
    var resultsContainer = $('#distributor-typeahead-results');
    
    if (!resultsContainer.length) {
      return; // Container doesn't exist yet
    }
    
    // Filter distributors by query
    var matchingDistributors = this.availableDistributors.filter(function(dist) {
      return dist.name.toLowerCase().indexOf(queryLower) > -1;
    });
    
    if (matchingDistributors.length === 0) {
      resultsContainer.html('<div class="distributor-typeahead-item distributor-typeahead-no-results">No distributors found</div>');
      resultsContainer.show();
      return;
    }
    
    // Limit to 10 results
    matchingDistributors = matchingDistributors.slice(0, 10);
    
    // Build HTML for suggestions
    var html = matchingDistributors.map(function(dist) {
      var highlightedName = self.highlightMatch(dist.name, query);
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
  
  highlightMatch: function(text, query) {
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
  
  hideDistributorTypeahead: function() {
    $('#distributor-typeahead-results').css('display', 'none');
  }
};
