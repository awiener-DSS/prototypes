// Customer Form Component (Multi-step wizard)

var CustomerFormComponent = {
  currentStep: 1,
  totalSteps: 5,
  isEditMode: false,
  editingCustomerId: null,
  defaultTermsAndConditions: 'Net 30 payment terms. Payment is due within 30 days of invoice date. Late payments may be subject to a 1.5% monthly interest charge. All sales are final unless otherwise specified in writing.',
  formData: {
    name: '',
    slug: '',
    status: 'active',
    logo: null,
    distributorCustomerId: '',
    keyAccountManager: {
      name: '',
      email: '',
      phone: ''
    },
    employeeFieldConfig: {
      requireEmployeeId: true,
      requireUsername: false,
      requireDateOfBirth: true,
      requireStartDate: false
    },
    paymentMethods: [],
    termsAndConditions: ''
  },
  
  init: function(customer) {
    this.currentStep = 1;
    this.isEditMode = !!customer;
    this.editingCustomerId = customer ? customer.id : null;
    
    if (customer) {
      // Payment methods always default to Credit Card only
      var paymentMethods = ['Credit Card'];
      
      // Handle keyAccountManager - could be old format (string) or new format (object)
      var keyAccountManager = customer.keyAccountManager || { name: '', email: '', phone: '' };
      if (typeof keyAccountManager === 'string') {
        // Migrate old string format to new object format
        keyAccountManager = { name: keyAccountManager, email: '', phone: '' };
      }
      
      // Format phone number if it exists and isn't already formatted
      if (keyAccountManager.phone && !/^\(\d{3}\)\d{3}-\d{4}$/.test(keyAccountManager.phone)) {
        keyAccountManager.phone = this.formatPhoneNumber(keyAccountManager.phone);
      }
      
      this.formData = {
        name: customer.name,
        slug: customer.slug,
        status: customer.status,
        logo: customer.logoUrl || null,
        distributorCustomerId: customer.distributorCustomerId || '',
        keyAccountManager: keyAccountManager,
        employeeFieldConfig: customer.employeeFieldConfig,
        paymentMethods: paymentMethods,
        termsAndConditions: customer.termsAndConditions || ''
      };
    } else {
      this.resetFormData();
    }
    
    this.render();
    this.attachEvents();
  },
  
  resetFormData: function() {
    this.formData = {
      name: '',
      slug: '',
      status: 'active',
      logo: null,
      distributorCustomerId: '',
      keyAccountManager: {
        name: '',
        email: '',
        phone: ''
      },
      employeeFieldConfig: {
        requireEmployeeId: true,
        requireUsername: false,
        requireDateOfBirth: true,
        requireStartDate: false
      },
      paymentMethods: ['Credit Card'], // Default to Credit Card for new customers
      termsAndConditions: ''
    };
  },
  
  render: function() {
    // Use single-page form for both create and edit modes
    $('#app-container').html(Templates.customerFormSinglePage(this.formData, this.isEditMode));
    this.updateSlugPreview();
  },
  
  attachEvents: function() {
    var self = this;
    
    // Remove all existing event handlers first to prevent duplicates
    $(document).off('click', '#cancel-customer-form');
    $(document).off('input change', '#customer-name');
    $(document).off('change', '#customer-status');
    $(document).off('input', '#customer-distributor-customer-id');
    $(document).off('input', '#customer-key-account-manager-name');
    $(document).off('input', '#customer-key-account-manager-email');
    $(document).off('input', '#customer-key-account-manager-phone');
    $(document).off('change', '#customer-logo-upload');
    $(document).off('click', '#remove-logo-btn');
    $(document).off('click', '#upload-logo-area');
    $(document).off('change', '#require-employee-id');
    $(document).off('change', '#require-username');
    $(document).off('change', '#require-dob');
    $(document).off('change', '#require-start-date');
    $(document).off('input', '#terms-and-conditions');
    $(document).off('click', '#use-default-terms-btn');
    $(document).off('click', '#save-customer-btn');
    
    // Cancel button
    $(document).on('click', '#cancel-customer-form', function(e) {
      e.preventDefault();
      App.navigate('dashboard');
    });
    
    // Form field changes
    $(document).on('input change', '#customer-name', function() {
      self.formData.name = $(this).val();
      if (!self.isEditMode) {
        self.formData.slug = self.generateSlug($(this).val());
        self.updateSlugPreview();
      }
    });
    
    $(document).on('change', '#customer-status', function() {
      self.formData.status = $(this).val();
    });
    
    $(document).on('input', '#customer-distributor-customer-id', function() {
      self.formData.distributorCustomerId = $(this).val();
    });
    
    $(document).on('input', '#customer-key-account-manager-name', function() {
      self.formData.keyAccountManager.name = $(this).val();
    });
    
    $(document).on('input', '#customer-key-account-manager-email', function() {
      self.formData.keyAccountManager.email = $(this).val();
    });
    
    $(document).on('input', '#customer-key-account-manager-phone', function() {
      var phoneValue = $(this).val();
      var cursorPosition = this.selectionStart;
      var digitsBeforeCursor = phoneValue.substring(0, cursorPosition).replace(/\D/g, '').length;
      var formatted = self.formatPhoneNumber(phoneValue);
      
      // Set the formatted value
      $(this).val(formatted);
      self.formData.keyAccountManager.phone = formatted;
      
      // Calculate new cursor position based on number of digits before cursor
      var newCursorPosition = 0;
      var digitCount = 0;
      for (var i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitCount++;
          if (digitCount > digitsBeforeCursor) {
            newCursorPosition = i;
            break;
          }
        }
        if (digitCount === digitsBeforeCursor) {
          newCursorPosition = i + 1;
        }
      }
      if (newCursorPosition === 0 && digitsBeforeCursor > 0) {
        newCursorPosition = formatted.length;
      }
      
      // Set cursor position after a brief delay to ensure the value is set
      setTimeout(function() {
        this.setSelectionRange(newCursorPosition, newCursorPosition);
      }.bind(this), 0);
    });
    
    // Logo upload
    $(document).on('change', '#customer-logo-upload', function(e) {
      self.handleLogoUpload(e);
    });
    
    $(document).on('click', '#remove-logo-btn', function() {
      self.formData.logo = null;
      self.render();
    });
    
    $(document).on('click', '#upload-logo-area', function() {
      $('#customer-logo-upload').click();
    });
    
    // Employee field config checkboxes - only allow changes if not in edit mode
    $(document).on('change', '#require-employee-id', function() {
      if (self.isEditMode) {
        // Prevent changes in edit mode - restore original value
        $(this).prop('checked', self.formData.employeeFieldConfig.requireEmployeeId);
        $('#require-username').prop('checked', self.formData.employeeFieldConfig.requireUsername);
        return;
      }
      if ($(this).prop('checked')) {
        self.formData.employeeFieldConfig.requireEmployeeId = true;
        self.formData.employeeFieldConfig.requireUsername = false;
      }
    });
    
    $(document).on('change', '#require-username', function() {
      if (self.isEditMode) {
        // Prevent changes in edit mode - restore original value
        $(this).prop('checked', self.formData.employeeFieldConfig.requireUsername);
        $('#require-employee-id').prop('checked', self.formData.employeeFieldConfig.requireEmployeeId);
        return;
      }
      if ($(this).prop('checked')) {
        self.formData.employeeFieldConfig.requireEmployeeId = false;
        self.formData.employeeFieldConfig.requireUsername = true;
      }
    });
    
    $(document).on('change', '#require-dob', function() {
      if (self.isEditMode) {
        // Prevent changes in edit mode - restore original value
        $(this).prop('checked', self.formData.employeeFieldConfig.requireDateOfBirth);
        $('#require-start-date').prop('checked', self.formData.employeeFieldConfig.requireStartDate);
        return;
      }
      if ($(this).prop('checked')) {
        self.formData.employeeFieldConfig.requireDateOfBirth = true;
        self.formData.employeeFieldConfig.requireStartDate = false;
      }
    });
    
    $(document).on('change', '#require-start-date', function() {
      if (self.isEditMode) {
        // Prevent changes in edit mode - restore original value
        $(this).prop('checked', self.formData.employeeFieldConfig.requireStartDate);
        $('#require-dob').prop('checked', self.formData.employeeFieldConfig.requireDateOfBirth);
        return;
      }
      if ($(this).prop('checked')) {
        self.formData.employeeFieldConfig.requireDateOfBirth = false;
        self.formData.employeeFieldConfig.requireStartDate = true;
      }
    });
    
    // Payment methods are no longer shown in the form - always default to Credit Card
    
    // Terms and conditions
    $(document).on('input', '#terms-and-conditions', function() {
      self.formData.termsAndConditions = $(this).val();
    });
    
    $(document).on('click', '#use-default-terms-btn', function() {
      $('#terms-and-conditions').val(self.defaultTermsAndConditions);
      self.formData.termsAndConditions = self.defaultTermsAndConditions;
    });
    
    // Save button
    $(document).on('click', '#save-customer-btn', function() {
      self.handleSave();
    });
  },
  
  generateSlug: function(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },
  
  formatPhoneNumber: function(value) {
    // Remove all non-digit characters
    var digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }
    
    // Format as (XXX)XXX-XXXX
    if (digits.length === 0) {
      return '';
    } else if (digits.length <= 3) {
      return '(' + digits;
    } else if (digits.length <= 6) {
      return '(' + digits.substring(0, 3) + ')' + digits.substring(3);
    } else {
      return '(' + digits.substring(0, 3) + ')' + digits.substring(3, 6) + '-' + digits.substring(6);
    }
  },
  
  updateSlugPreview: function() {
    var distributorName = AppState.distributorName || 'Premier Distributor Co';
    var distributorSlug = this.generateSlug(distributorName);
    var customerSlug = this.formData.slug || 'customer-name';
    var url = 'www.surewerxdistributor.com/<span style="color: #666;">' + distributorSlug + '</span>/<strong>' + customerSlug + '</strong>';
    $('#slug-preview').html(url);
  },
  
  handleLogoUpload: function(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      Helpers.showAlert('Logo file size must be less than 5MB', 'danger');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      Helpers.showAlert('Please upload an image file', 'danger');
      return;
    }
    
    var reader = new FileReader();
    var self = this;
    reader.onload = function(event) {
      self.formData.logo = event.target.result;
      self.render();
    };
    reader.readAsDataURL(file);
  },
  
  validateStep: function(step) {
    switch(step) {
      case 1:
        if (!this.formData.name.trim()) {
          Helpers.showAlert('Please enter a customer name', 'danger', '#next-step-btn');
          return false;
        }
        // Validate key account manager fields (all mandatory)
        if (!this.formData.keyAccountManager.name.trim()) {
          Helpers.showAlert('Please enter the key account manager name', 'danger', '#next-step-btn');
          return false;
        }
        if (!this.formData.keyAccountManager.email.trim()) {
          Helpers.showAlert('Please enter the key account manager email', 'danger', '#next-step-btn');
          return false;
        }
        // Basic email validation
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.formData.keyAccountManager.email.trim())) {
          Helpers.showAlert('Please enter a valid email address for the key account manager', 'danger', '#next-step-btn');
          return false;
        }
        var phoneDigits = this.formData.keyAccountManager.phone.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
          Helpers.showAlert('Please enter a valid 10-digit phone number', 'danger', '#next-step-btn');
          return false;
        }
        // Auto-generate slug from name if not in edit mode
        if (!this.isEditMode) {
          this.formData.slug = this.generateSlug(this.formData.name);
          if (!this.formData.slug.trim()) {
            Helpers.showAlert('Customer name must contain at least one letter or number', 'danger', '#next-step-btn');
            return false;
          }
          // Check if slug already exists (only for new customers)
          var existingCustomer = AppState.customers.find(function(p) {
            return p.slug === this.formData.slug;
          }.bind(this));
          if (existingCustomer) {
            // If slug exists, append a number to make it unique
            var baseSlug = this.formData.slug;
            var counter = 1;
            while (existingCustomer) {
              this.formData.slug = baseSlug + '-' + counter;
              existingCustomer = AppState.customers.find(function(p) {
                return p.slug === this.formData.slug;
              }.bind(this));
              counter++;
            }
            this.updateSlugPreview();
          }
        }
        return true;
      case 3:
        // Check at least one identifier field
        var hasIdentifier = this.formData.employeeFieldConfig.requireEmployeeId || 
                           this.formData.employeeFieldConfig.requireUsername;
        if (!hasIdentifier) {
          Helpers.showAlert('Please select at least one identifier field (Employee ID or Username)', 'danger', '#next-step-btn');
          return false;
        }
        // Check at least one date field
        var hasDate = this.formData.employeeFieldConfig.requireDateOfBirth || 
                     this.formData.employeeFieldConfig.requireStartDate;
        if (!hasDate) {
          Helpers.showAlert('Please select at least one date field (Date of Birth or Start Date)', 'danger', '#next-step-btn');
          return false;
        }
        return true;
      case 4:
        // Terms & Conditions step (no validation needed)
        return true;
      default:
        return true;
    }
  },
  
  handleSave: function() {
    // Validate all required fields for both create and edit modes
    // Validate step 1 fields (name, key account manager)
    if (!this.validateStep(1)) {
      return;
    }
    // For create mode, also validate employee field config
    if (!this.isEditMode) {
      if (!this.validateStep(3)) {
        return;
      }
    }
    
    // Ensure payment methods default to Credit Card if not set
    if (!this.formData.paymentMethods || this.formData.paymentMethods.length === 0) {
      this.formData.paymentMethods = ['Credit Card'];
    }
    
    if (this.isEditMode) {
      // Get the original customer to preserve identifier fields
      var originalCustomer = AppState.getCustomerById(this.editingCustomerId);
      
      // Update existing customer - preserve all employee field config from original
      var employeeFieldConfig = {
        requireEmployeeId: originalCustomer.employeeFieldConfig.requireEmployeeId,
        requireUsername: originalCustomer.employeeFieldConfig.requireUsername,
        requireDateOfBirth: originalCustomer.employeeFieldConfig.requireDateOfBirth,
        requireStartDate: originalCustomer.employeeFieldConfig.requireStartDate
      };
      
      AppState.updateCustomer(this.editingCustomerId, {
        name: this.formData.name.trim(),
        status: this.formData.status,
        logoUrl: this.formData.logo,
        distributorCustomerId: this.formData.distributorCustomerId.trim(),
        keyAccountManager: {
          name: this.formData.keyAccountManager.name.trim(),
          email: this.formData.keyAccountManager.email.trim(),
          phone: this.formData.keyAccountManager.phone.trim()
        },
        employeeFieldConfig: employeeFieldConfig,
        paymentMethods: this.formData.paymentMethods,
        termsAndConditions: this.formData.termsAndConditions.trim()
      });
      
      Helpers.showAlert('Customer updated successfully', 'success');
    } else {
      // Show acknowledgment modal BEFORE creating customer
      var self = this;
      Templates.showCustomerCreationAcknowledgment(function() {
        // User acknowledged - now create the customer
        var newCustomer = {
          id: Helpers.generateId(),
          name: self.formData.name.trim(),
          slug: self.formData.slug.trim(),
          industry: 'General', // Default industry
          status: self.formData.status,
          logoUrl: self.formData.logo,
          distributorCustomerId: self.formData.distributorCustomerId.trim(),
          keyAccountManager: {
            name: self.formData.keyAccountManager.name.trim(),
            email: self.formData.keyAccountManager.email.trim(),
            phone: self.formData.keyAccountManager.phone.trim()
          },
          employeeCount: 0,
          activeVouchers: 0,
          monthlySpend: 0,
          totalBudget: 0,
          paymentMethods: self.formData.paymentMethods,
          employeeFieldConfig: self.formData.employeeFieldConfig,
          termsAndConditions: self.formData.termsAndConditions.trim() || self.defaultTermsAndConditions,
          employees: [],
          groups: [],
          vouchers: [],
          availableProducts: AppState.products.slice(),
          distributorId: AppState.getCurrentDistributorId() // Assign to current distributor
        };
        
        AppState.customers.push(newCustomer);
        AppState.saveCustomers();
        Helpers.showAlert('Customer created successfully', 'success');
        
        // Navigate to customer detail page
        setTimeout(function() {
          // Verify customer exists before navigating
          var savedCustomer = AppState.getCustomerById(newCustomer.id);
          if (savedCustomer) {
            App.navigate('customer-detail', { customerId: newCustomer.id });
          } else {
            // If customer not found, reload and try again
            console.error('Customer not found after save, reloading...');
            window.location.reload();
          }
        }, 100);
      }, function() {
        // User cancelled - stay on form (do nothing, modal will close)
      });
      return;
    }
    
    App.navigate('dashboard');
  }
};