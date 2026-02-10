// Navigation Helper - Replaces App.navigate with page redirects
var Navigation = {
  navigate: function(view, params) {
    params = params || {};
    
    switch(view) {
      case 'login':
        window.location.href = 'login.html';
        break;
        
      case 'dashboard':
        window.location.href = 'dashboard.html';
        break;
        
      case 'customer-detail':
        var url = 'customer-detail.html';
        // Support both customerId and partnerId for backwards compatibility
        var id = params.customerId || params.partnerId;
        if (id) {
          url += '?customerId=' + encodeURIComponent(id);
          if (params.tab) {
            url += '&tab=' + encodeURIComponent(params.tab);
          }
        }
        window.location.href = url;
        break;
        
      case 'customer-form':
        var url = 'customer-form.html';
        // Support both customerId and partnerId for backwards compatibility
        var id = params.customerId || params.partnerId;
        if (id) {
          url += '?customerId=' + encodeURIComponent(id);
        }
        window.location.href = url;
        break;
        
      case 'customer-group-form':
        var url = 'user-group-form.html';
        // Support both customerId and partnerId for backwards compatibility
        var id = params.customerId || params.partnerId;
        if (id) {
          url += '?customerId=' + encodeURIComponent(id);
          if (params.groupId) {
            url += '&groupId=' + encodeURIComponent(params.groupId);
          }
        }
        window.location.href = url;
        break;
      
      case 'group-product-visibility':
        var url = 'group-product-visibility.html';
        // Support both customerId and partnerId for backwards compatibility
        var id = params.customerId || params.partnerId;
        if (id) {
          url += '?customerId=' + encodeURIComponent(id);
          if (params.groupId) {
            url += '&groupId=' + encodeURIComponent(params.groupId);
          }
          if (params.locationId) {
            url += '&locationId=' + encodeURIComponent(params.locationId);
          }
        }
        window.location.href = url;
        break;
      
      case 'voucher-form':
        var url = 'voucher-form.html';
        // Support both customerId and partnerId for backwards compatibility
        var id = params.customerId || params.partnerId;
        if (id) {
          url += '?customerId=' + encodeURIComponent(id);
          if (params.voucherId) {
            url += '&voucherId=' + encodeURIComponent(params.voucherId);
          }
        }
        window.location.href = url;
        break;
      
      case 'voucher-product-selection':
        var url = 'voucher-product-selection.html';
        // Support both customerId and partnerId for backwards compatibility
        var id = params.customerId || params.partnerId;
        if (id) {
          url += '?customerId=' + encodeURIComponent(id);
          if (params.voucherId) {
            url += '&voucherId=' + encodeURIComponent(params.voucherId);
          }
        }
        window.location.href = url;
        break;
      
      case 'reporting':
        // Check if user is a partner or distributor/SureWerx
        if (AppState.currentUser && AppState.currentUser.role === 'Customer') {
          window.location.href = 'customer-reporting.html';
        } else {
          window.location.href = 'reporting.html';
        }
        break;
      
      case 'customer-reporting':
        window.location.href = 'customer-reporting.html';
        break;
        
      case 'user-management':
        window.location.href = 'user-management.html';
        break;
        
      case 'settings':
        window.location.href = 'settings.html';
        break;
        
      case 'products':
        window.location.href = 'products.html';
        break;
        
      default:
        window.location.href = 'login.html';
    }
  }
};

// Create alias for backwards compatibility
var App = {
  navigate: Navigation.navigate
};
