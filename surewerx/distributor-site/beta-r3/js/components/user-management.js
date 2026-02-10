// User Management Component

var UserManagementComponent = {
  init: function() {
    this.render();
    this.attachEvents();
  },
  
  render: function() {
    var isPartnerUser = AppState.currentUser && AppState.currentUser.role === 'Customer';
    var isDistributorUser = AppState.currentUser && AppState.currentUser.role === 'Distributor';
    var pageTitle = isPartnerUser ? 'My Account' : 'User Management';
    var pageDescription = isPartnerUser ? 'Manage users for your account' : 'Manage distributor and customer user accounts';
    
    var html = '<div>' +
      Templates.header() +
      '<div class="container">' +
      '<div class="row mb-4">' +
      '<div class="col-md-8">' +
      // Add back button for appropriate users
      (isDistributorUser ? 
        '<button class="btn btn-default mb-3" id="back-to-dashboard">' +
        '<span class="glyphicon glyphicon-chevron-left"></span> Back to Dashboard' +
        '</button>' : '') +
      (isPartnerUser ? 
        '<button class="btn btn-default mb-3" id="back-to-customer-detail">' +
        '<span class="glyphicon glyphicon-chevron-left"></span> Back to Customer Detail' +
        '</button>' : '') +
      '<h2>' + pageTitle + '</h2>' +
      '<p class="text-muted">' + pageDescription + '</p>' +
      '</div>' +
      '<div class="col-md-4 text-right">' +
      '<button class="btn btn-primary" id="create-user-btn">' +
      '<span class="glyphicon glyphicon-plus"></span> Create User' +
      '</button>' +
      '</div>' +
      '</div>';
    
    // Only show role filter for distributor users
    if (!isPartnerUser) {
      html += '<div class="row mb-3">' +
        '<div class="col-md-4">' +
        '<select class="form-control" id="role-filter">' +
        '<option value="all">All Roles</option>' +
        '<option value="Distributor">Distributor Users</option>' +
        '<option value="Customer">Customer Users</option>' +
        '</select>' +
        '</div>' +
        '</div>';
    }
    
    html += this.renderUsersTable() +
      '</div>' +
      '</div>';
    
    $('#app-container').html(html);
  },
  
  attachEvents: function() {
    var self = this;
    
    // Role filter
    $(document).on('change', '#role-filter', function() {
      self.filterUsers($(this).val());
    });
    
    // Create user
    $(document).on('click', '#create-user-btn', function() {
      self.showCreateUserModal();
    });
    
    // Edit user button
    $(document).on('click', '.edit-user-btn', function(e) {
      e.stopPropagation(); // Prevent row click from triggering
      var userId = $(this).data('user-id');
      self.showEditUserModal(userId);
    });
    
    // Click on user row to open edit modal
    $(document).on('click', '.user-row[data-user-id]', function(e) {
      // Don't trigger if clicking on a button or link
      if ($(e.target).closest('button, .btn, a').length > 0) {
        return;
      }
      
      var $row = $(this);
      var userId = $row.data('user-id');
      self.showEditUserModal(userId);
    });
    
    // Back to dashboard
    $(document).on('click', '#back-to-dashboard', function() {
      App.navigate('dashboard');
    });
    
    // Back to customer detail
    $(document).on('click', '#back-to-customer-detail', function() {
      App.navigate('customer-detail', { customerId: AppState.currentUser.customerId });
    });
  },
  
  renderUsersTable: function() {
    var isPartnerUser = AppState.currentUser && AppState.currentUser.role === 'Customer';
    var isSureWerxUser = AppState.currentUser && AppState.currentUser.role === 'SureWerx';
    var users = AppState.users;
    
    // Filter users for customer users - only show users from their customer
    if (isPartnerUser) {
      users = users.filter(function(u) {
        return u.customerId === AppState.currentUser.customerId;
      });
    }
    
    // Filter users for distributor users or SureWerx users viewing as a distributor
    // Only show users from the current distributor
    var currentDistributorId = AppState.getCurrentDistributorId();
    if (currentDistributorId) {
      users = users.filter(function(u) {
        // Show distributor users from this distributor
        if (u.role === 'Distributor' && u.distributorId === currentDistributorId) {
          return true;
        }
        // Show customer users whose customer belongs to this distributor
        if (u.role === 'Customer' && u.customerId) {
          var customer = AppState.getCustomerById(u.customerId);
          return customer && customer.distributorId === currentDistributorId;
        }
        return false;
      });
    }
    
    // Filter out SureWerx users unless current user is SureWerx
    if (!isSureWerxUser) {
      users = users.filter(function(u) {
        return u.role !== 'SureWerx';
      });
    }
    
    return '<div class="panel panel-default">' +
      '<div class="panel-heading">' +
      '<h3 class="panel-title">Users</h3>' +
      '</div>' +
      '<table class="table table-hover">' +
      '<thead>' +
      '<tr>' +
      '<th>Name</th>' +
      '<th>Email</th>' +
      '<th>Role</th>' +
          (isPartnerUser ? '' : '<th>Customer</th>') +
      '<th>Status</th>' +
      '<th>Actions</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody id="users-table-body">' +
      users.map(function(user) {
        var customer = user.customerId ? 
          AppState.customers.find(function(p) { return p.id === user.customerId; }) : null;
        
        return '<tr class="user-row" data-user-id="' + user.id + '" style="cursor: pointer;">' +
          '<td>' + Helpers.escapeHtml(user.firstName + ' ' + user.lastName) + '</td>' +
          '<td>' + Helpers.escapeHtml(user.email) + '</td>' +
          '<td><span class="label ' + (user.role === 'Distributor' ? 'label-primary' : 'label-info') + '">' +
          Helpers.escapeHtml(user.role === 'Customer' ? 'Customer' : user.role) + '</span></td>' +
          (isPartnerUser ? '' : '<td>' + (customer ? Helpers.escapeHtml(customer.name) : '-') + '</td>') +
          '<td><span class="label ' + Helpers.getStatusBadgeClass(user.status) + '">' +
          Helpers.escapeHtml(user.status) + '</span></td>' +
          '<td>' +
          '<button class="btn btn-sm btn-default edit-user-btn" data-user-id="' + user.id + '">' +
          '<span class="glyphicon glyphicon-pencil"></span>' +
          '</button>' +
          '</td>' +
          '</tr>';
      }).join('') +
      '</tbody>' +
      '</table>' +
      '</div>';
  },
  
  filterUsers: function(role) {
    var isSureWerxUser = AppState.currentUser && AppState.currentUser.role === 'SureWerx';
    var users = AppState.users;
    
    // Filter users for distributor users or SureWerx users viewing as a distributor
    // Only show users from the current distributor
    var currentDistributorId = AppState.getCurrentDistributorId();
    if (currentDistributorId) {
      users = users.filter(function(u) {
        // Show distributor users from this distributor
        if (u.role === 'Distributor' && u.distributorId === currentDistributorId) {
          return true;
        }
        // Show customer users whose customer belongs to this distributor
        if (u.role === 'Customer' && u.customerId) {
          var customer = AppState.getCustomerById(u.customerId);
          return customer && customer.distributorId === currentDistributorId;
        }
        return false;
      });
    }
    
    // Filter out SureWerx users unless current user is SureWerx
    if (!isSureWerxUser) {
      users = users.filter(function(u) {
        return u.role !== 'SureWerx';
      });
    }
    
    if (role !== 'all') {
      users = users.filter(function(u) { return u.role === role; });
    }
    
    var tbody = users.map(function(user) {
      var customer = user.customerId ? 
        AppState.customers.find(function(p) { return p.id === user.customerId; }) : null;
      
      return '<tr class="user-row" data-user-id="' + user.id + '" style="cursor: pointer;">' +
        '<td>' + Helpers.escapeHtml(user.firstName + ' ' + user.lastName) + '</td>' +
        '<td>' + Helpers.escapeHtml(user.email) + '</td>' +
        '<td><span class="label ' + (user.role === 'Distributor' ? 'label-primary' : 'label-info') + '">' +
        Helpers.escapeHtml(user.role) + '</span></td>' +
        '<td>' + (customer ? Helpers.escapeHtml(customer.name) : '-') + '</td>' +
        '<td><span class="label ' + Helpers.getStatusBadgeClass(user.status) + '">' +
        Helpers.escapeHtml(user.status) + '</span></td>' +
        '<td>' +
        '<button class="btn btn-sm btn-default edit-user-btn" data-user-id="' + user.id + '">' +
        '<span class="glyphicon glyphicon-pencil"></span>' +
        '</button>' +
        '</td>' +
        '</tr>';
    }).join('');
    
    $('#users-table-body').html(tbody);
  },
  
  showCreateUserModal: function() {
    var isPartnerUser = AppState.currentUser && AppState.currentUser.role === 'Customer';
    
    var modalHtml = '<div class="modal fade" id="create-user-modal" tabindex="-1">' +
      '<div class="modal-dialog">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Create New User</h4>' +
      '</div>' +
      '<form id="create-user-form">' +
      '<div class="modal-body">' +
      '<div class="alert alert-info" style="margin-bottom: 20px;">' +
      '<span class="glyphicon glyphicon-info-sign"></span> ' +
      'An email will be sent to the user with instructions to set up their password.' +
      '</div>' +
      '<div class="form-group">' +
      '<label>First Name *</label>' +
      '<input type="text" class="form-control" id="user-firstname" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Last Name *</label>' +
      '<input type="text" class="form-control" id="user-lastname" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Email *</label>' +
      '<input type="email" class="form-control" id="user-email" required>' +
      '</div>';
    
    // Only show role and customer select for distributor users
    if (!isPartnerUser) {
      modalHtml += '<div class="form-group">' +
        '<label>Role *</label>' +
        '<select class="form-control" id="user-role" required>' +
        '<option value="">Select role...</option>' +
        '<option value="Distributor">Distributor</option>' +
        '<option value="Customer">Customer</option>' +
        '</select>' +
        '</div>' +
        '<div class="form-group" id="customer-select-group" style="display:none;">' +
        '<label>Customer *</label>' +
        '<select class="form-control" id="user-customer">' +
        '<option value="">Select customer...</option>' +
        AppState.getFilteredCustomers().map(function(p) {
          return '<option value="' + p.id + '">' + Helpers.escapeHtml(p.name) + '</option>';
        }).join('') +
        '</select>' +
        '</div>';
    }
    
    modalHtml += '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Create User</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#create-user-modal').modal('show');
    
    // Show/hide customer select based on role (only for distributor users)
    if (!isPartnerUser) {
      $(document).on('change', '#user-role', function() {
        if ($(this).val() === 'Customer') {
          $('#customer-select-group').show();
          $('#user-customer').prop('required', true);
        } else {
          $('#customer-select-group').hide();
          $('#user-customer').prop('required', false);
        }
      });
    }
    
    // Handle form submission
    $(document).off('submit', '#create-user-form').on('submit', '#create-user-form', function(e) {
      e.preventDefault();
      
      var userRole = isPartnerUser ? 'Customer' : $('#user-role').val();
      var newUser = {
        id: Helpers.generateId(),
        firstName: $('#user-firstname').val(),
        lastName: $('#user-lastname').val(),
        email: $('#user-email').val(),
        role: userRole,
        distributorId: (userRole === 'Distributor' && AppState.currentUser && AppState.currentUser.distributorId) ? 
                       AppState.currentUser.distributorId : null,
        customerId: isPartnerUser ? AppState.currentUser.customerId : 
                   (userRole === 'Customer' ? $('#user-customer').val() : null),
        status: 'Active'
      };
      
      AppState.users.push(newUser);
      $('#create-user-modal').modal('hide');
      UserManagementComponent.render();
      Helpers.showAlert('User created successfully. An email has been sent to ' + newUser.email + ' with password setup instructions.', 'success');
    });
    
    // Clean up modal on hide
    $('#create-user-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
  showEditUserModal: function(userId) {
    var isPartnerUser = AppState.currentUser && AppState.currentUser.role === 'Customer';
    var user = AppState.users.find(function(u) { return u.id === userId; });
    
    var modalHtml = '<div class="modal fade" id="edit-user-modal" tabindex="-1">' +
      '<div class="modal-dialog">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
      '<h4 class="modal-title">Edit User</h4>' +
      '</div>' +
      '<form id="edit-user-form">' +
      '<div class="modal-body">' +
      '<div class="form-group">' +
      '<label>First Name *</label>' +
      '<input type="text" class="form-control" id="user-firstname" value="' + Helpers.escapeHtml(user.firstName) + '" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Last Name *</label>' +
      '<input type="text" class="form-control" id="user-lastname" value="' + Helpers.escapeHtml(user.lastName) + '" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Email *</label>' +
      '<input type="email" class="form-control" id="user-email" value="' + Helpers.escapeHtml(user.email) + '" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<div class="checkbox">' +
      '<label>' +
      '<input type="checkbox" id="user-active" ' + (user.status === 'Active' ? 'checked' : '') + '> ' +
      'Active' +
      '</label>' +
      '<small class="help-block text-muted">Uncheck to deactivate this user</small>' +
      '</div>' +
      '</div>';
    
    // Only show role and customer select for distributor users
    if (!isPartnerUser) {
      modalHtml += '<div class="form-group">' +
        '<label>Role *</label>' +
        '<select class="form-control" id="user-role" required>' +
        '<option value="">Select role...</option>' +
        '<option value="Distributor" ' + (user.role === 'Distributor' ? 'selected' : '') + '>Distributor</option>' +
        '<option value="Customer" ' + (user.role === 'Customer' ? 'selected' : '') + '>Customer</option>' +
        '</select>' +
        '</div>' +
        '<div class="form-group" id="customer-select-group" style="' + (user.role === 'Customer' ? '' : 'display:none;') + '">' +
        '<label>Customer *</label>' +
        '<select class="form-control" id="user-customer">' +
        '<option value="">Select customer...</option>' +
        AppState.getFilteredCustomers().map(function(p) {
          return '<option value="' + p.id + '" ' + (user.customerId === p.id ? 'selected' : '') + '>' + Helpers.escapeHtml(p.name) + '</option>';
        }).join('') +
        '</select>' +
        '</div>';
    }
    
    var canDelete = user.id !== AppState.currentUser.id;
    
    modalHtml += '</div>' +
      '<div class="modal-footer">' +
      (canDelete ? 
        '<button type="button" class="btn btn-danger pull-left" id="delete-user-btn">' +
        '<span class="glyphicon glyphicon-trash"></span> Delete User' +
        '</button>' : '') +
      '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Save Changes</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>' +
      '</div>';
    
    $('body').append(modalHtml);
    $('#edit-user-modal').modal('show');
    
    // Show/hide customer select based on role (only for distributor users)
    if (!isPartnerUser) {
      // Set initial visibility based on current role
      if (user.role === 'Customer') {
        $('#customer-select-group').show();
        $('#user-customer').prop('required', true);
      } else {
        $('#customer-select-group').hide();
        $('#user-customer').prop('required', false);
      }
      
      $(document).on('change', '#user-role', function() {
        if ($(this).val() === 'Customer') {
          $('#customer-select-group').show();
          $('#user-customer').prop('required', true);
        } else {
          $('#customer-select-group').hide();
          $('#user-customer').prop('required', false);
        }
      });
    }
    
    // Handle form submission
    $(document).off('submit', '#edit-user-form').on('submit', '#edit-user-form', function(e) {
      e.preventDefault();
      
      var userRole = isPartnerUser ? 'Customer' : $('#user-role').val();
      user.firstName = $('#user-firstname').val();
      user.lastName = $('#user-lastname').val();
      user.email = $('#user-email').val();
      user.role = userRole;
      
      // Handle distributorId - preserve if existing, assign if changing to distributor role
      if (userRole === 'Distributor') {
        // If user is becoming a distributor user, assign current distributor's ID
        if (AppState.currentUser && AppState.currentUser.distributorId) {
          user.distributorId = AppState.currentUser.distributorId;
        }
      } else {
        // If user is not a distributor, clear distributorId
        user.distributorId = null;
      }
      
      user.customerId = isPartnerUser ? AppState.currentUser.customerId : 
                   (userRole === 'Customer' ? $('#user-customer').val() : null);
      user.status = $('#user-active').is(':checked') ? 'Active' : 'Inactive';
      
      $('#edit-user-modal').modal('hide');
      UserManagementComponent.render();
      Helpers.showAlert('User updated successfully', 'success');
    });
    
    // Handle delete user button
    if (canDelete) {
      $(document).off('click', '#delete-user-btn').on('click', '#delete-user-btn', function() {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
          // Remove user from array
          var userIndex = AppState.users.findIndex(function(u) { return u.id === userId; });
          if (userIndex > -1) {
            AppState.users.splice(userIndex, 1);
          }
          
          $('#edit-user-modal').modal('hide');
          UserManagementComponent.render();
          Helpers.showAlert('User deleted successfully', 'success');
        }
      });
    }
    
    // Clean up modal on hide
    $('#edit-user-modal').on('hidden.bs.modal', function() {
      $(this).remove();
    });
  },
  
};