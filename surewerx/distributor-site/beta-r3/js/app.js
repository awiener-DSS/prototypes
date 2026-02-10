// Main Application Controller

var App = {
  init: function() {
    var self = this;
    AppState.init();
    
    // Attach header events globally
    HeaderComponent.attachEvents();
    
    if (AppState.isLoggedIn) {
      var user = AppState.currentUser;
      if (user.role === 'Distributor') {
        this.navigate('dashboard');
      } else if (user.role === 'SureWerx') {
        // SureWerx users need to select a distributor first
        if (AppState.selectedDistributorId) {
          this.navigate('dashboard');
        } else {
          // Show distributor selection modal
          LoginComponent.showDistributorSelectionModal();
        }
      } else {
        // Customer users go directly to their customer detail page
        this.navigate('customer-detail', { customerId: AppState.currentUser.customerId });
      }
    } else {
      LoginComponent.init();
    }
  },
  
  navigate: function(view, params) {
    // Check if customer user is trying to access restricted pages
    var user = AppState.currentUser;
    var isCustomerUser = user && user.role === 'Customer';
    var isSureWerx = user && user.role === 'SureWerx';
    // Customer users can access user-management (to manage their own users) and customer-reporting but not other restricted views
    var restrictedViews = ['dashboard', 'settings', 'products', 'customer-form'];
    
    if (isCustomerUser && restrictedViews.indexOf(view) > -1) {
      // Redirect customer users back to their customer detail page
      console.log('Access denied: Customer users cannot access', view);
      this.navigate('customer-detail', { customerId: AppState.currentUser.customerId });
      return;
    }
    
    // SureWerx users need to have selected a distributor to access distributor views
    if (isSureWerx && restrictedViews.indexOf(view) > -1 && !AppState.selectedDistributorId) {
      // Show distributor selection modal
      LoginComponent.showDistributorSelectionModal();
      return;
    }
    
    AppState.navigate(view, params);
    
    switch(view) {
      case 'login':
        LoginComponent.init();
        break;
      case 'dashboard':
        DashboardComponent.init();
        break;
      case 'customer-detail':
        CustomerDetailComponent.init(params.customerId, params.tab);
        break;
      case 'customer-form':
        // Handle both customer object and customerId for edit mode
        var customer = null;
        if (params) {
          if (params.customer) {
            customer = params.customer;
          } else if (params.customerId) {
            customer = AppState.getCustomerById(params.customerId);
          }
        }
        CustomerFormComponent.init(customer);
        break;
      case 'customer-group-form':
        UserGroupFormComponent.init(params.customerId, params.groupId);
        break;
      case 'group-product-visibility':
        GroupProductVisibilityComponent.init(params.customerId, params.groupId);
        break;
      case 'voucher-form':
        VoucherFormComponent.init(params.customerId, params.voucherId);
        break;
      case 'voucher-product-selection':
        VoucherProductSelectionComponent.init(params.customerId, params.voucherId);
        break;
      case 'reporting':
        ReportingComponent.init();
        break;
      case 'user-management':
        UserManagementComponent.init();
        break;
      case 'settings':
        SettingsComponent.init();
        break;
      case 'products':
        ProductsComponent.init();
        break;
      default:
        LoginComponent.init();
    }
  },
  
  showSettingsPlaceholder: function() {
    $('#app-container').html(
      Templates.header() +
      '<div class="container">' +
      '<h2>Distributor Settings</h2>' +
      '<p class="text-muted">Settings page coming soon...</p>' +
      '</div>'
    );
    $('.nav-link').removeClass('active');
    $('.nav-link[data-nav="settings"]').addClass('active');
  },
  
  showProductsPlaceholder: function() {
    $('#app-container').html(
      Templates.header() +
      '<div class="container">' +
      '<h2>Product Management</h2>' +
      '<p class="text-muted">Product management page coming soon...</p>' +
      '</div>'
    );
    $('.nav-link').removeClass('active');
    $('.nav-link[data-nav="products"]').addClass('active');
  }
};

// Initialize app when document is ready
$(function() {
  App.init();
});