// Dashboard Component

var DashboardComponent = {
  init: function() {
    this.render();
    this.attachEvents();
  },
  
  render: function() {
    $('#app-container').html(Templates.dashboardPage());
    this.updateActiveNav('dashboard');
    // Populate customer cards after rendering
    this.filterCustomers('');
  },
  
  attachEvents: function() {
    var self = this;
    
    // Customer card click (but not when clicking buttons)
    $(document).on('click', '.customer-card', function(e) {
      // Don't navigate if clicking on a button or inside a button
      if ($(e.target).closest('button').length > 0 || $(e.target).is('button')) {
        return;
      }
      // Get the customer card element (use currentTarget to ensure we get the card, not a child)
      var $card = $(e.currentTarget);
      var customerId = $card.data('customer-id');
      if (customerId) {
      App.navigate('customer-detail', { customerId: customerId });
      }
    });
    
    // Edit customer button on card
    $(document).on('click', '.edit-customer-card-btn', function(e) {
      e.stopPropagation(); // Prevent card click
      var customerId = $(this).data('customer-id');
      App.navigate('customer-form', { customerId: customerId });
    });
    
    // Manage customer button on card
    $(document).on('click', '.manage-customer-btn', function(e) {
      e.stopPropagation(); // Prevent card click
      var customerId = $(this).data('customer-id');
      App.navigate('customer-detail', { customerId: customerId });
    });
    
    // Create customer button
    $(document).on('click', '#create-customer-btn', function() {
      App.navigate('customer-form');
    });
    
    // Search customers
    $(document).on('input', '#customer-search', function() {
      var query = $(this).val().toLowerCase();
      self.filterCustomers(query);
    });
    
    // Status filter
    $(document).on('change', '#customer-status-filter', function() {
      var searchQuery = $('#customer-search').val() || '';
      self.filterCustomers(searchQuery);
    });
  },
  
  updateActiveNav: function(view) {
    $('.nav-link').removeClass('active');
    $('.nav-link[data-nav="' + view + '"]').addClass('active');
  },
  
  filterCustomers: function(searchTerm) {
    var filtered = AppState.getFilteredCustomers();
    var statusFilter = $('#customer-status-filter').val() || 'Active';
    
    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter(function(customer) {
        var customerStatus = customer.status || 'active';
        return (statusFilter === 'Active' && customerStatus === 'active') ||
               (statusFilter === 'Inactive' && customerStatus === 'inactive');
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      searchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(function(customer) {
        return customer.name.toLowerCase().indexOf(searchTerm) > -1 ||
               (customer.industry && customer.industry.toLowerCase().indexOf(searchTerm) > -1);
      });
    }
    
    $('#customer-grid').html(Templates.customerCards(filtered));
  }
};