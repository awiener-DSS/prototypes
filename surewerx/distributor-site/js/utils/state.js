// Global Application State
var AppState = {
  isLoggedIn: false,
  currentUser: null,
  currentView: 'login',
  currentCustomerId: null,
  currentTab: 'employees',
  distributorName: 'My Distributor',
  distributorLogo: null,
  branchLocations: [], // Array of branch locations with { id, branchId, branchAddress }
  selectedDistributorId: null, // For SureWerx employees to select which distributor to view as
  customers: [],
  transactions: [],
  users: [],
  products: [],
  distributors: [], // List of distributors for SureWerx employees
  
  // Initialize state
  init: function() {
    this.loadFromStorage();
    this.initializeData();
  },
  
  // Load state from localStorage
  loadFromStorage: function() {
    var stored = localStorage.getItem('appState');
    if (stored) {
      var parsed = JSON.parse(stored);
      this.isLoggedIn = parsed.isLoggedIn || false;
      this.currentUser = parsed.currentUser || null;
      
      // If currentUser exists but doesn't have distributorId, try to get it from users array
      if (this.currentUser && !this.currentUser.distributorId && this.currentUser.role === 'Distributor') {
        // We'll need to look it up after users are initialized, so we'll handle this in initializeData
      }
      // Load distributor settings from localStorage if they exist
      // But for distributor users and customer users, we'll set it based on their distributorId in initializeData
      if (this.currentUser && (this.currentUser.role === 'Distributor' || this.currentUser.role === 'Customer')) {
        // Don't load distributorName/Logo from localStorage for distributor or customer users
        // They will be set in initializeData based on their distributorId
      } else {
        // For SureWerx users, load from localStorage
      if (parsed.distributorName !== undefined) {
        this.distributorName = parsed.distributorName;
      }
      if (parsed.distributorLogo !== undefined) {
        this.distributorLogo = parsed.distributorLogo;
      } else {
        // Only set Fastenal logo as default if the distributor is actually Fastenal
        // Check if selected distributor is Fastenal (for SureWerx users)
        if (parsed.selectedDistributorId === 'd1') {
          // SureWerx user selected Fastenal
          this.distributorLogo = 'images/Fastenal_logo.png';
          this.saveToStorage();
        } else {
          // No default logo for other distributors
          this.distributorLogo = null;
        }
      }
      // Load branch locations
      if (parsed.branchLocations && Array.isArray(parsed.branchLocations)) {
        this.branchLocations = parsed.branchLocations;
      }
      }
      // Only load selectedDistributorId if current user is SureWerx (it's not relevant for distributor users)
      if (parsed.selectedDistributorId !== undefined && 
          this.currentUser && 
          this.currentUser.role === 'SureWerx') {
        this.selectedDistributorId = parsed.selectedDistributorId;
      } else if (this.currentUser && this.currentUser.role === 'Distributor') {
        // Clear selectedDistributorId for distributor users
        this.selectedDistributorId = null;
      }
      // Load customers from localStorage if they exist
      if (parsed.customers && Array.isArray(parsed.customers) && parsed.customers.length > 0) {
        // Filter out customers to delete: 'adam', 'abc', 'Adam Co', 'AdamCo'
        var customersToDelete = ['adam', 'abc', 'Adam Co', 'AdamCo'];
        this.customers = parsed.customers.filter(function(customer) {
          return customersToDelete.indexOf(customer.name) === -1;
        });
        // Ensure all customers have locations array
        this.customers.forEach(function(customer) {
          if (!customer.locations) {
            customer.locations = [];
          }
        });
        // If customers were filtered out or locations were added, save the updated list
        if (this.customers.length !== parsed.customers.length) {
          this.saveCustomers();
        }
      }
    } else {
      // No stored state - ensure customers will be initialized with distributorId
      this.customers = [];
    }
  },
  
  // Save state to localStorage
  saveToStorage: function() {
    var toSave = {
      isLoggedIn: this.isLoggedIn,
      currentUser: this.currentUser,
      distributorName: this.distributorName,
      distributorLogo: this.distributorLogo,
      branchLocations: this.branchLocations,
      selectedDistributorId: this.selectedDistributorId,
      customers: this.customers
    };
    localStorage.setItem('appState', JSON.stringify(toSave));
  },
  
  // Get current distributor info (for SureWerx employees)
  getCurrentDistributor: function() {
    if (this.currentUser && this.currentUser.role === 'SureWerx' && this.selectedDistributorId) {
      return this.distributors.find(function(d) { return d.id === this.selectedDistributorId; }.bind(this));
    }
    return null;
  },
  
  // Set selected distributor (for SureWerx employees)
  setSelectedDistributor: function(distributorId) {
    this.selectedDistributorId = distributorId;
    var distributor = this.distributors.find(function(d) { return d.id === distributorId; });
    if (distributor) {
      this.distributorName = distributor.name;
      // Only use Fastenal logo if the distributor is Fastenal, otherwise use their logo or null
      this.distributorLogo = distributor.logo || null;
    }
    this.saveToStorage();
  },
  
  // Save customers to localStorage
  saveCustomers: function() {
    var stored = localStorage.getItem('appState');
    var toSave = stored ? JSON.parse(stored) : {};
    toSave.customers = this.customers;
    // Also update the full state to ensure consistency
    toSave.isLoggedIn = this.isLoggedIn;
    toSave.currentUser = this.currentUser;
    toSave.distributorName = this.distributorName;
    toSave.distributorLogo = this.distributorLogo;
    toSave.branchLocations = this.branchLocations;
    toSave.selectedDistributorId = this.selectedDistributorId;
    localStorage.setItem('appState', JSON.stringify(toSave));
  },
  
  // Login user
  login: function(email, password) {
    // Find user in mock data
    var user = this.users.find(function(u) {
      return u.email === email && u.password === password;
    });
    
    if (user) {
      this.isLoggedIn = true;
      this.currentUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        distributorId: user.distributorId,
        customerId: user.customerId
      };
      
      // Clear selectedDistributorId for distributor users (it's only for SureWerx users)
      // Also set distributor name and logo based on their distributorId
      if (user.role === 'Distributor' && user.distributorId) {
        this.selectedDistributorId = null;
        // Set distributor name and logo from their distributor record
        // Note: distributors array is initialized in initializeData, so we'll set it there
        // But we can set it here if we have access to it, or we'll do it in initializeData
      }
      
      this.saveToStorage();
      return true;
    }
    return false;
  },
  
  // Logout user
  logout: function() {
    this.isLoggedIn = false;
    this.currentUser = null;
    this.currentView = 'login';
    this.saveToStorage();
  },
  
  // Navigate to view
  navigate: function(view, params) {
    this.currentView = view;
    if (params && params.customerId) {
      this.currentCustomerId = params.customerId;
    }
    if (params && params.tab) {
      this.currentTab = params.tab;
    }
  },
  
  // Get current distributor ID (for distributor users or SureWerx users viewing as a distributor)
  getCurrentDistributorId: function() {
    // If distributor user, always use their distributorId (ignore selectedDistributorId)
    if (this.currentUser && this.currentUser.role === 'Distributor' && this.currentUser.distributorId) {
      // Ensure selectedDistributorId is cleared for distributor users
      if (this.selectedDistributorId !== null) {
        this.selectedDistributorId = null;
        this.saveToStorage();
      }
      return this.currentUser.distributorId;
    }
    // If SureWerx user has selected a distributor, use that
    if (this.currentUser && this.currentUser.role === 'SureWerx' && this.selectedDistributorId) {
      return this.selectedDistributorId;
    }
    return null;
  },
  
  // Get filtered customers based on current distributor
  getFilteredCustomers: function() {
    var distributorId = this.getCurrentDistributorId();
    
    // If no distributor context (e.g., SureWerx not viewing as distributor, or Customer user), return all customers
    if (!distributorId) {
      return this.customers;
    }
    
    // Filter customers by distributorId
    return this.customers.filter(function(customer) {
      return customer.distributorId === distributorId;
    });
  },
  
  // Get customer by ID
  getCustomerById: function(id) {
    return this.customers.find(function(p) { return p.id === id; });
  },
  
  // Update customer
  updateCustomer: function(customerId, updates) {
    var index = this.customers.findIndex(function(p) { return p.id === customerId; });
    if (index > -1) {
      this.customers[index] = Object.assign({}, this.customers[index], updates);
      // Ensure locations array exists
      if (!this.customers[index].locations) {
        this.customers[index].locations = [];
      }
      this.saveCustomers();
      return true;
    }
    return false;
  },
  
  // Get customer location by ID
  getCustomerLocationById: function(customerId, locationId) {
    var customer = this.getCustomerById(customerId);
    if (!customer || !customer.locations) return null;
    return customer.locations.find(function(l) { return l.id === locationId; });
  },
  
  // Get department by ID (searches through all locations)
  getDepartmentById: function(customerId, departmentId) {
    var customer = this.getCustomerById(customerId);
    if (!customer || !customer.locations) return null;
    for (var i = 0; i < customer.locations.length; i++) {
      var location = customer.locations[i];
      if (location.departments) {
        var department = location.departments.find(function(d) { return d.id === departmentId; });
        if (department) return department;
      }
    }
    return null;
  },
  
  // Initialize mock data
  initializeData: function() {
    // Global Products - 100 Demo Products
    this.products = [
      // Eye Protection (15 products)
      { id: 'prod1', name: 'Safety Glasses - Clear Lens', category: 'Eye Protection', supplier: 'SafetyFirst Inc', price: 15.99, cost: 12.00, surewerxSku: 'SWX-SG-001', customSku: 'SG-CLEAR-001', description: 'Clear lens safety glasses with side shields', status: 'Active', visible: true },
      { id: 'prod2', name: 'Safety Glasses - Tinted', category: 'Eye Protection', supplier: 'SafetyFirst Inc', price: 17.99, cost: 13.50, surewerxSku: 'SWX-SG-002', customSku: 'SG-TINT-002', description: 'Tinted lens safety glasses for outdoor use', status: 'Active', visible: true },
      { id: 'prod3', name: 'Safety Goggles - Anti-Fog', category: 'Eye Protection', supplier: 'ProGear Ltd', price: 22.99, cost: 16.00, surewerxSku: 'SWX-SG-003', customSku: 'GG-ANTIFOG-003', description: 'Anti-fog safety goggles with indirect ventilation', status: 'Active', visible: true },
      { id: 'prod4', name: 'Face Shield - Full Coverage', category: 'Eye Protection', supplier: 'SafetyFirst Inc', price: 28.99, cost: 21.00, surewerxSku: 'SWX-FS-001', customSku: 'FS-FULL-001', description: 'Full face shield with adjustable headband', status: 'Active', visible: true },
      { id: 'prod5', name: 'Welding Helmet - Auto-Darkening', category: 'Eye Protection', supplier: 'WeldTech Pro', price: 125.99, cost: 95.00, surewerxSku: 'SWX-WH-001', customSku: 'WH-AUTO-001', description: 'Auto-darkening welding helmet with adjustable shade', status: 'Active', visible: true },
      { id: 'prod6', name: 'Safety Glasses - Polarized', category: 'Eye Protection', supplier: 'ProGear Ltd', price: 24.99, cost: 18.00, surewerxSku: 'SWX-SG-004', description: 'Polarized safety glasses for glare reduction', status: 'Active', visible: true },
      { id: 'prod7', name: 'Safety Goggles - Chemical Splash', category: 'Eye Protection', supplier: 'SafetyFirst Inc', price: 19.99, cost: 14.50, surewerxSku: 'SWX-SG-005', description: 'Chemical splash resistant safety goggles', status: 'Active', visible: true },
      { id: 'prod8', name: 'Safety Glasses - Bifocal', category: 'Eye Protection', supplier: 'ProGear Ltd', price: 26.99, cost: 19.50, surewerxSku: 'SWX-SG-006', description: 'Bifocal safety glasses with reading magnification', status: 'Active', visible: true },
      { id: 'prod9', name: 'Face Shield - Mesh', category: 'Eye Protection', supplier: 'SafetyFirst Inc', price: 18.99, cost: 13.00, surewerxSku: 'SWX-FS-002', description: 'Mesh face shield for forestry work', status: 'Active', visible: true },
      { id: 'prod10', name: 'Safety Glasses - Mirror Lens', category: 'Eye Protection', supplier: 'ProGear Ltd', price: 21.99, cost: 16.00, surewerxSku: 'SWX-SG-007', description: 'Mirror lens safety glasses for extreme brightness', status: 'Active', visible: true },
      { id: 'prod11', name: 'Over-Glasses Safety Spectacles', category: 'Eye Protection', supplier: 'SafetyFirst Inc', price: 19.99, cost: 14.00, surewerxSku: 'SWX-SG-008', description: 'Safety spectacles designed to fit over prescription glasses', status: 'Active', visible: true },
      { id: 'prod12', name: 'Laser Safety Glasses - Green', category: 'Eye Protection', supplier: 'LaserSafe Pro', price: 89.99, cost: 68.00, surewerxSku: 'SWX-LS-001', description: 'Green laser safety glasses with OD4+ protection', status: 'Active', visible: true },
      { id: 'prod13', name: 'Safety Glasses - Blue Light Blocking', category: 'Eye Protection', supplier: 'ProGear Ltd', price: 23.99, cost: 17.50, surewerxSku: 'SWX-SG-009', description: 'Blue light blocking safety glasses for screen work', status: 'Active', visible: true },
      { id: 'prod14', name: 'Welding Goggles - Shade 5', category: 'Eye Protection', supplier: 'WeldTech Pro', price: 32.99, cost: 24.00, surewerxSku: 'SWX-WG-001', description: 'Flip-up welding goggles with shade 5 lens', status: 'Active', visible: true },
      { id: 'prod15', name: 'Safety Glasses - Foam Lined', category: 'Eye Protection', supplier: 'SafetyFirst Inc', price: 20.99, cost: 15.50, surewerxSku: 'SWX-SG-010', description: 'Foam lined safety glasses for dust protection', status: 'Active', visible: true },
      
      // Head Protection (12 products)
      { id: 'prod16', name: 'Hard Hat - Yellow', category: 'Head Protection', supplier: 'SafetyFirst Inc', price: 24.99, cost: 18.50, surewerxSku: 'SWX-HH-002', customSku: 'HH-YEL-002', description: 'Type 1 hard hat with ratchet suspension', status: 'Active', visible: true },
      { id: 'prod17', name: 'Hard Hat - White', category: 'Head Protection', supplier: 'SafetyFirst Inc', price: 24.99, cost: 18.50, surewerxSku: 'SWX-HH-003', customSku: 'HH-WHT-003', description: 'Type 1 hard hat in white with ratchet suspension', status: 'Active', visible: true },
      { id: 'prod18', name: 'Hard Hat - Orange', category: 'Head Protection', supplier: 'ProGear Ltd', price: 26.99, cost: 20.00, surewerxSku: 'SWX-HH-004', customSku: 'HH-ORG-004', description: 'Type 1 hard hat in high visibility orange', status: 'Active', visible: true },
      { id: 'prod19', name: 'Hard Hat - Vented', category: 'Head Protection', supplier: 'SafetyFirst Inc', price: 29.99, cost: 22.50, surewerxSku: 'SWX-HH-005', customSku: 'HH-VENT-005', description: 'Vented hard hat for improved air circulation', status: 'Active', visible: true },
      { id: 'prod20', name: 'Hard Hat - Full Brim', category: 'Head Protection', supplier: 'ProGear Ltd', price: 32.99, cost: 25.00, surewerxSku: 'SWX-HH-006', customSku: 'HH-BRIM-006', description: 'Full brim hard hat for sun and rain protection', status: 'Active', visible: true },
      { id: 'prod21', name: 'Bump Cap - Baseball Style', category: 'Head Protection', supplier: 'SafetyFirst Inc', price: 18.99, cost: 14.00, surewerxSku: 'SWX-BC-001', description: 'Baseball style bump cap with protective insert', status: 'Active', visible: true },
      { id: 'prod22', name: 'Hard Hat - Electrical Rated', category: 'Head Protection', supplier: 'ProGear Ltd', price: 34.99, cost: 26.50, surewerxSku: 'SWX-HH-007', description: 'Class E electrical rated hard hat', status: 'Active', visible: true },
      { id: 'prod23', name: 'Winter Liner for Hard Hat', category: 'Head Protection', supplier: 'SafetyFirst Inc', price: 12.99, cost: 9.50, surewerxSku: 'SWX-HL-001', description: 'Insulated winter liner for hard hats', status: 'Active', visible: true },
      { id: 'prod24', name: 'Hard Hat - Climbing Helmet Style', category: 'Head Protection', supplier: 'ClimbSafe', price: 45.99, cost: 35.00, surewerxSku: 'SWX-HH-008', description: 'Climbing helmet style hard hat with chin strap', status: 'Active', visible: true },
      { id: 'prod25', name: 'Hard Hat Accessories Kit', category: 'Head Protection', supplier: 'SafetyFirst Inc', price: 15.99, cost: 11.50, surewerxSku: 'SWX-HA-001', description: 'Kit includes chin strap, sweatband, and clips', status: 'Active', visible: true },
      { id: 'prod26', name: 'Hard Hat - Carbon Fiber', category: 'Head Protection', supplier: 'ProGear Ltd', price: 89.99, cost: 68.00, surewerxSku: 'SWX-HH-009', description: 'Ultra-lightweight carbon fiber hard hat', status: 'Active', visible: true },
      { id: 'prod27', name: 'Welding Hard Hat Adapter', category: 'Head Protection', supplier: 'WeldTech Pro', price: 22.99, cost: 17.00, surewerxSku: 'SWX-WA-001', description: 'Adapter for mounting welding helmet to hard hat', status: 'Active', visible: true },
      
      // Hand Protection (18 products)
      { id: 'prod28', name: 'Work Gloves - Leather', category: 'Hand Protection', supplier: 'ProGear Ltd', price: 12.99, cost: 9.00, surewerxSku: 'SWX-GL-003', description: 'Premium leather work gloves', status: 'Active', visible: true },
      { id: 'prod29', name: 'Work Gloves - Cowhide', category: 'Hand Protection', supplier: 'SafetyFirst Inc', price: 14.99, cost: 11.00, surewerxSku: 'SWX-GL-004', description: 'Heavy duty cowhide work gloves', status: 'Active', visible: true },
      { id: 'prod30', name: 'Nitrile Gloves - Disposable (100pk)', category: 'Hand Protection', supplier: 'MedSupply Co', price: 19.99, cost: 14.50, surewerxSku: 'SWX-NG-001', description: 'Box of 100 disposable nitrile gloves', status: 'Active', visible: true },
      { id: 'prod31', name: 'Cut Resistant Gloves - Level 5', category: 'Hand Protection', supplier: 'ProGear Ltd', price: 24.99, cost: 18.50, surewerxSku: 'SWX-CR-001', description: 'ANSI Level 5 cut resistant gloves', status: 'Active', visible: true },
      { id: 'prod32', name: 'Welding Gloves - Heavy Duty', category: 'Hand Protection', supplier: 'WeldTech Pro', price: 28.99, cost: 22.00, surewerxSku: 'SWX-WG-002', description: 'Heavy duty leather welding gloves', status: 'Active', visible: true },
      { id: 'prod33', name: 'Mechanic Gloves - Synthetic Leather', category: 'Hand Protection', supplier: 'SafetyFirst Inc', price: 16.99, cost: 12.50, surewerxSku: 'SWX-MG-001', description: 'Synthetic leather mechanic gloves with padding', status: 'Active', visible: true },
      { id: 'prod34', name: 'Chemical Resistant Gloves', category: 'Hand Protection', supplier: 'ProGear Ltd', price: 21.99, cost: 16.50, surewerxSku: 'SWX-CG-001', description: 'Chemical resistant nitrile gloves with extended cuff', status: 'Active', visible: true },
      { id: 'prod35', name: 'Winter Work Gloves - Insulated', category: 'Hand Protection', supplier: 'SafetyFirst Inc', price: 18.99, cost: 14.00, surewerxSku: 'SWX-WW-001', description: 'Insulated winter work gloves with grip coating', status: 'Active', visible: true },
      { id: 'prod36', name: 'Latex Gloves - Disposable (100pk)', category: 'Hand Protection', supplier: 'MedSupply Co', price: 15.99, cost: 11.50, surewerxSku: 'SWX-LG-001', description: 'Box of 100 disposable latex gloves', status: 'Active', visible: true },
      { id: 'prod37', name: 'Impact Resistant Gloves', category: 'Hand Protection', supplier: 'ProGear Ltd', price: 26.99, cost: 20.00, surewerxSku: 'SWX-IG-001', description: 'TPR impact resistant mechanic gloves', status: 'Active', visible: true },
      { id: 'prod38', name: 'Heat Resistant Gloves - 500°F', category: 'Hand Protection', supplier: 'WeldTech Pro', price: 32.99, cost: 25.00, surewerxSku: 'SWX-HR-001', description: 'Heat resistant gloves rated to 500°F', status: 'Active', visible: true },
      { id: 'prod39', name: 'Puncture Resistant Gloves', category: 'Hand Protection', supplier: 'SafetyFirst Inc', price: 22.99, cost: 17.00, surewerxSku: 'SWX-PR-001', description: 'Puncture resistant gloves with reinforced palms', status: 'Active', visible: true },
      { id: 'prod40', name: 'Knit Gloves with Rubber Grip (12pk)', category: 'Hand Protection', supplier: 'ProGear Ltd', price: 24.99, cost: 18.50, surewerxSku: 'SWX-KG-001', description: 'Pack of 12 cotton knit gloves with rubber grip', status: 'Active', visible: true },
      { id: 'prod41', name: 'Electrical Gloves - Class 0', category: 'Hand Protection', supplier: 'ElectroSafe', price: 89.99, cost: 68.00, surewerxSku: 'SWX-EG-001', description: 'Class 0 electrical insulating gloves (1000V)', status: 'Active', visible: true },
      { id: 'prod42', name: 'Assembly Gloves - Precision Grip', category: 'Hand Protection', supplier: 'SafetyFirst Inc', price: 11.99, cost: 8.50, surewerxSku: 'SWX-AG-001', description: 'Precision assembly gloves with PU coating', status: 'Active', visible: true },
      { id: 'prod43', name: 'Kevlar Gloves - Cut Level 4', category: 'Hand Protection', supplier: 'ProGear Ltd', price: 29.99, cost: 22.50, surewerxSku: 'SWX-KV-001', description: 'Kevlar blend cut resistant gloves', status: 'Active', visible: true },
      { id: 'prod44', name: 'Nitrile Palm Gloves (12pk)', category: 'Hand Protection', supplier: 'SafetyFirst Inc', price: 19.99, cost: 14.50, surewerxSku: 'SWX-NP-001', description: 'Pack of 12 nitrile palm coated gloves', status: 'Active', visible: true },
      { id: 'prod45', name: 'Anti-Vibration Gloves', category: 'Hand Protection', supplier: 'ProGear Ltd', price: 34.99, cost: 26.50, surewerxSku: 'SWX-AV-001', description: 'Anti-vibration gloves for power tool use', status: 'Active', visible: true },
      
      // Body Protection (15 products)
      { id: 'prod46', name: 'Safety Vest - Hi-Vis Orange', category: 'Body Protection', supplier: 'ProGear Ltd', price: 19.99, cost: 14.00, surewerxSku: 'SWX-SV-004', customSku: 'VEST-ORANGE-004', description: 'Class 2 high visibility safety vest', status: 'Active', visible: true },
      { id: 'prod47', name: 'Safety Vest - Hi-Vis Yellow', category: 'Body Protection', supplier: 'SafetyFirst Inc', price: 19.99, cost: 14.00, surewerxSku: 'SWX-SV-005', customSku: 'VEST-YELLOW-005', description: 'Class 2 high visibility safety vest in yellow', status: 'Active', visible: true },
      { id: 'prod48', name: 'Reflective Vest - Class 3', category: 'Body Protection', supplier: 'ProGear Ltd', price: 29.99, cost: 22.50, surewerxSku: 'SWX-RV-001', customSku: 'VEST-REF-C3', description: 'Class 3 high visibility vest with sleeves', status: 'Active', visible: true },
      { id: 'prod49', name: 'Coveralls - Disposable (25pk)', category: 'Body Protection', supplier: 'SafetyFirst Inc', price: 49.99, cost: 38.00, surewerxSku: 'SWX-CV-001', description: 'Pack of 25 disposable coveralls', status: 'Active', visible: true },
      { id: 'prod50', name: 'Work Shirt - Hi-Vis Long Sleeve', category: 'Body Protection', supplier: 'ProGear Ltd', price: 34.99, cost: 26.50, surewerxSku: 'SWX-WS-001', description: 'Class 2 high visibility long sleeve work shirt', status: 'Active', visible: true },
      { id: 'prod51', name: 'Work Pants - Canvas', category: 'Body Protection', supplier: 'SafetyFirst Inc', price: 42.99, cost: 32.50, surewerxSku: 'SWX-WP-001', description: 'Heavy duty canvas work pants with knee pads', status: 'Active', visible: true },
      { id: 'prod52', name: 'Welding Jacket - Leather', category: 'Body Protection', supplier: 'WeldTech Pro', price: 89.99, cost: 68.00, surewerxSku: 'SWX-WJ-001', description: 'Leather welding jacket with snap closures', status: 'Active', visible: true },
      { id: 'prod53', name: 'Rain Suit - 2 Piece', category: 'Body Protection', supplier: 'SafetyFirst Inc', price: 38.99, cost: 29.50, surewerxSku: 'SWX-RS-001', description: 'Two piece PVC rain suit with hood', status: 'Active', visible: true },
      { id: 'prod54', name: 'Apron - Leather', category: 'Body Protection', supplier: 'ProGear Ltd', price: 45.99, cost: 35.00, surewerxSku: 'SWX-AP-001', description: 'Heavy duty leather apron for welding', status: 'Active', visible: true },
      { id: 'prod55', name: 'Safety Vest - Mesh', category: 'Body Protection', supplier: 'SafetyFirst Inc', price: 15.99, cost: 11.50, surewerxSku: 'SWX-SV-006', description: 'Lightweight mesh safety vest for hot weather', status: 'Active', visible: true },
      { id: 'prod56', name: 'Coveralls - Flame Resistant', category: 'Body Protection', supplier: 'FlameSafe Pro', price: 125.99, cost: 95.00, surewerxSku: 'SWX-FR-001', description: 'Flame resistant coveralls with reflective trim', status: 'Active', visible: true },
      { id: 'prod57', name: 'Winter Jacket - Insulated Hi-Vis', category: 'Body Protection', supplier: 'ProGear Ltd', price: 89.99, cost: 68.00, surewerxSku: 'SWX-WJ-002', description: 'Insulated high visibility winter jacket', status: 'Active', visible: true },
      { id: 'prod58', name: 'Lab Coat - Disposable (10pk)', category: 'Body Protection', supplier: 'MedSupply Co', price: 34.99, cost: 26.50, surewerxSku: 'SWX-LC-001', description: 'Pack of 10 disposable lab coats', status: 'Active', visible: true },
      { id: 'prod59', name: 'Bib Overalls - Canvas', category: 'Body Protection', supplier: 'SafetyFirst Inc', price: 54.99, cost: 42.00, surewerxSku: 'SWX-BO-001', description: 'Heavy duty canvas bib overalls', status: 'Active', visible: true },
      { id: 'prod60', name: 'Chemical Suit - Disposable', category: 'Body Protection', supplier: 'ProGear Ltd', price: 28.99, cost: 22.00, surewerxSku: 'SWX-CS-001', description: 'Type 5/6 chemical protective suit', status: 'Active', visible: true },
      
      // Foot Protection (12 products)
      { id: 'prod61', name: 'Steel Toe Boots - 6 inch', category: 'Foot Protection', supplier: 'BootMasters', price: 89.99, cost: 68.00, surewerxSku: 'SWX-ST-001', customSku: 'BOOT-ST-6IN', description: '6 inch steel toe work boots', status: 'Active', visible: true },
      { id: 'prod62', name: 'Composite Toe Boots - 8 inch', category: 'Foot Protection', supplier: 'BootMasters', price: 99.99, cost: 76.00, surewerxSku: 'SWX-CT-001', customSku: 'BOOT-CT-8IN', description: '8 inch composite toe work boots', status: 'Active', visible: true },
      { id: 'prod63', name: 'Rubber Boots - Steel Toe', category: 'Foot Protection', supplier: 'SafetyFirst Inc', price: 64.99, cost: 49.50, surewerxSku: 'SWX-RB-001', description: 'Waterproof rubber boots with steel toe', status: 'Active', visible: true },
      { id: 'prod64', name: 'Safety Shoes - Athletic Style', category: 'Foot Protection', supplier: 'BootMasters', price: 79.99, cost: 61.00, surewerxSku: 'SWX-AS-001', description: 'Athletic style safety shoes with composite toe', status: 'Active', visible: true },
      { id: 'prod65', name: 'Winter Work Boots - Insulated', category: 'Foot Protection', supplier: 'BootMasters', price: 119.99, cost: 91.00, surewerxSku: 'SWX-WB-001', description: 'Insulated winter work boots with steel toe', status: 'Active', visible: true },
      { id: 'prod66', name: 'Metatarsal Guard Boots', category: 'Foot Protection', supplier: 'BootMasters', price: 109.99, cost: 84.00, surewerxSku: 'SWX-MG-002', description: 'Steel toe boots with metatarsal guard', status: 'Active', visible: true },
      { id: 'prod67', name: 'Electrical Hazard Boots', category: 'Foot Protection', supplier: 'ElectroSafe', price: 94.99, cost: 72.50, surewerxSku: 'SWX-EH-001', description: 'EH rated safety boots with composite toe', status: 'Active', visible: true },
      { id: 'prod68', name: 'Boot Covers - Disposable (100pk)', category: 'Foot Protection', supplier: 'SafetyFirst Inc', price: 29.99, cost: 22.50, surewerxSku: 'SWX-BC-002', description: 'Pack of 100 disposable boot covers', status: 'Active', visible: true },
      { id: 'prod69', name: 'Slip-Resistant Shoes', category: 'Foot Protection', supplier: 'BootMasters', price: 69.99, cost: 53.50, surewerxSku: 'SWX-SR-001', description: 'Slip-resistant work shoes with composite toe', status: 'Active', visible: true },
      { id: 'prod70', name: 'Wellington Boots - Steel Toe', category: 'Foot Protection', supplier: 'SafetyFirst Inc', price: 74.99, cost: 57.00, surewerxSku: 'SWX-WL-001', description: 'Wellington style steel toe rubber boots', status: 'Active', visible: true },
      { id: 'prod71', name:'Boot Insoles - Comfort', category: 'Foot Protection', supplier: 'BootMasters', price: 24.99, cost: 18.50, surewerxSku: 'SWX-BI-001', description: 'Comfort insoles for work boots', status: 'Active', visible: true },
      { id: 'prod72', name: 'Chemical Resistant Boots', category: 'Foot Protection', supplier: 'ProGear Ltd', price: 84.99, cost: 65.00, surewerxSku: 'SWX-CR-002', description: 'Chemical resistant PVC boots with steel toe', status: 'Active', visible: true },
      
      // Hearing Protection (10 products)
      { id: 'prod73', name: 'Ear Plugs - Foam (200 pairs)', category: 'Hearing Protection', supplier: 'SafetyFirst Inc', price: 19.99, cost: 14.50, surewerxSku: 'SWX-EP-001', customSku: 'EP-FOAM-200', description: 'Box of 200 pairs foam ear plugs (NRR 33)', status: 'Active', visible: true },
      { id: 'prod74', name: 'Ear Muffs - Standard', category: 'Hearing Protection', supplier: 'ProGear Ltd', price: 22.99, cost: 17.00, surewerxSku: 'SWX-EM-001', customSku: 'EM-STD-001', description: 'Standard ear muffs (NRR 25)', status: 'Active', visible: true },
      { id: 'prod75', name: 'Ear Muffs - Electronic', category: 'Hearing Protection', supplier: 'TechSound', price: 89.99, cost: 68.00, surewerxSku: 'SWX-EM-002', description: 'Electronic ear muffs with sound amplification', status: 'Active', visible: true },
      { id: 'prod76', name: 'Ear Plugs - Reusable with Cord', category: 'Hearing Protection', supplier: 'SafetyFirst Inc', price: 8.99, cost: 6.50, surewerxSku: 'SWX-EP-002', description: 'Reusable corded ear plugs (NRR 27)', status: 'Active', visible: true },
      { id: 'prod77', name: 'Ear Muffs - Hard Hat Mount', category: 'Hearing Protection', supplier: 'ProGear Ltd', price: 28.99, cost: 22.00, surewerxSku: 'SWX-EM-003', description: 'Ear muffs that mount to hard hats', status: 'Active', visible: true },
      { id: 'prod78', name: 'Ear Band - Banded Plugs', category: 'Hearing Protection', supplier: 'SafetyFirst Inc', price: 12.99, cost: 9.50, surewerxSku: 'SWX-EB-001', description: 'Banded ear plugs for easy on/off', status: 'Active', visible: true },
      { id: 'prod79', name: 'Ear Muffs - Bluetooth', category: 'Hearing Protection', supplier: 'TechSound', price: 129.99, cost: 98.00, surewerxSku: 'SWX-EM-004', description: 'Bluetooth ear muffs with AM/FM radio', status: 'Active', visible: true },
      { id: 'prod80', name: 'Ear Plugs - Metal Detectable (100 pairs)', category: 'Hearing Protection', supplier: 'SafetyFirst Inc', price: 34.99, cost: 26.50, surewerxSku: 'SWX-EP-003', description: 'Metal detectable ear plugs for food industry', status: 'Active', visible: true },
      { id: 'prod81', name: 'Ear Muffs - Folding Compact', category: 'Hearing Protection', supplier: 'ProGear Ltd', price: 24.99, cost: 18.50, surewerxSku: 'SWX-EM-005', description: 'Compact folding ear muffs (NRR 27)', status: 'Active', visible: true },
      { id: 'prod82', name: 'Custom Molded Ear Plugs', category: 'Hearing Protection', supplier: 'TechSound', price: 79.99, cost: 61.00, surewerxSku: 'SWX-EP-004', description: 'Custom molded reusable ear plugs', status: 'Active', visible: true },
      
      // Respiratory Protection (10 products)
      { id: 'prod83', name: 'Dust Mask - N95 (20pk)', category: 'Respiratory Protection', supplier: 'SafetyFirst Inc', price: 24.99, cost: 18.50, surewerxSku: 'SWX-DM-001', customSku: 'DM-N95-20PK', description: 'Pack of 20 N95 dust masks', status: 'Active', visible: true },
      { id: 'prod84', name: 'Half Mask Respirator - Reusable', category: 'Respiratory Protection', supplier: 'ProGear Ltd', price: 34.99, cost: 26.50, surewerxSku: 'SWX-HM-001', customSku: 'RESP-HALF-001', description: 'Reusable half mask respirator (mask only)', status: 'Active', visible: true },
      { id: 'prod85', name: 'Respirator Filters - P100 (2pk)', category: 'Respiratory Protection', supplier: 'ProGear Ltd', price: 19.99, cost: 14.50, surewerxSku: 'SWX-RF-001', description: 'Pair of P100 respirator filters', status: 'Active', visible: true },
      { id: 'prod86', name: 'Full Face Respirator', category: 'Respiratory Protection', supplier: 'ProGear Ltd', price: 189.99, cost: 145.00, surewerxSku: 'SWX-FF-001', description: 'Full face respirator with head harness', status: 'Active', visible: true },
      { id: 'prod87', name: 'Disposable Respirator - N95 Valve (10pk)', category: 'Respiratory Protection', supplier: 'SafetyFirst Inc', price: 29.99, cost: 22.50, surewerxSku: 'SWX-DR-001', description: 'Pack of 10 N95 respirators with valve', status: 'Active', visible: true },
      { id: 'prod88', name: 'Organic Vapor Cartridges (2pk)', category: 'Respiratory Protection', supplier: 'ProGear Ltd', price: 28.99, cost: 22.00, surewerxSku: 'SWX-OV-001', description: 'Pair of organic vapor cartridges', status: 'Active', visible: true },
      { id: 'prod89', name: 'PAPR System - Complete', category: 'Respiratory Protection', supplier: 'AirTech Pro', price: 899.99, cost: 685.00, surewerxSku: 'SWX-PAPR-001', description: 'Complete powered air purifying respirator system', status: 'Active', visible: true },
      { id: 'prod90', name: 'Dust Mask - P95 (50pk)', category: 'Respiratory Protection', supplier: 'SafetyFirst Inc', price: 59.99, cost: 45.50, surewerxSku: 'SWX-DM-002', description: 'Pack of 50 P95 dust masks', status: 'Active', visible: true },
      { id: 'prod91', name: 'Combination Cartridges - Multi-Gas', category: 'Respiratory Protection', supplier: 'ProGear Ltd', price: 42.99, cost: 32.50, surewerxSku: 'SWX-CC-001', description: 'Multi-gas combination cartridges (pair)', status: 'Active', visible: true },
      { id: 'prod92', name: 'Respirator Cleaning Wipes (100pk)', category: 'Respiratory Protection', supplier: 'SafetyFirst Inc', price: 14.99, cost: 11.00, surewerxSku: 'SWX-RW-001', description: 'Pack of 100 respirator cleaning wipes', status: 'Active', visible: true },
      
      // Fall Protection (8 products)
      { id: 'prod93', name: 'Safety Harness - Full Body', category: 'Fall Protection', supplier: 'HeightSafe', price: 149.99, cost: 114.00, surewerxSku: 'SWX-SH-001', description: 'Full body safety harness with D-ring', status: 'Active', visible: true },
      { id: 'prod94', name: 'Lanyard - 6ft Shock Absorbing', category: 'Fall Protection', supplier: 'HeightSafe', price: 89.99, cost: 68.00, surewerxSku: 'SWX-LA-001', description: '6 foot shock absorbing lanyard', status: 'Active', visible: true },
      { id: 'prod95', name: 'Retractable Lifeline - 30ft', category: 'Fall Protection', supplier: 'HeightSafe', price: 279.99, cost: 213.00, surewerxSku: 'SWX-RL-001', description: '30 foot self-retracting lifeline', status: 'Active', visible: true },
      { id: 'prod96', name: 'Anchor Point - Roof', category: 'Fall Protection', supplier: 'HeightSafe', price: 124.99, cost: 95.00, surewerxSku: 'SWX-AP-002', description: 'Permanent roof anchor point', status: 'Active', visible: true },
      { id: 'prod97', name: 'Rescue Kit - Confined Space', category: 'Fall Protection', supplier: 'HeightSafe', price: 499.99, cost: 380.00, surewerxSku: 'SWX-RK-001', description: 'Complete confined space rescue kit', status: 'Active', visible: true },
      { id: 'prod98', name: 'Safety Net - 10x10ft', category: 'Fall Protection', supplier: 'HeightSafe', price: 189.99, cost: 145.00, surewerxSku: 'SWX-SN-001', description: '10x10 foot safety catch net', status: 'Active', visible: true },
      { id: 'prod99', name: 'Harness Storage Bag', category: 'Fall Protection', supplier: 'HeightSafe', price: 34.99, cost: 26.50, surewerxSku: 'SWX-HS-001', description: 'Breathable storage bag for harnesses', status: 'Active', visible: true },
      { id: 'prod100', name: 'Tripod - Confined Space Entry', category: 'Fall Protection', supplier: 'HeightSafe', price: 899.99, cost: 685.00, surewerxSku: 'SWX-TP-001', description: 'Adjustable tripod for confined space entry', status: 'Active', visible: true }
    ];
    
    // Customers - initialize default customers
    var defaultCustomers = [
      {
        id: 'p1',
        name: 'Boeing',
        slug: 'boeing',
        industry: 'Technology',
        contactEmail: 'contact@boeing.com',
        contactPhone: '(555) 123-4567',
        logoUrl: 'images/Boeing_full_logo..png',
        status: 'active',
        distributorId: 'd1', // Fastenal
        employeeCount: 45,
        activeVouchers: 2, // Will be recalculated from vouchers array
        monthlySpend: 12450.00,
        totalBudget: 50000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: false,
          requireDateOfBirth: false,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp1',
            name: 'John Smith',
            email: 'john.smith@boeing.com',
            employeeId: 'EMP-001',
            username: 'jsmith',
            startDate: '2023-01-15',
            departmentId: 'g1',
            locationId: 'LOC-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 250.00,
            voucherBalances: [
              { voucherId: 'v1', remainingAmount: 150.00 },
              { voucherId: 'v2', remainingAmount: 100.00 }
            ]
          },
          {
            id: 'emp2',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@boeing.com',
            employeeId: 'EMP-002',
            username: 'sjohnson',
            startDate: '2023-03-20',
            departmentId: 'g1',
            locationId: 'LOC-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 300.00,
            voucherBalances: [
              { voucherId: 'v1', remainingAmount: 200.00 },
              { voucherId: 'v2', remainingAmount: 100.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g1',
            name: 'Safety Team',
            department: 'Operations',
            location: 'Main Office',
            locationId: 'LOC-001',
            addressLine1: '1000 Boeing Way',
            addressCity: 'Seattle',
            addressState: 'WA',
            addressZip: '98108',
            locationAddress: '1000 Boeing Way, Seattle, WA 98108',
            employeeCount: 2,
            productIds: ['prod1', 'prod2', 'prod3'],
            categoryIds: ['Eye Protection', 'Head Protection']
          },
          {
            id: 'g2',
            name: 'Warehouse Staff',
            department: 'Logistics',
            location: 'Warehouse',
            locationId: 'WH-001',
            addressLine1: '2500 Distribution Blvd',
            addressCity: 'Renton',
            addressState: 'WA',
            addressZip: '98057',
            locationAddress: '2500 Distribution Blvd, Renton, WA 98057',
            employeeCount: 0,
            productIds: ['prod1', 'prod2', 'prod3', 'prod4'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Body Protection']
          },
          {
            id: 'g10',
            name: 'Engineering Team',
            department: 'Engineering',
            location: 'Main Office',
            locationId: 'LOC-001',
            addressLine1: '1000 Boeing Way',
            addressCity: 'Seattle',
            addressState: 'WA',
            addressZip: '98108',
            locationAddress: '1000 Boeing Way, Seattle, WA 98108',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection']
          },
          {
            id: 'g11',
            name: 'Manufacturing Assembly',
            department: 'Manufacturing',
            location: 'Assembly Plant',
            locationId: 'ASM-001',
            addressLine1: '3000 Production Blvd',
            addressCity: 'Everett',
            addressState: 'WA',
            addressZip: '98204',
            locationAddress: '3000 Production Blvd, Everett, WA 98204',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g12',
            name: 'Quality Control',
            department: 'Quality Assurance',
            location: 'Warehouse',
            locationId: 'WH-001',
            addressLine1: '2500 Distribution Blvd',
            addressCity: 'Renton',
            addressState: 'WA',
            addressZip: '98057',
            locationAddress: '2500 Distribution Blvd, Renton, WA 98057',
            employeeCount: 0,
            productIds: ['prod1', 'prod3', 'prod30', 'prod36'],
            categoryIds: ['Eye Protection', 'Hand Protection']
          },
          {
            id: 'g13',
            name: 'Maintenance Crew',
            department: 'Maintenance',
            location: 'Main Office',
            locationId: 'LOC-001',
            addressLine1: '1000 Boeing Way',
            addressCity: 'Seattle',
            addressState: 'WA',
            addressZip: '98108',
            locationAddress: '1000 Boeing Way, Seattle, WA 98108',
            employeeCount: 0,
            productIds: ['prod5', 'prod16', 'prod28', 'prod32', 'prod52', 'prod61'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection']
          },
          {
            id: 'g14',
            name: 'Testing Laboratory',
            department: 'Testing',
            location: 'Assembly Plant',
            locationId: 'ASM-001',
            addressLine1: '3000 Production Blvd',
            addressCity: 'Everett',
            addressState: 'WA',
            addressZip: '98204',
            locationAddress: '3000 Production Blvd, Everett, WA 98204',
            employeeCount: 0,
            productIds: ['prod1', 'prod3', 'prod30', 'prod83', 'prod84'],
            categoryIds: ['Eye Protection', 'Hand Protection', 'Respiratory Protection']
          },
          {
            id: 'g15',
            name: 'Tooling Department',
            department: 'Tooling',
            location: 'Warehouse',
            locationId: 'WH-001',
            addressLine1: '2500 Distribution Blvd',
            addressCity: 'Renton',
            addressState: 'WA',
            addressZip: '98057',
            locationAddress: '2500 Distribution Blvd, Renton, WA 98057',
            employeeCount: 0,
            productIds: ['prod1', 'prod5', 'prod16', 'prod28', 'prod32', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g16',
            name: 'Research & Development',
            department: 'R&D',
            location: 'Main Office',
            locationId: 'LOC-001',
            addressLine1: '1000 Boeing Way',
            addressCity: 'Seattle',
            addressState: 'WA',
            addressZip: '98108',
            locationAddress: '1000 Boeing Way, Seattle, WA 98108',
            employeeCount: 0,
            productIds: ['prod1', 'prod3', 'prod12', 'prod30', 'prod83'],
            categoryIds: ['Eye Protection', 'Hand Protection', 'Respiratory Protection']
          },
          {
            id: 'g17',
            name: 'Facilities Management',
            department: 'Facilities',
            location: 'Main Office',
            locationId: 'LOC-001',
            addressLine1: '1000 Boeing Way',
            addressCity: 'Seattle',
            addressState: 'WA',
            addressZip: '98108',
            locationAddress: '1000 Boeing Way, Seattle, WA 98108',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection']
          },
          {
            id: 'g18',
            name: 'IT Support',
            department: 'Information Technology',
            location: 'IT Building',
            locationId: 'IT-001',
            addressLine1: '800 Technology Way',
            addressCity: 'Seattle',
            addressState: 'WA',
            addressZip: '98124',
            locationAddress: '800 Technology Way, Seattle, WA 98124',
            employeeCount: 0,
            productIds: ['prod1', 'prod13'],
            categoryIds: ['Eye Protection']
          },
          {
            id: 'g19',
            name: 'Security Team',
            department: 'Security',
            location: 'Security Office',
            locationId: 'SEC-001',
            addressLine1: '1000 Boeing Way',
            addressCity: 'Seattle',
            addressState: 'WA',
            addressZip: '98108',
            locationAddress: '1000 Boeing Way, Seattle, WA 98108',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod46'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Body Protection']
          },
          {
            id: 'g20',
            name: 'Paint Shop',
            department: 'Manufacturing',
            location: 'Paint Facility',
            locationId: 'PAINT-001',
            addressLine1: '3500 Paint Blvd',
            addressCity: 'Everett',
            addressState: 'WA',
            addressZip: '98204',
            locationAddress: '3500 Paint Blvd, Everett, WA 98204',
            employeeCount: 0,
            productIds: ['prod3', 'prod16', 'prod28', 'prod34', 'prod46', 'prod61', 'prod73', 'prod83', 'prod84'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection', 'Respiratory Protection']
          },
          {
            id: 'g21',
            name: 'Composite Materials',
            department: 'Manufacturing',
            location: 'Composite Center',
            locationId: 'COMP-001',
            addressLine1: '2800 Composite Way',
            addressCity: 'Everett',
            addressState: 'WA',
            addressZip: '98204',
            locationAddress: '2800 Composite Way, Everett, WA 98204',
            employeeCount: 0,
            productIds: ['prod1', 'prod3', 'prod16', 'prod28', 'prod34', 'prod46', 'prod61', 'prod73', 'prod83'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection', 'Respiratory Protection']
          },
          {
            id: 'g22',
            name: 'Wiring & Electrical',
            department: 'Manufacturing',
            location: 'Electrical Shop',
            locationId: 'ELEC-001',
            addressLine1: '1900 Electrical Ave',
            addressCity: 'Renton',
            addressState: 'WA',
            addressZip: '98057',
            locationAddress: '1900 Electrical Ave, Renton, WA 98057',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod22', 'prod28', 'prod41', 'prod61', 'prod67'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Foot Protection']
          },
          {
            id: 'g23',
            name: 'Charleston Assembly',
            department: 'Manufacturing',
            location: 'Charleston Plant',
            locationId: 'CHS-001',
            addressLine1: '5000 Aviation Way',
            addressCity: 'North Charleston',
            addressState: 'SC',
            addressZip: '29418',
            locationAddress: '5000 Aviation Way, North Charleston, SC 29418',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g24',
            name: 'St. Louis Defense',
            department: 'Defense',
            location: 'St. Louis Facility',
            locationId: 'STL-001',
            addressLine1: '6000 Defense Blvd',
            addressCity: 'St. Louis',
            addressState: 'MO',
            addressZip: '63134',
            locationAddress: '6000 Defense Blvd, St. Louis, MO 63134',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73', 'prod93'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection', 'Fall Protection']
          },
          {
            id: 'g25',
            name: 'Long Beach Operations',
            department: 'Operations',
            location: 'Long Beach Facility',
            locationId: 'LGB-001',
            addressLine1: '4000 Pacific Coast Hwy',
            addressCity: 'Long Beach',
            addressState: 'CA',
            addressZip: '90807',
            locationAddress: '4000 Pacific Coast Hwy, Long Beach, CA 90807',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g26',
            name: 'Philadelphia Manufacturing',
            department: 'Manufacturing',
            location: 'Philadelphia Plant',
            locationId: 'PHL-001',
            addressLine1: '7000 Industrial Blvd',
            addressCity: 'Philadelphia',
            addressState: 'PA',
            addressZip: '19153',
            locationAddress: '7000 Industrial Blvd, Philadelphia, PA 19153',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g27',
            name: 'Flight Test',
            department: 'Testing',
            location: 'Flight Test Center',
            locationId: 'FLT-001',
            addressLine1: '4500 Flight Test Way',
            addressCity: 'Everett',
            addressState: 'WA',
            addressZip: '98204',
            locationAddress: '4500 Flight Test Way, Everett, WA 98204',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73', 'prod74'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g28',
            name: 'Hydraulics Shop',
            department: 'Manufacturing',
            location: 'Hydraulics Facility',
            locationId: 'HYD-001',
            addressLine1: '1600 Hydraulics Dr',
            addressCity: 'Renton',
            addressState: 'WA',
            addressZip: '98057',
            locationAddress: '1600 Hydraulics Dr, Renton, WA 98057',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod34', 'prod46', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g29',
            name: 'Sheet Metal Fabrication',
            department: 'Manufacturing',
            location: 'Fabrication Shop',
            locationId: 'FAB-001',
            addressLine1: '2400 Fabrication Way',
            addressCity: 'Everett',
            addressState: 'WA',
            addressZip: '98204',
            locationAddress: '2400 Fabrication Way, Everett, WA 98204',
            employeeCount: 0,
            productIds: ['prod1', 'prod5', 'prod16', 'prod28', 'prod32', 'prod46', 'prod52', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g30',
            name: 'Machining Center',
            department: 'Manufacturing',
            location: 'Machine Shop',
            locationId: 'MACH-001',
            addressLine1: '1100 Machine Way',
            addressCity: 'Renton',
            addressState: 'WA',
            addressZip: '98057',
            locationAddress: '1100 Machine Way, Renton, WA 98057',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod37', 'prod46', 'prod61', 'prod73', 'prod74'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g31',
            name: 'Environmental Health',
            department: 'Safety',
            location: 'Safety Office',
            locationId: 'EHS-001',
            addressLine1: '1000 Boeing Way',
            addressCity: 'Seattle',
            addressState: 'WA',
            addressZip: '98108',
            locationAddress: '1000 Boeing Way, Seattle, WA 98108',
            employeeCount: 0,
            productIds: ['prod1', 'prod3', 'prod30', 'prod36', 'prod83', 'prod84'],
            categoryIds: ['Eye Protection', 'Hand Protection', 'Respiratory Protection']
          },
          {
            id: 'g32',
            name: 'Material Handling',
            department: 'Logistics',
            location: 'Material Warehouse',
            locationId: 'MAT-001',
            addressLine1: '2500 Distribution Blvd',
            addressCity: 'Renton',
            addressState: 'WA',
            addressZip: '98057',
            locationAddress: '2500 Distribution Blvd, Renton, WA 98057',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g33',
            name: 'Calibration Lab',
            department: 'Quality Assurance',
            location: 'Calibration Facility',
            locationId: 'CAL-001',
            addressLine1: '1500 Quality Dr',
            addressCity: 'Renton',
            addressState: 'WA',
            addressZip: '98057',
            locationAddress: '1500 Quality Dr, Renton, WA 98057',
            employeeCount: 0,
            productIds: ['prod1', 'prod3', 'prod30'],
            categoryIds: ['Eye Protection', 'Hand Protection']
          },
          {
            id: 'g34',
            name: 'Aerospace Systems',
            department: 'Engineering',
            location: 'Systems Engineering',
            locationId: 'SYS-001',
            addressLine1: '1200 Engineering Way',
            addressCity: 'Seattle',
            addressState: 'WA',
            addressZip: '98124',
            locationAddress: '1200 Engineering Way, Seattle, WA 98124',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection']
          },
          {
            id: 'g35',
            name: 'Plastics & Composites',
            department: 'Manufacturing',
            location: 'Plastics Facility',
            locationId: 'PLAST-001',
            addressLine1: '2800 Composite Way',
            addressCity: 'Everett',
            addressState: 'WA',
            addressZip: '98204',
            locationAddress: '2800 Composite Way, Everett, WA 98204',
            employeeCount: 0,
            productIds: ['prod1', 'prod3', 'prod16', 'prod28', 'prod34', 'prod46', 'prod61', 'prod73', 'prod83'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection', 'Respiratory Protection']
          },
          {
            id: 'g36',
            name: 'Avionics Installation',
            department: 'Manufacturing',
            location: 'Avionics Shop',
            locationId: 'AVI-001',
            addressLine1: '2000 Avionics Blvd',
            addressCity: 'Renton',
            addressState: 'WA',
            addressZip: '98057',
            locationAddress: '2000 Avionics Blvd, Renton, WA 98057',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod22', 'prod28', 'prod41', 'prod61'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Foot Protection']
          },
          {
            id: 'g37',
            name: 'Interior Installation',
            department: 'Manufacturing',
            location: 'Interior Shop',
            locationId: 'INT-001',
            addressLine1: '3200 Interior Way',
            addressCity: 'Everett',
            addressState: 'WA',
            addressZip: '98204',
            locationAddress: '3200 Interior Way, Everett, WA 98204',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g38',
            name: 'Ground Support',
            department: 'Operations',
            location: 'Ground Operations',
            locationId: 'GND-001',
            addressLine1: '5500 Ground Support Way',
            addressCity: 'Everett',
            addressState: 'WA',
            addressZip: '98204',
            locationAddress: '5500 Ground Support Way, Everett, WA 98204',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod48', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g39',
            name: 'Training Center',
            department: 'Training',
            location: 'Training Facility',
            locationId: 'TRN-001',
            addressLine1: '700 Training Center Dr',
            addressCity: 'Seattle',
            addressState: 'WA',
            addressZip: '98124',
            locationAddress: '700 Training Center Dr, Seattle, WA 98124',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection']
          }
        ],
        vouchers: [
          {
            id: 'v1',
            name: 'Monthly Safety Allowance',
            description: 'Standard monthly safety equipment allowance',
            defaultAmount: 50.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            // Qualified products: includes safety glasses, hard hats, steel toe boots, composite toe boots, work gloves, safety vests, nitrile gloves, and dust masks
            productIds: ['prod1', 'prod2', 'prod16', 'prod61', 'prod62', 'prod28', 'prod46', 'prod47', 'prod30', 'prod83'],
            departmentId: 'g1',
            locationId: 'LOC-001'
          },
          {
            id: 'v2',
            name: 'Quarterly PPE Budget',
            description: 'Quarterly personal protective equipment budget',
            defaultAmount: 75.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: false,
            rolloverEnabled: true,
            // Qualified products: non-overlapping subset of same department products
            productIds: ['prod3', 'prod30', 'prod36', 'prod46', 'prod47', 'prod74', 'prod83', 'prod84'],
            departmentId: 'g1',
            locationId: 'LOC-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p2',
        name: 'Manufacturing Corp',
        slug: 'manufacturing-corp',
        industry: 'Manufacturing',
        contactEmail: 'info@manufacturing.com',
        contactPhone: '(555) 234-5678',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiMxNmEzNGEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk08L3RleHQ+PC9zdmc+',
        status: 'active',
        distributorId: 'd1', // Fastenal
        employeeCount: 78,
        activeVouchers: 5,
        monthlySpend: 23800.00,
        totalBudget: 100000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: true,
          requireDateOfBirth: true,
          requireStartDate: true
        },
        employees: [],
        groups: [
          {
            id: 'g3',
            name: 'Production Floor',
            department: 'Production',
            location: 'Manufacturing Plant',
            locationId: 'MFG-001',
            addressLine1: '1800 Industrial Ave',
            addressCity: 'Cleveland',
            addressState: 'OH',
            addressZip: '44101',
            locationAddress: '1800 Industrial Ave, Cleveland, OH 44101',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g3b',
            name: 'Maintenance',
            department: 'Maintenance',
            location: 'Maintenance Shop',
            locationId: 'MAINT-MFG-001',
            addressLine1: '1800 Industrial Ave',
            addressCity: 'Cleveland',
            addressState: 'OH',
            addressZip: '44101',
            locationAddress: '1800 Industrial Ave, Cleveland, OH 44101',
            employeeCount: 0,
            productIds: ['prod5', 'prod16', 'prod28', 'prod32', 'prod52', 'prod61'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection']
          }
        ],
        vouchers: [
          {
            id: 'v3',
            name: 'Safety Equipment Fund',
            description: 'Monthly safety equipment fund for production staff',
            defaultAmount: 60.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod1', 'prod3', 'prod16', 'prod28', 'prod30', 'prod31', 'prod34', 'prod36', 'prod46', 'prod61', 'prod62', 'prod73'],
            departmentId: 'g3',
            locationId: 'MFG-001'
          },
          {
            id: 'v4',
            name: 'Maintenance PPE Budget',
            description: 'Quarterly PPE budget for maintenance team',
            defaultAmount: 80.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: false,
            rolloverEnabled: true,
            productIds: ['prod3', 'prod4', 'prod16', 'prod28', 'prod32', 'prod52', 'prod61', 'prod62'],
            departmentId: 'g3b',
            locationId: 'MAINT-MFG-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p9',
        name: 'Tech Manufacturing Solutions',
        slug: 'tech-manufacturing-solutions',
        industry: 'Technology',
        contactEmail: 'info@techmfg.com',
        contactPhone: '(555) 111-2222',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM0Mjg1RjQiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlRNPC90ZXh0Pjwvc3ZnPg==',
        status: 'active',
        distributorId: 'd1', // Fastenal
        employeeCount: 85,
        activeVouchers: 4,
        monthlySpend: 18900.00,
        totalBudget: 90000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: true,
          requireDateOfBirth: false,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp15',
            name: 'Robert Kim',
            email: 'robert.kim@techmfg.com',
            employeeId: 'TM-001',
            username: 'rkim',
            startDate: '2022-05-10',
            departmentId: 'g40',
            locationId: 'PLANT-TM-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 180.00,
            voucherBalances: [
              { voucherId: 'v12', remainingAmount: 180.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g40',
            name: 'Production Team',
            department: 'Manufacturing',
            location: 'Main Plant',
            locationId: 'PLANT-TM-001',
            addressLine1: '2500 Tech Drive',
            addressCity: 'Austin',
            addressState: 'TX',
            addressZip: '78701',
            locationAddress: '2500 Tech Drive, Austin, TX 78701',
            employeeCount: 1,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          }
        ],
        vouchers: [
          {
            id: 'v12',
            name: 'Tech Manufacturing Safety Fund',
            description: 'Monthly safety equipment fund for production team',
            defaultAmount: 180.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73'],
            departmentId: 'g40',
            locationId: 'PLANT-TM-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p10',
        name: 'Industrial Safety Systems',
        slug: 'industrial-safety-systems',
        industry: 'Manufacturing',
        contactEmail: 'contact@industrialsafety.com',
        contactPhone: '(555) 222-3333',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNGRjY2MDAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPklTPC90ZXh0Pjwvc3ZnPg==',
        status: 'active',
        distributorId: 'd1', // Fastenal
        employeeCount: 120,
        activeVouchers: 6,
        monthlySpend: 24500.00,
        totalBudget: 110000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: false,
          requireDateOfBirth: true,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp16',
            name: 'Patricia Martinez',
            email: 'patricia.martinez@industrialsafety.com',
            employeeId: 'ISS-001',
            dateOfBirth: '1987-08-20',
            startDate: '2021-03-15',
            departmentId: 'g41',
            locationId: 'SAFETY-ISS-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 200.00,
            voucherBalances: [
              { voucherId: 'v13', remainingAmount: 200.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g41',
            name: 'Safety Operations',
            department: 'Safety',
            location: 'Safety Office',
            locationId: 'SAFETY-ISS-001',
            addressLine1: '1800 Safety Blvd',
            addressCity: 'Houston',
            addressState: 'TX',
            addressZip: '77001',
            locationAddress: '1800 Safety Blvd, Houston, TX 77001',
            employeeCount: 1,
            productIds: ['prod1', 'prod3', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73', 'prod83'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection', 'Respiratory Protection']
          }
        ],
        vouchers: [
          {
            id: 'v13',
            name: 'Industrial Safety Equipment Allowance',
            description: 'Monthly safety equipment allowance for operations team',
            defaultAmount: 200.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: true,
            productIds: ['prod1', 'prod3', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73', 'prod83'],
            departmentId: 'g41',
            locationId: 'SAFETY-ISS-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p11',
        name: 'Aerospace Components Inc',
        slug: 'aerospace-components-inc',
        industry: 'Aerospace',
        contactEmail: 'info@aerospacecomp.com',
        contactPhone: '(555) 333-4444',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM5QzI3QjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFDPC90ZXh0Pjwvc3ZnPg==',
        status: 'active',
        distributorId: 'd1', // Fastenal
        employeeCount: 95,
        activeVouchers: 5,
        monthlySpend: 21200.00,
        totalBudget: 95000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: true,
          requireDateOfBirth: false,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp17',
            name: 'Michael Chen',
            email: 'michael.chen@aerospacecomp.com',
            employeeId: 'AC-001',
            username: 'mchen',
            startDate: '2020-11-05',
            departmentId: 'g42',
            locationId: 'ASSEMBLY-AC-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 220.00,
            voucherBalances: [
              { voucherId: 'v14', remainingAmount: 220.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g42',
            name: 'Assembly Department',
            department: 'Manufacturing',
            location: 'Assembly Floor',
            locationId: 'ASSEMBLY-AC-001',
            addressLine1: '3200 Aerospace Way',
            addressCity: 'Wichita',
            addressState: 'KS',
            addressZip: '67201',
            locationAddress: '3200 Aerospace Way, Wichita, KS 67201',
            employeeCount: 1,
            productIds: ['prod1', 'prod5', 'prod16', 'prod28', 'prod32', 'prod46', 'prod61'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection']
          }
        ],
        vouchers: [
          {
            id: 'v14',
            name: 'Aerospace Assembly Safety Budget',
            description: 'Monthly safety budget for assembly operations',
            defaultAmount: 220.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod1', 'prod5', 'prod16', 'prod28', 'prod32', 'prod46', 'prod61'],
            departmentId: 'g42',
            locationId: 'ASSEMBLY-AC-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p12',
        name: 'Precision Tooling Group',
        slug: 'precision-tooling-group',
        industry: 'Manufacturing',
        contactEmail: 'hello@precisiontooling.com',
        contactPhone: '(555) 444-5555',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM2MzQ5OUIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlBUPC90ZXh0Pjwvc3ZnPg==',
        status: 'active',
        distributorId: 'd1', // Fastenal
        employeeCount: 65,
        activeVouchers: 3,
        monthlySpend: 15200.00,
        totalBudget: 70000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: false,
          requireDateOfBirth: false,
          requireStartDate: true
        },
        employees: [],
        groups: [
          {
            id: 'g43',
            name: 'Tool Shop',
            department: 'Manufacturing',
            location: 'Tool Shop',
            locationId: 'TOOL-PTG-001',
            addressLine1: '1500 Precision Ave',
            addressCity: 'Milwaukee',
            addressState: 'WI',
            addressZip: '53201',
            locationAddress: '1500 Precision Ave, Milwaukee, WI 53201',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod31', 'prod46', 'prod61', 'prod73'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection']
          }
        ],
        vouchers: [
          {
            id: 'v15',
            name: 'Tool Shop Safety Equipment',
            description: 'Quarterly safety equipment for tool shop employees',
            defaultAmount: 250.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: false,
            rolloverEnabled: true,
            productIds: ['prod1', 'prod16', 'prod28', 'prod31', 'prod46', 'prod61', 'prod73'],
            departmentId: 'g43',
            locationId: 'TOOL-PTG-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p13',
        name: 'Advanced Materials Corp',
        slug: 'advanced-materials-corp',
        industry: 'Manufacturing',
        contactEmail: 'contact@advancedmaterials.com',
        contactPhone: '(555) 555-6666',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNFRjQ0NDQiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFNPC90ZXh0Pjwvc3ZnPg==',
        status: 'active',
        distributorId: 'd1', // Fastenal
        employeeCount: 110,
        activeVouchers: 5,
        monthlySpend: 22800.00,
        totalBudget: 105000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: true,
          requireDateOfBirth: true,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp18',
            name: 'Jennifer Lee',
            email: 'jennifer.lee@advancedmaterials.com',
            employeeId: 'AM-001',
            username: 'jlee',
            dateOfBirth: '1991-04-12',
            startDate: '2022-07-20',
            departmentId: 'g44',
            locationId: 'PROC-AM-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 190.00,
            voucherBalances: [
              { voucherId: 'v16', remainingAmount: 190.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g44',
            name: 'Materials Processing',
            department: 'Production',
            location: 'Processing Plant',
            locationId: 'PROC-AM-001',
            addressLine1: '4200 Materials Blvd',
            addressCity: 'Pittsburgh',
            addressState: 'PA',
            addressZip: '15201',
            locationAddress: '4200 Materials Blvd, Pittsburgh, PA 15201',
            employeeCount: 1,
            productIds: ['prod1', 'prod3', 'prod16', 'prod28', 'prod34', 'prod46', 'prod61', 'prod73', 'prod83', 'prod84'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection', 'Respiratory Protection']
          }
        ],
        vouchers: [
          {
            id: 'v16',
            name: 'Materials Processing PPE Fund',
            description: 'Monthly PPE fund for materials processing team',
            defaultAmount: 190.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod1', 'prod3', 'prod16', 'prod28', 'prod34', 'prod46', 'prod61', 'prod73', 'prod83', 'prod84'],
            departmentId: 'g44',
            locationId: 'PROC-AM-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p14',
        name: 'Quality Control Industries',
        slug: 'quality-control-industries',
        industry: 'Manufacturing',
        contactEmail: 'info@qualitycontrol.com',
        contactPhone: '(555) 666-7777',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM2MzY2RjEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlFDPC90ZXh0Pjwvc3ZnPg==',
        status: 'active',
        distributorId: 'd1', // Fastenal
        employeeCount: 75,
        activeVouchers: 4,
        monthlySpend: 16800.00,
        totalBudget: 80000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: false,
          requireDateOfBirth: false,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp19',
            name: 'David Rodriguez',
            email: 'david.rodriguez@qualitycontrol.com',
            employeeId: 'QC-001',
            startDate: '2021-09-10',
            departmentId: 'g45',
            locationId: 'QA-QCI-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 175.00,
            voucherBalances: [
              { voucherId: 'v17', remainingAmount: 175.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g45',
            name: 'Quality Assurance Lab',
            department: 'Quality Control',
            location: 'QA Laboratory',
            locationId: 'QA-QCI-001',
            addressLine1: '2800 Quality Drive',
            addressCity: 'Minneapolis',
            addressState: 'MN',
            addressZip: '55401',
            locationAddress: '2800 Quality Drive, Minneapolis, MN 55401',
            employeeCount: 1,
            productIds: ['prod1', 'prod3', 'prod30', 'prod36', 'prod83'],
            categoryIds: ['Eye Protection', 'Hand Protection', 'Respiratory Protection']
          }
        ],
        vouchers: [
          {
            id: 'v17',
            name: 'QA Lab Safety Equipment',
            description: 'Monthly safety equipment for quality assurance lab',
            defaultAmount: 175.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod1', 'prod3', 'prod30', 'prod36', 'prod83'],
            departmentId: 'g45',
            locationId: 'QA-QCI-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p15',
        name: 'Heavy Equipment Manufacturing',
        slug: 'heavy-equipment-manufacturing',
        industry: 'Manufacturing',
        contactEmail: 'contact@heavyeq.com',
        contactPhone: '(555) 777-8888',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM3OTU1NDgiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkhFPC90ZXh0Pjwvc3ZnPg==',
        status: 'active',
        distributorId: 'd1', // Fastenal
        employeeCount: 140,
        activeVouchers: 7,
        monthlySpend: 31200.00,
        totalBudget: 130000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: true,
          requireDateOfBirth: false,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp20',
            name: 'Amanda Thompson',
            email: 'amanda.thompson@heavyeq.com',
            employeeId: 'HE-001',
            username: 'athompson',
            startDate: '2020-02-18',
            departmentId: 'g46',
            locationId: 'ASSEMBLY-HE-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 240.00,
            voucherBalances: [
              { voucherId: 'v18', remainingAmount: 240.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g46',
            name: 'Assembly Line',
            department: 'Manufacturing',
            location: 'Main Assembly',
            locationId: 'ASSEMBLY-HE-001',
            addressLine1: '5500 Heavy Equipment Way',
            addressCity: 'Peoria',
            addressState: 'IL',
            addressZip: '61601',
            locationAddress: '5500 Heavy Equipment Way, Peoria, IL 61601',
            employeeCount: 1,
            productIds: ['prod1', 'prod5', 'prod16', 'prod28', 'prod32', 'prod46', 'prod61', 'prod73', 'prod93'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection', 'Fall Protection']
          }
        ],
        vouchers: [
          {
            id: 'v18',
            name: 'Heavy Equipment Assembly Safety',
            description: 'Monthly safety equipment for assembly line workers',
            defaultAmount: 240.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: true,
            productIds: ['prod1', 'prod5', 'prod16', 'prod28', 'prod32', 'prod46', 'prod61', 'prod73', 'prod93'],
            departmentId: 'g46',
            locationId: 'ASSEMBLY-HE-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p3',
        name: 'Construction Services',
        slug: 'construction-services',
        industry: 'Construction',
        contactEmail: 'hello@construction.com',
        contactPhone: '(555) 345-6789',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNmNTllMGIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkM8L3RleHQ+PC9zdmc+',
        status: 'active',
        distributorId: 'd2', // Grainger
        employeeCount: 62,
        activeVouchers: 4,
        monthlySpend: 18900.00,
        totalBudget: 75000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: false,
          requireUsername: true,
          requireDateOfBirth: false,
          requireStartDate: true
        },
        employees: [],
        groups: [
          {
            id: 'g4',
            name: 'Site Workers',
            department: 'Field Operations',
            location: 'Construction Site',
            locationId: 'SITE-001',
            addressLine1: '1200 Building Way',
            addressCity: 'Denver',
            addressState: 'CO',
            addressZip: '80201',
            locationAddress: '1200 Building Way, Denver, CO 80201',
            employeeCount: 0,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61', 'prod73', 'prod93'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection', 'Hearing Protection', 'Fall Protection']
          }
        ],
        vouchers: [
          {
            id: 'v5',
            name: 'PPE Allowance',
            description: 'Monthly PPE allowance for site workers',
            defaultAmount: 40.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod1', 'prod2', 'prod16', 'prod19', 'prod20', 'prod28', 'prod29', 'prod46', 'prod47', 'prod48', 'prod53', 'prod61', 'prod62', 'prod65', 'prod73', 'prod74', 'prod93'],
            departmentId: 'g4',
            locationId: 'SITE-001'
          },
          {
            id: 'v6',
            name: 'Construction Safety Equipment',
            description: 'Quarterly safety equipment budget',
            defaultAmount: 100.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: false,
            rolloverEnabled: true,
            productIds: ['prod16', 'prod19', 'prod20', 'prod29', 'prod46', 'prod47', 'prod48', 'prod61', 'prod62', 'prod65', 'prod93'],
            departmentId: 'g4',
            locationId: 'SITE-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p4',
        name: 'Healthcare Systems Ltd',
        slug: 'healthcare-systems-ltd',
        industry: 'Healthcare',
        contactEmail: 'contact@healthcare.com',
        contactPhone: '(555) 456-7890',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNlNzM0ZjMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkg8L3RleHQ+PC9zdmc+',
        status: 'active',
        distributorId: 'd2', // Grainger
        employeeCount: 120,
        activeVouchers: 6,
        monthlySpend: 15200.00,
        totalBudget: 80000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: true,
          requireDateOfBirth: true,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp3',
            name: 'Dr. Emily Rodriguez',
            email: 'emily.rodriguez@healthcare.com',
            employeeId: 'HC-001',
            username: 'erodriguez',
            dateOfBirth: '1985-03-15',
            startDate: '2022-06-01',
            departmentId: 'g5',
            locationId: 'HOSP-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 200.00,
            voucherBalances: [
              { voucherId: 'v3', remainingAmount: 200.00 }
            ]
          },
          {
            id: 'emp4',
            name: 'Michael Chen',
            email: 'michael.chen@healthcare.com',
            employeeId: 'HC-002',
            username: 'mchen',
            dateOfBirth: '1990-07-22',
            startDate: '2023-02-10',
            departmentId: 'g5',
            locationId: 'HOSP-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 150.00,
            voucherBalances: [
              { voucherId: 'v3', remainingAmount: 150.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g5',
            name: 'Clinical Staff',
            department: 'Clinical',
            location: 'Main Hospital',
            locationId: 'HOSP-001',
            addressLine1: '500 Medical Center Dr',
            addressCity: 'Chicago',
            addressState: 'IL',
            addressZip: '60611',
            locationAddress: '500 Medical Center Dr, Chicago, IL 60611',
            employeeCount: 2,
            productIds: ['prod30', 'prod36', 'prod83', 'prod84'],
            categoryIds: ['Hand Protection', 'Respiratory Protection']
          },
          {
            id: 'g5b',
            name: 'Administrative',
            department: 'Administration',
            location: 'Main Hospital',
            locationId: 'HOSP-001',
            addressLine1: '500 Medical Center Dr',
            addressCity: 'Chicago',
            addressState: 'IL',
            addressZip: '60611',
            locationAddress: '500 Medical Center Dr, Chicago, IL 60611',
            employeeCount: 0,
            productIds: [],
            categoryIds: []
          }
        ],
        vouchers: [
          {
            id: 'v3',
            name: 'Healthcare PPE Allowance',
            description: 'Monthly PPE allowance for clinical staff',
            defaultAmount: 200.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod30', 'prod36', 'prod83', 'prod84'],
            departmentId: 'g5',
            locationId: 'HOSP-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p5',
        name: 'Energy Solutions Group',
        slug: 'energy-solutions-group',
        industry: 'Energy',
        contactEmail: 'info@energy.com',
        contactPhone: '(555) 567-8901',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNmZmMxMDciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkU8L3RleHQ+PC9zdmc+',
        status: 'active',
        distributorId: 'd3', // MSC Industrial Supply
        employeeCount: 95,
        activeVouchers: 4,
        monthlySpend: 22100.00,
        totalBudget: 120000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: false,
          requireDateOfBirth: false,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp5',
            name: 'James Wilson',
            email: 'james.wilson@energy.com',
            employeeId: 'EN-001',
            startDate: '2021-04-12',
            departmentId: 'g6',
            locationId: 'FLD-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 300.00,
            voucherBalances: [
              { voucherId: 'v4', remainingAmount: 300.00 }
            ]
          },
          {
            id: 'emp6',
            name: 'Patricia Martinez',
            email: 'patricia.martinez@energy.com',
            employeeId: 'EN-002',
            startDate: '2022-09-05',
            departmentId: 'g6b',
            locationId: 'MAINT-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 250.00,
            voucherBalances: [
              { voucherId: 'v5', remainingAmount: 250.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g6',
            name: 'Field Operations',
            department: 'Operations',
            location: 'Field Site A',
            locationId: 'FLD-001',
            addressLine1: '1500 Construction Way',
            addressCity: 'Phoenix',
            addressState: 'AZ',
            addressZip: '85001',
            locationAddress: '1500 Construction Way, Phoenix, AZ 85001',
            employeeCount: 1,
            productIds: ['prod16', 'prod46', 'prod61', 'prod93'],
            categoryIds: ['Head Protection', 'Body Protection', 'Foot Protection', 'Fall Protection']
          },
          {
            id: 'g6b',
            name: 'Maintenance Team',
            department: 'Maintenance',
            location: 'Field Site A',
            locationId: 'FLD-001',
            addressLine1: '1500 Construction Way',
            addressCity: 'Phoenix',
            addressState: 'AZ',
            addressZip: '85001',
            locationAddress: '1500 Construction Way, Phoenix, AZ 85001',
            employeeCount: 1,
            productIds: ['prod16', 'prod28', 'prod61', 'prod73'],
            categoryIds: ['Head Protection', 'Hand Protection', 'Foot Protection', 'Hearing Protection']
          }
        ],
        vouchers: [
          {
            id: 'v4',
            name: 'Field Safety Equipment',
            description: 'Quarterly safety equipment for field operations',
            defaultAmount: 300.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: true,
            productIds: ['prod16', 'prod46', 'prod61', 'prod93'],
            departmentId: 'g6',
            locationId: 'FLD-001'
          },
          {
            id: 'v5',
            name: 'Maintenance PPE Budget',
            description: 'Monthly PPE budget for maintenance staff',
            defaultAmount: 250.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod16', 'prod28', 'prod61', 'prod73'],
            departmentId: 'g6b',
            locationId: 'MAINT-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p6',
        name: 'Logistics & Transport Co',
        slug: 'logistics-transport-co',
        industry: 'Transportation',
        contactEmail: 'hello@logistics.com',
        contactPhone: '(555) 678-9012',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM0M2U1YjUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkw8L3RleHQ+PC9zdmc+',
        status: 'active',
        distributorId: 'd3', // MSC Industrial Supply
        employeeCount: 150,
        activeVouchers: 7,
        monthlySpend: 28900.00,
        totalBudget: 150000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: true,
          requireDateOfBirth: true,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp7',
            name: 'Robert Thompson',
            email: 'robert.thompson@logistics.com',
            employeeId: 'LT-001',
            username: 'rthompson',
            dateOfBirth: '1988-11-30',
            startDate: '2020-03-15',
            departmentId: 'g7',
            locationId: 'DEPOT-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 180.00,
            voucherBalances: [
              { voucherId: 'v6', remainingAmount: 180.00 }
            ]
          },
          {
            id: 'emp8',
            name: 'Jennifer Lee',
            email: 'jennifer.lee@logistics.com',
            employeeId: 'LT-002',
            username: 'jlee',
            dateOfBirth: '1992-05-18',
            startDate: '2021-08-20',
            departmentId: 'g7',
            locationId: 'DEPOT-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 180.00,
            voucherBalances: [
              { voucherId: 'v6', remainingAmount: 180.00 }
            ]
          },
          {
            id: 'emp9',
            name: 'David Brown',
            email: 'david.brown@logistics.com',
            employeeId: 'LT-003',
            username: 'dbrown',
            dateOfBirth: '1985-09-12',
            startDate: '2019-11-01',
            departmentId: 'g7b',
            locationId: 'DC-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 200.00,
            voucherBalances: [
              { voucherId: 'v7', remainingAmount: 200.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g7',
            name: 'Drivers',
            department: 'Transportation',
            location: 'Main Depot',
            locationId: 'DEPOT-001',
            addressLine1: '3000 Logistics Blvd',
            addressCity: 'Dallas',
            addressState: 'TX',
            addressZip: '75201',
            locationAddress: '3000 Logistics Blvd, Dallas, TX 75201',
            employeeCount: 2,
            productIds: ['prod46', 'prod48', 'prod61', 'prod73'],
            categoryIds: ['Body Protection', 'Foot Protection', 'Hearing Protection']
          },
          {
            id: 'g7b',
            name: 'Warehouse Staff',
            department: 'Warehouse',
            location: 'Main Depot',
            locationId: 'DEPOT-001',
            addressLine1: '3000 Logistics Blvd',
            addressCity: 'Dallas',
            addressState: 'TX',
            addressZip: '75201',
            locationAddress: '3000 Logistics Blvd, Dallas, TX 75201',
            employeeCount: 1,
            productIds: ['prod16', 'prod28', 'prod46', 'prod61'],
            categoryIds: ['Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection']
          }
        ],
        vouchers: [
          {
            id: 'v6',
            name: 'Driver Safety Allowance',
            description: 'Monthly safety equipment for drivers',
            defaultAmount: 180.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod46', 'prod48', 'prod61', 'prod73'],
            departmentId: 'g7',
            locationId: 'DEPOT-001'
          },
          {
            id: 'v7',
            name: 'Warehouse PPE Fund',
            description: 'Monthly PPE fund for warehouse operations',
            defaultAmount: 200.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: true,
            productIds: ['prod16', 'prod28', 'prod46', 'prod61'],
            departmentId: 'g7b',
            locationId: 'DC-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p7',
        name: 'Food Processing Industries',
        slug: 'food-processing-industries',
        industry: 'Food & Beverage',
        contactEmail: 'contact@foodprocessing.com',
        contactPhone: '(555) 789-0123',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM4YjVjZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkY8L3RleHQ+PC9zdmc+',
        status: 'active',
        distributorId: 'd4', // Motion Industries
        employeeCount: 200,
        activeVouchers: 8,
        monthlySpend: 31200.00,
        totalBudget: 180000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: false,
          requireDateOfBirth: true,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp10',
            name: 'Maria Garcia',
            email: 'maria.garcia@foodprocessing.com',
            employeeId: 'FP-001',
            dateOfBirth: '1991-02-14',
            startDate: '2022-01-10',
            departmentId: 'g8',
            locationId: 'PLANT-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 175.00,
            voucherBalances: [
              { voucherId: 'v8', remainingAmount: 175.00 }
            ]
          },
          {
            id: 'emp11',
            name: 'Thomas Anderson',
            email: 'thomas.anderson@foodprocessing.com',
            employeeId: 'FP-002',
            dateOfBirth: '1987-08-25',
            startDate: '2021-05-20',
            departmentId: 'g8',
            locationId: 'PLANT-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 175.00,
            voucherBalances: [
              { voucherId: 'v8', remainingAmount: 175.00 }
            ]
          },
          {
            id: 'emp12',
            name: 'Lisa White',
            email: 'lisa.white@foodprocessing.com',
            employeeId: 'FP-003',
            dateOfBirth: '1993-12-08',
            startDate: '2023-03-15',
            departmentId: 'g8b',
            locationId: 'LAB-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 150.00,
            voucherBalances: [
              { voucherId: 'v9', remainingAmount: 150.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g8',
            name: 'Production Line',
            department: 'Production',
            location: 'Processing Plant',
            locationId: 'PLANT-001',
            addressLine1: '2000 Industrial Park Dr',
            addressCity: 'Houston',
            addressState: 'TX',
            addressZip: '77001',
            locationAddress: '2000 Industrial Park Dr, Houston, TX 77001',
            employeeCount: 2,
            productIds: ['prod30', 'prod36', 'prod46', 'prod49', 'prod83'],
            categoryIds: ['Hand Protection', 'Body Protection', 'Respiratory Protection']
          },
          {
            id: 'g8b',
            name: 'Quality Control',
            department: 'Quality Assurance',
            location: 'Processing Plant',
            locationId: 'PLANT-001',
            addressLine1: '2000 Industrial Park Dr',
            addressCity: 'Houston',
            addressState: 'TX',
            addressZip: '77001',
            locationAddress: '2000 Industrial Park Dr, Houston, TX 77001',
            employeeCount: 1,
            productIds: ['prod30', 'prod36', 'prod49', 'prod58'],
            categoryIds: ['Hand Protection', 'Body Protection']
          }
        ],
        vouchers: [
          {
            id: 'v8',
            name: 'Production Safety Equipment',
            description: 'Monthly safety equipment for production staff',
            defaultAmount: 175.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod30', 'prod36', 'prod46', 'prod49', 'prod83'],
            departmentId: 'g8',
            locationId: 'PLANT-001'
          },
          {
            id: 'v9',
            name: 'QC Lab Equipment',
            description: 'Monthly PPE for quality control lab',
            defaultAmount: 150.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod30', 'prod36', 'prod49', 'prod58'],
            departmentId: 'g8b',
            locationId: 'LAB-001'
          }
        ],
        availableProducts: this.products.slice()
      },
      {
        id: 'p8',
        name: 'Automotive Parts Manufacturing',
        slug: 'automotive-parts-manufacturing',
        industry: 'Automotive',
        contactEmail: 'info@autoparts.com',
        contactPhone: '(555) 890-1234',
        logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM2NzI4NzciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkE8L3RleHQ+PC9zdmc+',
        status: 'active',
        distributorId: 'd4', // Motion Industries
        employeeCount: 175,
        activeVouchers: 5,
        monthlySpend: 26700.00,
        totalBudget: 140000,
        paymentMethods: ['Credit Card'],
        employeeFieldConfig: {
          requireEmployeeId: true,
          requireUsername: true,
          requireDateOfBirth: false,
          requireStartDate: true
        },
        employees: [
          {
            id: 'emp13',
            name: 'Christopher Taylor',
            email: 'christopher.taylor@autoparts.com',
            employeeId: 'AP-001',
            username: 'ctaylor',
            startDate: '2020-07-01',
            departmentId: 'g9',
            locationId: 'PLANT-A-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 220.00,
            voucherBalances: [
              { voucherId: 'v10', remainingAmount: 220.00 }
            ]
          },
          {
            id: 'emp14',
            name: 'Amanda Johnson',
            email: 'amanda.johnson@autoparts.com',
            employeeId: 'AP-002',
            username: 'ajohnson',
            startDate: '2021-11-15',
            departmentId: 'g9',
            locationId: 'PLANT-A-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 220.00,
            voucherBalances: [
              { voucherId: 'v10', remainingAmount: 220.00 }
            ]
          },
          {
            id: 'emp15',
            name: 'Daniel Kim',
            email: 'daniel.kim@autoparts.com',
            employeeId: 'AP-003',
            username: 'dkim',
            startDate: '2022-04-22',
            departmentId: 'g9b',
            locationId: 'WELD-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 250.00,
            voucherBalances: [
              { voucherId: 'v11', remainingAmount: 250.00 }
            ]
          },
          {
            id: 'emp16',
            name: 'Rachel Moore',
            email: 'rachel.moore@autoparts.com',
            employeeId: 'AP-004',
            username: 'rmoore',
            startDate: '2023-01-08',
            departmentId: 'g9b',
            locationId: 'WELD-001',
            voucherExpiry: '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: 250.00,
            voucherBalances: [
              { voucherId: 'v11', remainingAmount: 250.00 }
            ]
          }
        ],
        groups: [
          {
            id: 'g9',
            name: 'Assembly Line',
            department: 'Manufacturing',
            location: 'Plant Floor A',
            locationId: 'PLANT-A-001',
            addressLine1: '4000 Manufacturing Ave',
            addressCity: 'Detroit',
            addressState: 'MI',
            addressZip: '48201',
            locationAddress: '4000 Manufacturing Ave, Detroit, MI 48201',
            employeeCount: 2,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61'],
            categoryIds: ['Eye Protection', 'Head Protection', 'Hand Protection', 'Body Protection', 'Foot Protection']
          },
          {
            id: 'g9b',
            name: 'Welding Department',
            department: 'Manufacturing',
            location: 'Plant Floor A',
            locationId: 'PLANT-A-001',
            addressLine1: '4000 Manufacturing Ave',
            addressCity: 'Detroit',
            addressState: 'MI',
            addressZip: '48201',
            locationAddress: '4000 Manufacturing Ave, Detroit, MI 48201',
            employeeCount: 2,
            productIds: ['prod5', 'prod32', 'prod52', 'prod84'],
            categoryIds: ['Eye Protection', 'Hand Protection', 'Body Protection', 'Respiratory Protection']
          }
        ],
        vouchers: [
          {
            id: 'v10',
            name: 'Assembly Line Safety',
            description: 'Monthly safety equipment for assembly workers',
            defaultAmount: 220.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: false,
            productIds: ['prod1', 'prod16', 'prod28', 'prod46', 'prod61'],
            departmentId: 'g9',
            locationId: 'PLANT-A-001'
          },
          {
            id: 'v11',
            name: 'Welding PPE Budget',
            description: 'Monthly PPE budget for welding operations',
            defaultAmount: 250.00,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true,
            autoRenewal: true,
            rolloverEnabled: true,
            productIds: ['prod5', 'prod32', 'prod52', 'prod84'],
            departmentId: 'g9b',
            locationId: 'WELD-001'
          }
        ],
        availableProducts: this.products.slice()
      }
    ];
    
    // Only initialize if not already set, or merge new customers if they don't exist
    if (!this.customers || this.customers.length === 0) {
      this.customers = defaultCustomers;
    } else {
      // Merge new customers that don't already exist (by ID), or update existing ones with mock data
      var existingIds = this.customers.map(function(p) { return p.id; });
      defaultCustomers.forEach(function(newCustomer) {
        var existingIndex = existingIds.indexOf(newCustomer.id);
        if (existingIndex === -1) {
          // New customer - add it
          this.customers.push(newCustomer);
        } else {
          // Existing customer - update basic info and mock data if needed
          var existingCustomer = this.customers[existingIndex];
          
          // Update basic customer info (name, slug, logo, contact info) for p1 (Boeing)
          if (newCustomer.id === 'p1') {
            existingCustomer.name = newCustomer.name;
            existingCustomer.slug = newCustomer.slug;
            existingCustomer.logoUrl = newCustomer.logoUrl;
            existingCustomer.contactEmail = newCustomer.contactEmail;
          }
          
          // Always update employeeFieldConfig to match default (to ensure consistency)
          if (newCustomer.employeeFieldConfig) {
            existingCustomer.employeeFieldConfig = newCustomer.employeeFieldConfig;
          }
          
          // Always update distributorId if missing (to ensure customers are associated with distributors)
          if (!existingCustomer.distributorId && newCustomer.distributorId) {
            existingCustomer.distributorId = newCustomer.distributorId;
          }
          
          // Always update voucher productIds to keep them in sync with source data
          // This ensures that changes to voucher eligibility are applied even when vouchers exist
          if (existingCustomer.vouchers && existingCustomer.vouchers.length > 0 && 
              newCustomer.vouchers && newCustomer.vouchers.length > 0) {
            existingCustomer.vouchers.forEach(function(existingVoucher) {
              var sourceVoucher = newCustomer.vouchers.find(function(v) { return v.id === existingVoucher.id; });
              if (sourceVoucher && sourceVoucher.productIds) {
                // Always update productIds from source to ensure they stay in sync
                existingVoucher.productIds = sourceVoucher.productIds;
                // Also update other key fields that might have changed
                existingVoucher.defaultAmount = sourceVoucher.defaultAmount;
                existingVoucher.isActive = sourceVoucher.isActive;
              }
            });
          }
          
          // Only update if the customer has no employees, groups, or vouchers (to preserve user-created data)
          if ((!existingCustomer.employees || existingCustomer.employees.length === 0) &&
              (!existingCustomer.groups || existingCustomer.groups.length === 0) &&
              (!existingCustomer.vouchers || existingCustomer.vouchers.length === 0)) {
            // Update with mock data
            existingCustomer.employees = newCustomer.employees;
            existingCustomer.groups = newCustomer.groups;
            existingCustomer.vouchers = newCustomer.vouchers;
            // Update employee count to match
            if (newCustomer.employees && newCustomer.employees.length > 0) {
              existingCustomer.employeeCount = newCustomer.employees.length;
            }
            // Update active vouchers count
            if (newCustomer.vouchers && newCustomer.vouchers.length > 0) {
              existingCustomer.activeVouchers = newCustomer.vouchers.filter(function(v) { return v.isActive; }).length;
            }
          } else {
            // Update existing groups with locationId, locationAddress, and address fields if they don't have them
            if (existingCustomer.groups && existingCustomer.groups.length > 0 && newCustomer.groups && newCustomer.groups.length > 0) {
              existingCustomer.groups.forEach(function(existingGroup) {
                // Find matching group in mock data by ID
                var mockGroup = newCustomer.groups.find(function(g) { return g.id === existingGroup.id; });
                if (mockGroup) {
                  // Update locationId and locationAddress if missing
                  if (!existingGroup.locationId && mockGroup.locationId) {
                    existingGroup.locationId = mockGroup.locationId;
                  }
                  if (!existingGroup.locationAddress && mockGroup.locationAddress) {
                    existingGroup.locationAddress = mockGroup.locationAddress;
                  }
                  // Also ensure department and location are set if missing
                  if (!existingGroup.department && mockGroup.department) {
                    existingGroup.department = mockGroup.department;
                  }
                  if (!existingGroup.location && mockGroup.location) {
                    existingGroup.location = mockGroup.location;
                  }
                  // Update address fields if missing
                  if (!existingGroup.addressLine1 && mockGroup.addressLine1) {
                    existingGroup.addressLine1 = mockGroup.addressLine1;
                  }
                  if (!existingGroup.addressCity && mockGroup.addressCity) {
                    existingGroup.addressCity = mockGroup.addressCity;
                  }
                  if (!existingGroup.addressState && mockGroup.addressState) {
                    existingGroup.addressState = mockGroup.addressState;
                  }
                  if (!existingGroup.addressZip && mockGroup.addressZip) {
                    existingGroup.addressZip = mockGroup.addressZip;
                  }
                }
              });
              
              // Add any groups from mock data that don't exist in existing customer
              var existingGroupIds = existingCustomer.groups.map(function(g) { return g.id; });
              newCustomer.groups.forEach(function(mockGroup) {
                if (existingGroupIds.indexOf(mockGroup.id) === -1) {
                  // Group doesn't exist, add it
                  existingCustomer.groups.push(mockGroup);
                }
              });
            } else if (newCustomer.groups && newCustomer.groups.length > 0) {
              // Customer has no groups but mock data does - add them
              existingCustomer.groups = newCustomer.groups.slice();
            }
            
            // Recalculate activeVouchers from current vouchers to ensure accuracy
            if (existingCustomer.vouchers && existingCustomer.vouchers.length > 0) {
              var actualActiveCount = existingCustomer.vouchers.filter(function(v) { return v.isActive; }).length;
              if (existingCustomer.activeVouchers !== actualActiveCount) {
                existingCustomer.activeVouchers = actualActiveCount;
              }
            }
          }
        }
      }.bind(this));
      
      // Recalculate activeVouchers for all customers to ensure accuracy
      this.customers.forEach(function(customer) {
        if (customer.vouchers && customer.vouchers.length > 0) {
          var actualActiveCount = customer.vouchers.filter(function(v) { return v.isActive; }).length;
          if (customer.activeVouchers !== actualActiveCount) {
            customer.activeVouchers = actualActiveCount;
          }
        } else if (customer.activeVouchers > 0) {
          // No vouchers but activeVouchers > 0, reset to 0
          customer.activeVouchers = 0;
        }
      });
      
      // Initialize branch locations for distributors if not already set (needed for location assignment)
      if (!this.branchLocations || this.branchLocations.length === 0) {
        this.branchLocations = [
          // Fastenal (d1) branch locations
          { id: 'br-d1-001', branchId: 'FAST-SEA-001', branchAddress: '1200 Industrial Way, Seattle, WA 98108' },
          { id: 'br-d1-002', branchId: 'FAST-CHI-001', branchAddress: '2500 Commerce Dr, Chicago, IL 60611' },
          { id: 'br-d1-003', branchId: 'FAST-HOU-001', branchAddress: '1800 Business Blvd, Houston, TX 77001' },
          { id: 'br-d1-004', branchId: 'FAST-ATL-001', branchAddress: '3200 Distribution Ave, Atlanta, GA 30301' },
          // Grainger (d2) branch locations
          { id: 'br-d2-001', branchId: 'GRG-CHI-001', branchAddress: '1500 Supply Chain Way, Chicago, IL 60601' },
          { id: 'br-d2-002', branchId: 'GRG-DAL-001', branchAddress: '2800 Industrial Blvd, Dallas, TX 75201' },
          { id: 'br-d2-003', branchId: 'GRG-PHO-001', branchAddress: '2200 Manufacturing Dr, Phoenix, AZ 85001' },
          { id: 'br-d2-004', branchId: 'GRG-DET-001', branchAddress: '1900 Production Ave, Detroit, MI 48201' },
          // MSC Industrial Supply (d3) branch locations
          { id: 'br-d3-001', branchId: 'MSC-NYC-001', branchAddress: '1000 Industrial Park, New York, NY 10001' },
          { id: 'br-d3-002', branchId: 'MSC-LA-001', branchAddress: '3500 Commerce Center Dr, Los Angeles, CA 90001' },
          { id: 'br-d3-003', branchId: 'MSC-CLE-001', branchAddress: '2000 Manufacturing Way, Cleveland, OH 44101' },
          { id: 'br-d3-004', branchId: 'MSC-PIT-001', branchAddress: '2700 Steel Blvd, Pittsburgh, PA 15201' },
          // Motion Industries (d4) branch locations
          { id: 'br-d4-001', branchId: 'MOT-BIR-001', branchAddress: '1600 Industrial Dr, Birmingham, AL 35201' },
          { id: 'br-d4-002', branchId: 'MOT-CHA-001', branchAddress: '2400 Manufacturing Ave, Charlotte, NC 28201' },
          { id: 'br-d4-003', branchId: 'MOT-MIN-001', branchAddress: '3000 Production Way, Minneapolis, MN 55401' },
          { id: 'br-d4-004', branchId: 'MOT-MIL-001', branchAddress: '1800 Industrial Blvd, Milwaukee, WI 53201' }
        ];
        this.saveToStorage();
      }
      
      // Populate employees from transactions for all customers
      this.populateEmployeesFromTransactions();
      
      // Enrich transactions with invoice, shipping, and payment breakdown fields
      this.enrichTransactions();
      
      // Convert groups to locations with departments for all customers
      this.convertGroupsToLocations();
      
      // Save merged customers
      this.saveCustomers();
    }
    
    // Distributors (for SureWerx employees to select from)
    this.distributors = [
      {
        id: 'd1',
        name: 'Fastenal',
        logo: 'images/Fastenal_logo.png'
      },
      {
        id: 'd2',
        name: 'Grainger',
        logo: 'images/Grainger_logo.png'
      },
      {
        id: 'd3',
        name: 'MSC Industrial Supply',
        logo: 'images/msc-logo.png'
      },
      {
        id: 'd4',
        name: 'Motion Industries',
        logo: 'images/motion-industries-logo.png'
      }
    ];
    
    // Users
    this.users = [
      {
        id: 'u1',
        email: 'admin@distributor.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'Distributor',
        distributorId: 'd1', // Fastenal
        customerId: null,
        status: 'Active'
      },
      {
        id: 'u1b',
        email: 'admin@grainger.com',
        password: 'admin123',
        firstName: 'Grainger',
        lastName: 'Admin',
        role: 'Distributor',
        distributorId: 'd2', // Grainger
        customerId: null,
        status: 'Active'
      },
      {
        id: 'u1c',
        email: 'admin@msc.com',
        password: 'admin123',
        firstName: 'MSC',
        lastName: 'Admin',
        role: 'Distributor',
        distributorId: 'd3', // MSC Industrial Supply
        customerId: null,
        status: 'Active'
      },
      {
        id: 'u1d',
        email: 'admin@motion.com',
        password: 'admin123',
        firstName: 'Motion',
        lastName: 'Admin',
        role: 'Distributor',
        distributorId: 'd4', // Motion Industries
        customerId: null,
        status: 'Active'
      },
      {
        id: 'u2',
        email: 'customer@boeing.com',
        password: 'customer123',
        firstName: 'Customer',
        lastName: 'User',
        role: 'Customer',
        customerId: 'p1',
        status: 'Active'
      },
      {
        id: 'u3',
        email: 'surewerx@example.com',
        password: 'surewerx123',
        firstName: 'SureWerx',
        lastName: 'Employee',
        role: 'SureWerx',
        customerId: null,
        status: 'Active'
      }
    ];
    
    // Ensure currentUser has distributorId if they're a distributor user (for users loaded from localStorage)
    // Also set distributor name/logo for distributor and customer users
    if (this.currentUser && (this.currentUser.role === 'Distributor' || this.currentUser.role === 'Customer')) {
      var needsSave = false;
      var distributorIdToUse = null;
      
      if (this.currentUser.role === 'Distributor') {
        // Backfill distributorId if missing
        if (!this.currentUser.distributorId) {
          var user = this.users.find(function(u) { return u.id === this.currentUser.id; }.bind(this));
          if (user && user.distributorId) {
            this.currentUser.distributorId = user.distributorId;
            needsSave = true;
          }
        }
        distributorIdToUse = this.currentUser.distributorId;
        
        // Always clear selectedDistributorId for distributor users (it's only for SureWerx)
        if (this.selectedDistributorId !== null) {
          this.selectedDistributorId = null;
          needsSave = true;
        }
      } else if (this.currentUser.role === 'Customer' && this.currentUser.customerId) {
        // For customer users, get distributorId from their customer
        var customer = this.getCustomerById(this.currentUser.customerId);
        if (customer && customer.distributorId) {
          distributorIdToUse = customer.distributorId;
        }
      }
      
      // Set distributor name and logo based on distributorId
      if (distributorIdToUse) {
        var distributor = this.distributors.find(function(d) { return d.id === distributorIdToUse; }.bind(this));
        if (distributor) {
          // Only update if different (to avoid unnecessary saves)
          if (this.distributorName !== distributor.name) {
            this.distributorName = distributor.name;
            needsSave = true;
          }
          var newLogo = distributor.logo || null;
          if (this.distributorLogo !== newLogo) {
            this.distributorLogo = newLogo;
            needsSave = true;
          }
        }
      }
      
      // Save if we made changes
      if (needsSave) {
        this.saveToStorage();
      }
    }
    
    // Transactions - 25 demo transactions across different customers and time periods
    this.transactions = [
      { id: 't1', orderId: 'ORD-2024-001', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-11-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't2', orderId: 'ORD-2024-001', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-11-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't3', orderId: 'ORD-2024-002', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-10-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't4', orderId: 'ORD-2024-002', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-10-28', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't5', orderId: 'ORD-2024-003', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-10-15', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't5b', orderId: 'ORD-2024-003', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Goggles - Anti-Fog', surewerxPartNumber: 'SWX-SG-003', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 16.00, dateOrdered: '2024-10-15', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't6', orderId: 'ORD-2024-004', employeeName: 'Mike Davis', employeeEmail: 'mike.davis@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Ear Plugs - Foam (200 pairs)', surewerxPartNumber: 'SWX-EP-001', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.50, dateOrdered: '2024-11-05', voucherUsed: 'Safety Equipment Fund', voucherAmount: 100.00, lineStatus: 'Processing', paymentMethod: 'Voucher' },
      { id: 't7', orderId: 'ORD-2024-004', employeeName: 'Mike Davis', employeeEmail: 'mike.davis@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Safety Goggles - Anti-Fog', surewerxPartNumber: 'SWX-SG-003', distributorPartNumber: '', quantity: 4, unitPrice: 22.99, totalPrice: 91.96, distributorCost: 16.00, dateOrdered: '2024-11-05', voucherUsed: 'Maintenance PPE Budget', voucherAmount: 150.00, lineStatus: 'Processing', paymentMethod: 'Mixed' },
      { id: 't8', orderId: 'ORD-2024-005', employeeName: 'Lisa Chen', employeeEmail: 'lisa.chen@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Hard Hat - Full Brim', surewerxPartNumber: 'SWX-HH-006', distributorPartNumber: '', quantity: 1, unitPrice: 32.99, totalPrice: 32.99, distributorCost: 25.00, dateOrdered: '2024-11-03', voucherUsed: 'PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't9', orderId: 'ORD-2024-005', employeeName: 'Lisa Chen', employeeEmail: 'lisa.chen@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Work Gloves - Cowhide', surewerxPartNumber: 'SWX-GL-004', distributorPartNumber: '', quantity: 5, unitPrice: 14.99, totalPrice: 74.95, distributorCost: 11.00, dateOrdered: '2024-11-03', voucherUsed: 'Construction Safety Equipment', voucherAmount: 250.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't10', orderId: 'ORD-2024-006', employeeName: 'Robert Martinez', employeeEmail: 'robert.martinez@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Reflective Vest - Class 3', surewerxPartNumber: 'SWX-RV-001', distributorPartNumber: '', quantity: 2, unitPrice: 29.99, totalPrice: 59.98, distributorCost: 22.50, dateOrdered: '2024-10-30', voucherUsed: 'PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't11', orderId: 'ORD-2024-007', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.50, dateOrdered: '2024-10-22', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't11b', orderId: 'ORD-2024-007', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 1, unitPrice: 15.99, totalPrice: 15.99, distributorCost: 12.00, dateOrdered: '2024-10-22', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't12', orderId: 'ORD-2024-008', employeeName: 'Tom Wilson', employeeEmail: 'tom.wilson@manufacturing.com', employeeGroup: 'Maintenance', customerName: 'Manufacturing Corp', productName: 'Welding Gloves - Heavy Duty', surewerxPartNumber: 'SWX-WG-002', distributorPartNumber: '', quantity: 2, unitPrice: 28.99, totalPrice: 57.98, distributorCost: 22.00, dateOrdered: '2024-10-20', voucherUsed: 'Maintenance PPE Budget', voucherAmount: 150.00, lineStatus: 'Returned', paymentMethod: 'Voucher' },
      { id: 't13', orderId: 'ORD-2024-009', employeeName: 'Anna Rodriguez', employeeEmail: 'anna.rodriguez@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Safety Glasses - Tinted', surewerxPartNumber: 'SWX-SG-002', distributorPartNumber: '', quantity: 3, unitPrice: 17.99, totalPrice: 53.97, distributorCost: 13.50, dateOrdered: '2024-10-18', voucherUsed: 'PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't14', orderId: 'ORD-2024-009', employeeName: 'Anna Rodriguez', employeeEmail: 'anna.rodriguez@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Ear Muffs - Standard', surewerxPartNumber: 'SWX-EM-001', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 17.00, dateOrdered: '2024-10-18', voucherUsed: 'Construction Safety Equipment', voucherAmount: 250.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't15', orderId: 'ORD-2024-010', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Dust Mask - N95 (20pk)', surewerxPartNumber: 'SWX-DM-001', distributorPartNumber: '', quantity: 2, unitPrice: 24.99, totalPrice: 49.98, distributorCost: 18.50, dateOrdered: '2024-10-12', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't16', orderId: 'ORD-2024-011', employeeName: 'David Kim', employeeEmail: 'david.kim@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Cut Resistant Gloves - Level 5', surewerxPartNumber: 'SWX-CR-001', distributorPartNumber: '', quantity: 4, unitPrice: 24.99, totalPrice: 99.96, distributorCost: 18.50, dateOrdered: '2024-10-10', voucherUsed: 'Safety Equipment Fund', voucherAmount: 100.00, lineStatus: 'Cancelled', paymentMethod: 'Voucher' },
      { id: 't17', orderId: 'ORD-2024-012', employeeName: 'Jessica Brown', employeeEmail: 'jessica.brown@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-10-05', voucherUsed: 'Construction Safety Equipment', voucherAmount: 250.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't18', orderId: 'ORD-2024-013', employeeName: 'Carlos Garcia', employeeEmail: 'carlos.garcia@manufacturing.com', employeeGroup: 'Maintenance', customerName: 'Manufacturing Corp', productName: 'Face Shield - Full Coverage', surewerxPartNumber: 'SWX-FS-001', distributorPartNumber: '', quantity: 3, unitPrice: 28.99, totalPrice: 86.97, distributorCost: 21.00, dateOrdered: '2024-10-01', voucherUsed: 'Maintenance PPE Budget', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't19', orderId: 'ORD-2024-014', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Yellow', surewerxPartNumber: 'SWX-SV-005', distributorPartNumber: '', quantity: 4, unitPrice: 19.99, totalPrice: 79.96, distributorCost: 14.00, dateOrdered: '2024-09-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't20', orderId: 'ORD-2024-015', employeeName: 'Michael Lee', employeeEmail: 'michael.lee@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Hard Hat - Vented', surewerxPartNumber: 'SWX-HH-005', distributorPartNumber: '', quantity: 2, unitPrice: 29.99, totalPrice: 59.98, distributorCost: 22.50, dateOrdered: '2024-09-25', voucherUsed: 'Construction Safety Equipment', voucherAmount: 250.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't21', orderId: 'ORD-2024-016', employeeName: 'Emma White', employeeEmail: 'emma.white@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Chemical Resistant Gloves', surewerxPartNumber: 'SWX-CG-001', distributorPartNumber: '', quantity: 3, unitPrice: 21.99, totalPrice: 65.97, distributorCost: 16.50, dateOrdered: '2024-09-20', voucherUsed: 'Safety Equipment Fund', voucherAmount: 100.00, lineStatus: 'Returned', paymentMethod: 'Voucher' },
      { id: 't22', orderId: 'ORD-2024-017', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Composite Toe Boots - 8 inch', surewerxPartNumber: 'SWX-CT-001', distributorPartNumber: '', quantity: 1, unitPrice: 99.99, totalPrice: 99.99, distributorCost: 76.00, dateOrdered: '2024-09-15', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't22b', orderId: 'ORD-2024-017', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Goggles - Anti-Fog', surewerxPartNumber: 'SWX-SG-003', distributorPartNumber: '', quantity: 1, unitPrice: 22.99, totalPrice: 22.99, distributorCost: 16.00, dateOrdered: '2024-09-15', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't23', orderId: 'ORD-2024-018', employeeName: 'James Taylor', employeeEmail: 'james.taylor@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Rain Suit - 2 Piece', surewerxPartNumber: 'SWX-RS-001', distributorPartNumber: '', quantity: 2, unitPrice: 38.99, totalPrice: 77.98, distributorCost: 29.50, dateOrdered: '2024-09-10', voucherUsed: 'Construction Safety Equipment', voucherAmount: 250.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't24', orderId: 'ORD-2024-019', employeeName: 'Sophia Anderson', employeeEmail: 'sophia.anderson@manufacturing.com', employeeGroup: 'Quality Control', customerName: 'Manufacturing Corp', productName: 'Latex Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-LG-001', distributorPartNumber: '', quantity: 4, unitPrice: 15.99, totalPrice: 63.96, distributorCost: 11.50, dateOrdered: '2024-09-05', voucherUsed: 'Safety Equipment Fund', voucherAmount: 100.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't25', orderId: 'ORD-2024-020', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Half Mask Respirator - Reusable', surewerxPartNumber: 'SWX-HM-001', distributorPartNumber: '', quantity: 2, unitPrice: 34.99, totalPrice: 69.98, distributorCost: 26.50, dateOrdered: '2024-08-28', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't25b', orderId: 'ORD-2024-020', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.50, dateOrdered: '2024-08-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      // Mixed payment method transactions - voucher + credit card
      { id: 't26', orderId: 'ORD-2024-021', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-11-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 50.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't27', orderId: 'ORD-2024-021', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-11-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 50.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't28', orderId: 'ORD-2024-021', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-11-10', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't29', orderId: 'ORD-2024-022', employeeName: 'Lisa Chen', employeeEmail: 'lisa.chen@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-11-08', voucherUsed: 'PPE Allowance', voucherAmount: 50.00, lineStatus: 'Processing', paymentMethod: 'Mixed' },
      { id: 't30', orderId: 'ORD-2024-022', employeeName: 'Lisa Chen', employeeEmail: 'lisa.chen@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Work Gloves - Cowhide', surewerxPartNumber: 'SWX-GL-004', distributorPartNumber: '', quantity: 3, unitPrice: 14.99, totalPrice: 44.97, distributorCost: 11.00, dateOrdered: '2024-11-08', voucherUsed: 'Construction Safety Equipment', voucherAmount: 250.00, lineStatus: 'Processing', paymentMethod: 'Mixed' },
      { id: 't31', orderId: 'ORD-2024-023', employeeName: 'Mike Davis', employeeEmail: 'mike.davis@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Composite Toe Boots - 8 inch', surewerxPartNumber: 'SWX-CT-001', distributorPartNumber: '', quantity: 1, unitPrice: 99.99, totalPrice: 99.99, distributorCost: 76.00, dateOrdered: '2024-11-07', voucherUsed: 'Safety Equipment Fund', voucherAmount: 50.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't32', orderId: 'ORD-2024-023', employeeName: 'Mike Davis', employeeEmail: 'mike.davis@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Safety Goggles - Anti-Fog', surewerxPartNumber: 'SWX-SG-003', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 16.00, dateOrdered: '2024-11-07', voucherUsed: 'Maintenance PPE Budget', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't33', orderId: 'ORD-2024-024', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-11-06', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 50.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't34', orderId: 'ORD-2024-024', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.50, dateOrdered: '2024-11-06', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't35', orderId: 'ORD-2024-025', employeeName: 'Robert Martinez', employeeEmail: 'robert.martinez@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Hard Hat - Full Brim', surewerxPartNumber: 'SWX-HH-006', distributorPartNumber: '', quantity: 1, unitPrice: 32.99, totalPrice: 32.99, distributorCost: 25.00, dateOrdered: '2024-11-05', voucherUsed: 'PPE Allowance', voucherAmount: 50.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't36', orderId: 'ORD-2024-025', employeeName: 'Robert Martinez', employeeEmail: 'robert.martinez@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Reflective Vest - Class 3', surewerxPartNumber: 'SWX-RV-001', distributorPartNumber: '', quantity: 1, unitPrice: 29.99, totalPrice: 29.99, distributorCost: 22.50, dateOrdered: '2024-11-05', voucherUsed: 'Construction Safety Equipment', voucherAmount: 250.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      // Additional transactions to reach 75%+ employee voucher usage for some partners
      // Boeing - adding 32 more employees (34 total = 75.6% of 45)
      { id: 't37', orderId: 'ORD-2024-026', employeeName: 'Michael Brown', employeeEmail: 'michael.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-10-25', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't38', orderId: 'ORD-2024-027', employeeName: 'Emily Davis', employeeEmail: 'emily.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-10-20', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't39', orderId: 'ORD-2024-028', employeeName: 'David Wilson', employeeEmail: 'david.wilson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-10-18', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't40', orderId: 'ORD-2024-029', employeeName: 'Jennifer Martinez', employeeEmail: 'jennifer.martinez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-10-15', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't41', orderId: 'ORD-2024-030', employeeName: 'Robert Taylor', employeeEmail: 'robert.taylor@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-10-12', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't42', orderId: 'ORD-2024-031', employeeName: 'Lisa Anderson', employeeEmail: 'lisa.anderson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.50, dateOrdered: '2024-10-10', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't43', orderId: 'ORD-2024-032', employeeName: 'James White', employeeEmail: 'james.white@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Dust Mask - N95 (20pk)', surewerxPartNumber: 'SWX-DM-001', distributorPartNumber: '', quantity: 2, unitPrice: 24.99, totalPrice: 49.98, distributorCost: 18.50, dateOrdered: '2024-10-08', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't44', orderId: 'ORD-2024-033', employeeName: 'Patricia Garcia', employeeEmail: 'patricia.garcia@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Yellow', surewerxPartNumber: 'SWX-SV-005', distributorPartNumber: '', quantity: 4, unitPrice: 19.99, totalPrice: 79.96, distributorCost: 14.00, dateOrdered: '2024-10-05', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't45', orderId: 'ORD-2024-034', employeeName: 'Christopher Lee', employeeEmail: 'christopher.lee@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Composite Toe Boots - 8 inch', surewerxPartNumber: 'SWX-CT-001', distributorPartNumber: '', quantity: 1, unitPrice: 99.99, totalPrice: 99.99, distributorCost: 76.00, dateOrdered: '2024-10-03', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't46', orderId: 'ORD-2024-035', employeeName: 'Amanda Rodriguez', employeeEmail: 'amanda.rodriguez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Half Mask Respirator - Reusable', surewerxPartNumber: 'SWX-HM-001', distributorPartNumber: '', quantity: 2, unitPrice: 34.99, totalPrice: 69.98, distributorCost: 26.50, dateOrdered: '2024-10-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't47', orderId: 'ORD-2024-036', employeeName: 'Daniel Kim', employeeEmail: 'daniel.kim@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Tinted', surewerxPartNumber: 'SWX-SG-002', distributorPartNumber: '', quantity: 3, unitPrice: 17.99, totalPrice: 53.97, distributorCost: 13.50, dateOrdered: '2024-09-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't48', orderId: 'ORD-2024-037', employeeName: 'Rachel Moore', employeeEmail: 'rachel.moore@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Ear Muffs - Standard', surewerxPartNumber: 'SWX-EM-001', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 17.00, dateOrdered: '2024-09-25', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't49', orderId: 'ORD-2024-038', employeeName: 'Thomas Chen', employeeEmail: 'thomas.chen@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-09-22', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't50', orderId: 'ORD-2024-039', employeeName: 'Maria Johnson', employeeEmail: 'maria.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Rain Suit - 2 Piece', surewerxPartNumber: 'SWX-RS-001', distributorPartNumber: '', quantity: 2, unitPrice: 38.99, totalPrice: 77.98, distributorCost: 29.50, dateOrdered: '2024-09-20', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't51', orderId: 'ORD-2024-040', employeeName: 'Kevin Brown', employeeEmail: 'kevin.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Latex Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-LG-001', distributorPartNumber: '', quantity: 4, unitPrice: 15.99, totalPrice: 63.96, distributorCost: 11.50, dateOrdered: '2024-09-18', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't52', orderId: 'ORD-2024-041', employeeName: 'Susan Williams', employeeEmail: 'susan.williams@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Face Shield - Full Coverage', surewerxPartNumber: 'SWX-FS-001', distributorPartNumber: '', quantity: 3, unitPrice: 28.99, totalPrice: 86.97, distributorCost: 21.00, dateOrdered: '2024-09-15', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't53', orderId: 'ORD-2024-042', employeeName: 'Mark Thompson', employeeEmail: 'mark.thompson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Welding Gloves - Heavy Duty', surewerxPartNumber: 'SWX-WG-002', distributorPartNumber: '', quantity: 2, unitPrice: 28.99, totalPrice: 57.98, distributorCost: 22.00, dateOrdered: '2024-09-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't54', orderId: 'ORD-2024-043', employeeName: 'Nancy Davis', employeeEmail: 'nancy.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Cut Resistant Gloves - Level 5', surewerxPartNumber: 'SWX-CR-001', distributorPartNumber: '', quantity: 4, unitPrice: 24.99, totalPrice: 99.96, distributorCost: 18.50, dateOrdered: '2024-09-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't55', orderId: 'ORD-2024-044', employeeName: 'Brian Miller', employeeEmail: 'brian.miller@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Chemical Resistant Gloves', surewerxPartNumber: 'SWX-CG-001', distributorPartNumber: '', quantity: 3, unitPrice: 21.99, totalPrice: 65.97, distributorCost: 16.50, dateOrdered: '2024-09-08', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't56', orderId: 'ORD-2024-045', employeeName: 'Karen Wilson', employeeEmail: 'karen.wilson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-09-05', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't57', orderId: 'ORD-2024-046', employeeName: 'Steven Martinez', employeeEmail: 'steven.martinez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-09-03', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't58', orderId: 'ORD-2024-047', employeeName: 'Michelle Taylor', employeeEmail: 'michelle.taylor@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-09-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't59', orderId: 'ORD-2024-048', employeeName: 'Ryan Anderson', employeeEmail: 'ryan.anderson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-08-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't60', orderId: 'ORD-2024-049', employeeName: 'Laura White', employeeEmail: 'laura.white@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-08-25', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't61', orderId: 'ORD-2024-050', employeeName: 'Jason Garcia', employeeEmail: 'jason.garcia@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.50, dateOrdered: '2024-08-22', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't62', orderId: 'ORD-2024-051', employeeName: 'Stephanie Lee', employeeEmail: 'stephanie.lee@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Dust Mask - N95 (20pk)', surewerxPartNumber: 'SWX-DM-001', distributorPartNumber: '', quantity: 2, unitPrice: 24.99, totalPrice: 49.98, distributorCost: 18.50, dateOrdered: '2024-08-20', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't63', orderId: 'ORD-2024-052', employeeName: 'Eric Rodriguez', employeeEmail: 'eric.rodriguez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Yellow', surewerxPartNumber: 'SWX-SV-005', distributorPartNumber: '', quantity: 4, unitPrice: 19.99, totalPrice: 79.96, distributorCost: 14.00, dateOrdered: '2024-08-18', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't64', orderId: 'ORD-2024-053', employeeName: 'Nicole Kim', employeeEmail: 'nicole.kim@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Composite Toe Boots - 8 inch', surewerxPartNumber: 'SWX-CT-001', distributorPartNumber: '', quantity: 1, unitPrice: 99.99, totalPrice: 99.99, distributorCost: 76.00, dateOrdered: '2024-08-15', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't65', orderId: 'ORD-2024-054', employeeName: 'Andrew Moore', employeeEmail: 'andrew.moore@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Half Mask Respirator - Reusable', surewerxPartNumber: 'SWX-HM-001', distributorPartNumber: '', quantity: 2, unitPrice: 34.99, totalPrice: 69.98, distributorCost: 26.50, dateOrdered: '2024-08-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't66', orderId: 'ORD-2024-055', employeeName: 'Melissa Chen', employeeEmail: 'melissa.chen@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Tinted', surewerxPartNumber: 'SWX-SG-002', distributorPartNumber: '', quantity: 3, unitPrice: 17.99, totalPrice: 53.97, distributorCost: 13.50, dateOrdered: '2024-08-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't67', orderId: 'ORD-2024-056', employeeName: 'Justin Johnson', employeeEmail: 'justin.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Ear Muffs - Standard', surewerxPartNumber: 'SWX-EM-001', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 17.00, dateOrdered: '2024-08-08', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't68', orderId: 'ORD-2024-057', employeeName: 'Angela Brown', employeeEmail: 'angela.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-08-05', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't69', orderId: 'ORD-2024-058', employeeName: 'Brandon Williams', employeeEmail: 'brandon.williams@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Rain Suit - 2 Piece', surewerxPartNumber: 'SWX-RS-001', distributorPartNumber: '', quantity: 2, unitPrice: 38.99, totalPrice: 77.98, distributorCost: 29.50, dateOrdered: '2024-08-03', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't70', orderId: 'ORD-2024-059', employeeName: 'Christina Thompson', employeeEmail: 'christina.thompson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Latex Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-LG-001', distributorPartNumber: '', quantity: 4, unitPrice: 15.99, totalPrice: 63.96, distributorCost: 11.50, dateOrdered: '2024-08-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't71', orderId: 'ORD-2024-060', employeeName: 'Tyler Miller', employeeEmail: 'tyler.miller@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Face Shield - Full Coverage', surewerxPartNumber: 'SWX-FS-001', distributorPartNumber: '', quantity: 3, unitPrice: 28.99, totalPrice: 86.97, distributorCost: 21.00, dateOrdered: '2024-07-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't72', orderId: 'ORD-2024-061', employeeName: 'Samantha Davis', employeeEmail: 'samantha.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Welding Gloves - Heavy Duty', surewerxPartNumber: 'SWX-WG-002', distributorPartNumber: '', quantity: 2, unitPrice: 28.99, totalPrice: 57.98, distributorCost: 22.00, dateOrdered: '2024-07-25', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't73', orderId: 'ORD-2024-062', employeeName: 'Jonathan Wilson', employeeEmail: 'jonathan.wilson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Cut Resistant Gloves - Level 5', surewerxPartNumber: 'SWX-CR-001', distributorPartNumber: '', quantity: 4, unitPrice: 24.99, totalPrice: 99.96, distributorCost: 18.50, dateOrdered: '2024-07-22', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't74', orderId: 'ORD-2024-063', employeeName: 'Rebecca Martinez', employeeEmail: 'rebecca.martinez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Chemical Resistant Gloves', surewerxPartNumber: 'SWX-CG-001', distributorPartNumber: '', quantity: 3, unitPrice: 21.99, totalPrice: 65.97, distributorCost: 16.50, dateOrdered: '2024-07-20', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't75', orderId: 'ORD-2024-064', employeeName: 'Matthew Taylor', employeeEmail: 'matthew.taylor@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-07-18', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't76', orderId: 'ORD-2024-065', employeeName: 'Ashley Anderson', employeeEmail: 'ashley.anderson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-07-15', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't77', orderId: 'ORD-2024-066', employeeName: 'Joshua White', employeeEmail: 'joshua.white@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-07-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't78', orderId: 'ORD-2024-067', employeeName: 'Megan Garcia', employeeEmail: 'megan.garcia@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-07-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't79', orderId: 'ORD-2024-068', employeeName: 'Nicholas Lee', employeeEmail: 'nicholas.lee@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-07-08', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't80', orderId: 'ORD-2024-069', employeeName: 'Jessica Rodriguez', employeeEmail: 'jessica.rodriguez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.50, dateOrdered: '2024-07-05', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't81', orderId: 'ORD-2024-070', employeeName: 'Benjamin Kim', employeeEmail: 'benjamin.kim@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Dust Mask - N95 (20pk)', surewerxPartNumber: 'SWX-DM-001', distributorPartNumber: '', quantity: 2, unitPrice: 24.99, totalPrice: 49.98, distributorCost: 18.50, dateOrdered: '2024-07-03', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't82', orderId: 'ORD-2024-071', employeeName: 'Lauren Moore', employeeEmail: 'lauren.moore@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Yellow', surewerxPartNumber: 'SWX-SV-005', distributorPartNumber: '', quantity: 4, unitPrice: 19.99, totalPrice: 79.96, distributorCost: 14.00, dateOrdered: '2024-07-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't83', orderId: 'ORD-2024-072', employeeName: 'Alexander Chen', employeeEmail: 'alexander.chen@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Composite Toe Boots - 8 inch', surewerxPartNumber: 'SWX-CT-001', distributorPartNumber: '', quantity: 1, unitPrice: 99.99, totalPrice: 99.99, distributorCost: 76.00, dateOrdered: '2024-06-28', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't84', orderId: 'ORD-2024-073', employeeName: 'Hannah Johnson', employeeEmail: 'hannah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Half Mask Respirator - Reusable', surewerxPartNumber: 'SWX-HM-001', distributorPartNumber: '', quantity: 2, unitPrice: 34.99, totalPrice: 69.98, distributorCost: 26.50, dateOrdered: '2024-06-25', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't85', orderId: 'ORD-2024-074', employeeName: 'Zachary Brown', employeeEmail: 'zachary.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Tinted', surewerxPartNumber: 'SWX-SG-002', distributorPartNumber: '', quantity: 3, unitPrice: 17.99, totalPrice: 53.97, distributorCost: 13.50, dateOrdered: '2024-06-22', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't86', orderId: 'ORD-2024-075', employeeName: 'Olivia Williams', employeeEmail: 'olivia.williams@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Ear Muffs - Standard', surewerxPartNumber: 'SWX-EM-001', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 17.00, dateOrdered: '2024-06-20', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't87', orderId: 'ORD-2024-076', employeeName: 'Nathan Thompson', employeeEmail: 'nathan.thompson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-06-18', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't88', orderId: 'ORD-2024-077', employeeName: 'Emma Miller', employeeEmail: 'emma.miller@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Rain Suit - 2 Piece', surewerxPartNumber: 'SWX-RS-001', distributorPartNumber: '', quantity: 2, unitPrice: 38.99, totalPrice: 77.98, distributorCost: 29.50, dateOrdered: '2024-06-15', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't89', orderId: 'ORD-2024-078', employeeName: 'Jacob Davis', employeeEmail: 'jacob.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Latex Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-LG-001', distributorPartNumber: '', quantity: 4, unitPrice: 15.99, totalPrice: 63.96, distributorCost: 11.50, dateOrdered: '2024-06-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't90', orderId: 'ORD-2024-079', employeeName: 'Grace Wilson', employeeEmail: 'grace.wilson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Face Shield - Full Coverage', surewerxPartNumber: 'SWX-FS-001', distributorPartNumber: '', quantity: 3, unitPrice: 28.99, totalPrice: 86.97, distributorCost: 21.00, dateOrdered: '2024-06-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't91', orderId: 'ORD-2024-080', employeeName: 'Logan Martinez', employeeEmail: 'logan.martinez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Welding Gloves - Heavy Duty', surewerxPartNumber: 'SWX-WG-002', distributorPartNumber: '', quantity: 2, unitPrice: 28.99, totalPrice: 57.98, distributorCost: 22.00, dateOrdered: '2024-06-08', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't92', orderId: 'ORD-2024-081', employeeName: 'Victoria Taylor', employeeEmail: 'victoria.taylor@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Cut Resistant Gloves - Level 5', surewerxPartNumber: 'SWX-CR-001', distributorPartNumber: '', quantity: 4, unitPrice: 24.99, totalPrice: 99.96, distributorCost: 18.50, dateOrdered: '2024-06-05', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't93', orderId: 'ORD-2024-082', employeeName: 'Cameron Anderson', employeeEmail: 'cameron.anderson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Chemical Resistant Gloves', surewerxPartNumber: 'SWX-CG-001', distributorPartNumber: '', quantity: 3, unitPrice: 21.99, totalPrice: 65.97, distributorCost: 16.50, dateOrdered: '2024-06-03', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't94', orderId: 'ORD-2024-083', employeeName: 'Sophia White', employeeEmail: 'sophia.white@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-06-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't95', orderId: 'ORD-2024-084', employeeName: 'Aiden Garcia', employeeEmail: 'aiden.garcia@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-05-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't96', orderId: 'ORD-2024-085', employeeName: 'Isabella Lee', employeeEmail: 'isabella.lee@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-05-25', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't97', orderId: 'ORD-2024-086', employeeName: 'Ethan Rodriguez', employeeEmail: 'ethan.rodriguez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-05-22', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't98', orderId: 'ORD-2024-087', employeeName: 'Madison Kim', employeeEmail: 'madison.kim@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-05-20', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't99', orderId: 'ORD-2024-088', employeeName: 'Noah Moore', employeeEmail: 'noah.moore@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.50, dateOrdered: '2024-05-18', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't100', orderId: 'ORD-2024-089', employeeName: 'Chloe Chen', employeeEmail: 'chloe.chen@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Dust Mask - N95 (20pk)', surewerxPartNumber: 'SWX-DM-001', distributorPartNumber: '', quantity: 2, unitPrice: 24.99, totalPrice: 49.98, distributorCost: 18.50, dateOrdered: '2024-05-15', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't101', orderId: 'ORD-2024-090', employeeName: 'Lucas Johnson', employeeEmail: 'lucas.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Yellow', surewerxPartNumber: 'SWX-SV-005', distributorPartNumber: '', quantity: 4, unitPrice: 19.99, totalPrice: 79.96, distributorCost: 14.00, dateOrdered: '2024-05-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't102', orderId: 'ORD-2024-091', employeeName: 'Ava Brown', employeeEmail: 'ava.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Composite Toe Boots - 8 inch', surewerxPartNumber: 'SWX-CT-001', distributorPartNumber: '', quantity: 1, unitPrice: 99.99, totalPrice: 99.99, distributorCost: 76.00, dateOrdered: '2024-05-10', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't103', orderId: 'ORD-2024-092', employeeName: 'Mason Williams', employeeEmail: 'mason.williams@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Half Mask Respirator - Reusable', surewerxPartNumber: 'SWX-HM-001', distributorPartNumber: '', quantity: 2, unitPrice: 34.99, totalPrice: 69.98, distributorCost: 26.50, dateOrdered: '2024-05-08', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't104', orderId: 'ORD-2024-093', employeeName: 'Harper Thompson', employeeEmail: 'harper.thompson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Tinted', surewerxPartNumber: 'SWX-SG-002', distributorPartNumber: '', quantity: 3, unitPrice: 17.99, totalPrice: 53.97, distributorCost: 13.50, dateOrdered: '2024-05-05', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't105', orderId: 'ORD-2024-094', employeeName: 'Liam Miller', employeeEmail: 'liam.miller@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Ear Muffs - Standard', surewerxPartNumber: 'SWX-EM-001', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 17.00, dateOrdered: '2024-05-03', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't106', orderId: 'ORD-2024-095', employeeName: 'Evelyn Davis', employeeEmail: 'evelyn.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-05-01', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't107', orderId: 'ORD-2024-096', employeeName: 'Henry Wilson', employeeEmail: 'henry.wilson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Rain Suit - 2 Piece', surewerxPartNumber: 'SWX-RS-001', distributorPartNumber: '', quantity: 2, unitPrice: 38.99, totalPrice: 77.98, distributorCost: 29.50, dateOrdered: '2024-04-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't108', orderId: 'ORD-2024-097', employeeName: 'Abigail Martinez', employeeEmail: 'abigail.martinez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Latex Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-LG-001', distributorPartNumber: '', quantity: 4, unitPrice: 15.99, totalPrice: 63.96, distributorCost: 11.50, dateOrdered: '2024-04-25', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't109', orderId: 'ORD-2024-098', employeeName: 'Sebastian Taylor', employeeEmail: 'sebastian.taylor@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Face Shield - Full Coverage', surewerxPartNumber: 'SWX-FS-001', distributorPartNumber: '', quantity: 3, unitPrice: 28.99, totalPrice: 86.97, distributorCost: 21.00, dateOrdered: '2024-04-22', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't110', orderId: 'ORD-2024-099', employeeName: 'Emily Anderson', employeeEmail: 'emily.anderson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Welding Gloves - Heavy Duty', surewerxPartNumber: 'SWX-WG-002', distributorPartNumber: '', quantity: 2, unitPrice: 28.99, totalPrice: 57.98, distributorCost: 22.00, dateOrdered: '2024-04-20', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't111', orderId: 'ORD-2024-100', employeeName: 'Jackson White', employeeEmail: 'jackson.white@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Cut Resistant Gloves - Level 5', surewerxPartNumber: 'SWX-CR-001', distributorPartNumber: '', quantity: 4, unitPrice: 24.99, totalPrice: 99.96, distributorCost: 18.50, dateOrdered: '2024-04-18', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't112', orderId: 'ORD-2024-101', employeeName: 'Scarlett Garcia', employeeEmail: 'scarlett.garcia@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Chemical Resistant Gloves', surewerxPartNumber: 'SWX-CG-001', distributorPartNumber: '', quantity: 3, unitPrice: 21.99, totalPrice: 65.97, distributorCost: 16.50, dateOrdered: '2024-04-15', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't113', orderId: 'ORD-2024-102', employeeName: 'Aria Lee', employeeEmail: 'aria.lee@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-04-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't114', orderId: 'ORD-2024-103', employeeName: 'Wyatt Rodriguez', employeeEmail: 'wyatt.rodriguez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-04-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't115', orderId: 'ORD-2024-104', employeeName: 'Layla Kim', employeeEmail: 'layla.kim@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-04-08', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't116', orderId: 'ORD-2024-105', employeeName: 'Carter Moore', employeeEmail: 'carter.moore@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-04-05', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't117', orderId: 'ORD-2024-106', employeeName: 'Zoey Chen', employeeEmail: 'zoey.chen@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-04-03', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't118', orderId: 'ORD-2024-107', employeeName: 'Owen Johnson', employeeEmail: 'owen.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.50, dateOrdered: '2024-04-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't119', orderId: 'ORD-2024-108', employeeName: 'Penelope Brown', employeeEmail: 'penelope.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Dust Mask - N95 (20pk)', surewerxPartNumber: 'SWX-DM-001', distributorPartNumber: '', quantity: 2, unitPrice: 24.99, totalPrice: 49.98, distributorCost: 18.50, dateOrdered: '2024-03-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't120', orderId: 'ORD-2024-109', employeeName: 'Luke Williams', employeeEmail: 'luke.williams@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Yellow', surewerxPartNumber: 'SWX-SV-005', distributorPartNumber: '', quantity: 4, unitPrice: 19.99, totalPrice: 79.96, distributorCost: 14.00, dateOrdered: '2024-03-25', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't121', orderId: 'ORD-2024-110', employeeName: 'Nora Thompson', employeeEmail: 'nora.thompson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Composite Toe Boots - 8 inch', surewerxPartNumber: 'SWX-CT-001', distributorPartNumber: '', quantity: 1, unitPrice: 99.99, totalPrice: 99.99, distributorCost: 76.00, dateOrdered: '2024-03-22', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't122', orderId: 'ORD-2024-111', employeeName: 'Jack Miller', employeeEmail: 'jack.miller@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Half Mask Respirator - Reusable', surewerxPartNumber: 'SWX-HM-001', distributorPartNumber: '', quantity: 2, unitPrice: 34.99, totalPrice: 69.98, distributorCost: 26.50, dateOrdered: '2024-03-20', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't123', orderId: 'ORD-2024-112', employeeName: 'Lillian Davis', employeeEmail: 'lillian.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Tinted', surewerxPartNumber: 'SWX-SG-002', distributorPartNumber: '', quantity: 3, unitPrice: 17.99, totalPrice: 53.97, distributorCost: 13.50, dateOrdered: '2024-03-18', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't124', orderId: 'ORD-2024-113', employeeName: 'Levi Wilson', employeeEmail: 'levi.wilson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Ear Muffs - Standard', surewerxPartNumber: 'SWX-EM-001', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 17.00, dateOrdered: '2024-03-15', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't125', orderId: 'ORD-2024-114', employeeName: 'Addison Martinez', employeeEmail: 'addison.martinez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-03-12', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't126', orderId: 'ORD-2024-115', employeeName: 'Stella Taylor', employeeEmail: 'stella.taylor@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Rain Suit - 2 Piece', surewerxPartNumber: 'SWX-RS-001', distributorPartNumber: '', quantity: 2, unitPrice: 38.99, totalPrice: 77.98, distributorCost: 29.50, dateOrdered: '2024-03-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't127', orderId: 'ORD-2024-116', employeeName: 'Hazel Anderson', employeeEmail: 'hazel.anderson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Latex Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-LG-001', distributorPartNumber: '', quantity: 4, unitPrice: 15.99, totalPrice: 63.96, distributorCost: 11.50, dateOrdered: '2024-03-08', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't128', orderId: 'ORD-2024-117', employeeName: 'Violet White', employeeEmail: 'violet.white@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Face Shield - Full Coverage', surewerxPartNumber: 'SWX-FS-001', distributorPartNumber: '', quantity: 3, unitPrice: 28.99, totalPrice: 86.97, distributorCost: 21.00, dateOrdered: '2024-03-05', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't129', orderId: 'ORD-2024-118', employeeName: 'Aurora Garcia', employeeEmail: 'aurora.garcia@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Welding Gloves - Heavy Duty', surewerxPartNumber: 'SWX-WG-002', distributorPartNumber: '', quantity: 2, unitPrice: 28.99, totalPrice: 57.98, distributorCost: 22.00, dateOrdered: '2024-03-03', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't130', orderId: 'ORD-2024-119', employeeName: 'Savannah Lee', employeeEmail: 'savannah.lee@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Cut Resistant Gloves - Level 5', surewerxPartNumber: 'SWX-CR-001', distributorPartNumber: '', quantity: 4, unitPrice: 24.99, totalPrice: 99.96, distributorCost: 18.50, dateOrdered: '2024-03-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't131', orderId: 'ORD-2024-120', employeeName: 'Audrey Rodriguez', employeeEmail: 'audrey.rodriguez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Chemical Resistant Gloves', surewerxPartNumber: 'SWX-CG-001', distributorPartNumber: '', quantity: 3, unitPrice: 21.99, totalPrice: 65.97, distributorCost: 16.50, dateOrdered: '2024-02-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't132', orderId: 'ORD-2024-121', employeeName: 'Brooklyn Kim', employeeEmail: 'brooklyn.kim@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-02-25', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't133', orderId: 'ORD-2024-122', employeeName: 'Bella Moore', employeeEmail: 'bella.moore@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-02-22', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't134', orderId: 'ORD-2024-123', employeeName: 'Claire Chen', employeeEmail: 'claire.chen@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-02-20', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't135', orderId: 'ORD-2024-124', employeeName: 'Skylar Johnson', employeeEmail: 'skylar.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-02-18', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't136', orderId: 'ORD-2024-125', employeeName: 'Lucy Brown', employeeEmail: 'lucy.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-02-15', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't137', orderId: 'ORD-2024-126', employeeName: 'Paisley Williams', employeeEmail: 'paisley.williams@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.50, dateOrdered: '2024-02-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't138', orderId: 'ORD-2024-127', employeeName: 'Everly Thompson', employeeEmail: 'everly.thompson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Dust Mask - N95 (20pk)', surewerxPartNumber: 'SWX-DM-001', distributorPartNumber: '', quantity: 2, unitPrice: 24.99, totalPrice: 49.98, distributorCost: 18.50, dateOrdered: '2024-02-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't139', orderId: 'ORD-2024-128', employeeName: 'Anna Miller', employeeEmail: 'anna.miller@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Yellow', surewerxPartNumber: 'SWX-SV-005', distributorPartNumber: '', quantity: 4, unitPrice: 19.99, totalPrice: 79.96, distributorCost: 14.00, dateOrdered: '2024-02-08', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't140', orderId: 'ORD-2024-129', employeeName: 'Caroline Davis', employeeEmail: 'caroline.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Composite Toe Boots - 8 inch', surewerxPartNumber: 'SWX-CT-001', distributorPartNumber: '', quantity: 1, unitPrice: 99.99, totalPrice: 99.99, distributorCost: 76.00, dateOrdered: '2024-02-05', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't141', orderId: 'ORD-2024-130', employeeName: 'Nova Wilson', employeeEmail: 'nova.wilson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Half Mask Respirator - Reusable', surewerxPartNumber: 'SWX-HM-001', distributorPartNumber: '', quantity: 2, unitPrice: 34.99, totalPrice: 69.98, distributorCost: 26.50, dateOrdered: '2024-02-03', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't142', orderId: 'ORD-2024-131', employeeName: 'Genesis Martinez', employeeEmail: 'genesis.martinez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Tinted', surewerxPartNumber: 'SWX-SG-002', distributorPartNumber: '', quantity: 3, unitPrice: 17.99, totalPrice: 53.97, distributorCost: 13.50, dateOrdered: '2024-02-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't143', orderId: 'ORD-2024-132', employeeName: 'Aaliyah Taylor', employeeEmail: 'aaliyah.taylor@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Ear Muffs - Standard', surewerxPartNumber: 'SWX-EM-001', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 17.00, dateOrdered: '2024-01-28', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't144', orderId: 'ORD-2024-133', employeeName: 'Kennedy Anderson', employeeEmail: 'kennedy.anderson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-01-25', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't145', orderId: 'ORD-2024-134', employeeName: 'Kinsley White', employeeEmail: 'kinsley.white@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Rain Suit - 2 Piece', surewerxPartNumber: 'SWX-RS-001', distributorPartNumber: '', quantity: 2, unitPrice: 38.99, totalPrice: 77.98, distributorCost: 29.50, dateOrdered: '2024-01-22', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't146', orderId: 'ORD-2024-135', employeeName: 'Allison Garcia', employeeEmail: 'allison.garcia@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Latex Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-LG-001', distributorPartNumber: '', quantity: 4, unitPrice: 15.99, totalPrice: 63.96, distributorCost: 11.50, dateOrdered: '2024-01-20', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't147', orderId: 'ORD-2024-136', employeeName: 'Maya Lee', employeeEmail: 'maya.lee@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Face Shield - Full Coverage', surewerxPartNumber: 'SWX-FS-001', distributorPartNumber: '', quantity: 3, unitPrice: 28.99, totalPrice: 86.97, distributorCost: 21.00, dateOrdered: '2024-01-18', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't148', orderId: 'ORD-2024-137', employeeName: 'Willow Rodriguez', employeeEmail: 'willow.rodriguez@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Welding Gloves - Heavy Duty', surewerxPartNumber: 'SWX-WG-002', distributorPartNumber: '', quantity: 2, unitPrice: 28.99, totalPrice: 57.98, distributorCost: 22.00, dateOrdered: '2024-01-15', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't149', orderId: 'ORD-2024-138', employeeName: 'Naomi Kim', employeeEmail: 'naomi.kim@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Cut Resistant Gloves - Level 5', surewerxPartNumber: 'SWX-CR-001', distributorPartNumber: '', quantity: 4, unitPrice: 24.99, totalPrice: 99.96, distributorCost: 18.50, dateOrdered: '2024-01-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't150', orderId: 'ORD-2024-139', employeeName: 'Aria Moore', employeeEmail: 'aria.moore@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Chemical Resistant Gloves', surewerxPartNumber: 'SWX-CG-001', distributorPartNumber: '', quantity: 3, unitPrice: 21.99, totalPrice: 65.97, distributorCost: 16.50, dateOrdered: '2024-01-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't151', orderId: 'ORD-2024-140', employeeName: 'Elena Chen', employeeEmail: 'elena.chen@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-01-08', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't152', orderId: 'ORD-2024-141', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-01-05', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't153', orderId: 'ORD-2024-142', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-01-03', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't154', orderId: 'ORD-2024-143', employeeName: 'Michael Brown', employeeEmail: 'michael.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-01-01', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      // Additional transactions for other partners
      // Manufacturing Corp - adding 5 more employees
      { id: 't155', orderId: 'ORD-2024-200', employeeName: 'Jennifer Adams', employeeEmail: 'jennifer.adams@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-11-10', voucherUsed: 'Safety Equipment Fund', voucherAmount: 100.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't156', orderId: 'ORD-2024-201', employeeName: 'Robert Johnson', employeeEmail: 'robert.johnson@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-11-08', voucherUsed: 'Safety Equipment Fund', voucherAmount: 100.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't157', orderId: 'ORD-2024-202', employeeName: 'Patricia Williams', employeeEmail: 'patricia.williams@manufacturing.com', employeeGroup: 'Maintenance', customerName: 'Manufacturing Corp', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-11-05', voucherUsed: 'Safety Equipment Fund', voucherAmount: 100.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't158', orderId: 'ORD-2024-203', employeeName: 'William Brown', employeeEmail: 'william.brown@manufacturing.com', employeeGroup: 'Quality Control', customerName: 'Manufacturing Corp', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-11-03', voucherUsed: 'Safety Equipment Fund', voucherAmount: 100.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't159', orderId: 'ORD-2024-204', employeeName: 'Linda Martinez', employeeEmail: 'linda.martinez@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-11-01', voucherUsed: 'Safety Equipment Fund', voucherAmount: 100.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      // Construction Services - adding 5 more employees
      { id: 't160', orderId: 'ORD-2024-300', employeeName: 'Christopher Anderson', employeeEmail: 'christopher.anderson@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Hard Hat - Full Brim', surewerxPartNumber: 'SWX-HH-006', distributorPartNumber: '', quantity: 1, unitPrice: 32.99, totalPrice: 32.99, distributorCost: 25.00, dateOrdered: '2024-11-12', voucherUsed: 'PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't161', orderId: 'ORD-2024-301', employeeName: 'Amanda Taylor', employeeEmail: 'amanda.taylor@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Work Gloves - Cowhide', surewerxPartNumber: 'SWX-GL-004', distributorPartNumber: '', quantity: 5, unitPrice: 14.99, totalPrice: 74.95, distributorCost: 11.00, dateOrdered: '2024-11-10', voucherUsed: 'PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't162', orderId: 'ORD-2024-302', employeeName: 'Daniel White', employeeEmail: 'daniel.white@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Reflective Vest - Class 3', surewerxPartNumber: 'SWX-RV-001', distributorPartNumber: '', quantity: 2, unitPrice: 29.99, totalPrice: 59.98, distributorCost: 22.50, dateOrdered: '2024-11-08', voucherUsed: 'PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't163', orderId: 'ORD-2024-303', employeeName: 'Michelle Garcia', employeeEmail: 'michelle.garcia@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Safety Glasses - Tinted', surewerxPartNumber: 'SWX-SG-002', distributorPartNumber: '', quantity: 3, unitPrice: 17.99, totalPrice: 53.97, distributorCost: 13.50, dateOrdered: '2024-11-05', voucherUsed: 'PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't164', orderId: 'ORD-2024-304', employeeName: 'Kevin Rodriguez', employeeEmail: 'kevin.rodriguez@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-11-03', voucherUsed: 'PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      // Healthcare Systems Ltd - adding 5 employees
      { id: 't165', orderId: 'ORD-2024-400', employeeName: 'Dr. Sarah Thompson', employeeEmail: 'sarah.thompson@healthcare.com', employeeGroup: 'Clinical Staff', customerName: 'Healthcare Systems Ltd', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.50, dateOrdered: '2024-11-15', voucherUsed: 'Healthcare PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't166', orderId: 'ORD-2024-401', employeeName: 'Dr. James Wilson', employeeEmail: 'james.wilson@healthcare.com', employeeGroup: 'Clinical Staff', customerName: 'Healthcare Systems Ltd', productName: 'Latex Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-LG-001', distributorPartNumber: '', quantity: 4, unitPrice: 15.99, totalPrice: 63.96, distributorCost: 11.50, dateOrdered: '2024-11-12', voucherUsed: 'Healthcare PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't167', orderId: 'ORD-2024-402', employeeName: 'Nurse Maria Lopez', employeeEmail: 'maria.lopez@healthcare.com', employeeGroup: 'Clinical Staff', customerName: 'Healthcare Systems Ltd', productName: 'Dust Mask - N95 (20pk)', surewerxPartNumber: 'SWX-DM-001', distributorPartNumber: '', quantity: 2, unitPrice: 24.99, totalPrice: 49.98, distributorCost: 18.50, dateOrdered: '2024-11-10', voucherUsed: 'Healthcare PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't168', orderId: 'ORD-2024-403', employeeName: 'Dr. Robert Kim', employeeEmail: 'robert.kim@healthcare.com', employeeGroup: 'Clinical Staff', customerName: 'Healthcare Systems Ltd', productName: 'Half Mask Respirator - Reusable', surewerxPartNumber: 'SWX-HM-001', distributorPartNumber: '', quantity: 2, unitPrice: 34.99, totalPrice: 69.98, distributorCost: 26.50, dateOrdered: '2024-11-08', voucherUsed: 'Healthcare PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't169', orderId: 'ORD-2024-404', employeeName: 'Nurse Jennifer Park', employeeEmail: 'jennifer.park@healthcare.com', employeeGroup: 'Clinical Staff', customerName: 'Healthcare Systems Ltd', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-11-05', voucherUsed: 'Healthcare PPE Allowance', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      // Energy Solutions Group - adding 5 employees
      { id: 't170', orderId: 'ORD-2024-500', employeeName: 'Mark Thompson', employeeEmail: 'mark.thompson@energy.com', employeeGroup: 'Field Operations', customerName: 'Energy Solutions Group', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-11-14', voucherUsed: 'Field Safety Equipment', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't171', orderId: 'ORD-2024-501', employeeName: 'Susan Davis', employeeEmail: 'susan.davis@energy.com', employeeGroup: 'Field Operations', customerName: 'Energy Solutions Group', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-11-12', voucherUsed: 'Field Safety Equipment', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't172', orderId: 'ORD-2024-502', employeeName: 'Thomas Miller', employeeEmail: 'thomas.miller@energy.com', employeeGroup: 'Maintenance Team', customerName: 'Energy Solutions Group', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-11-10', voucherUsed: 'Maintenance PPE Budget', voucherAmount: 250.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't173', orderId: 'ORD-2024-503', employeeName: 'Nancy Anderson', employeeEmail: 'nancy.anderson@energy.com', employeeGroup: 'Field Operations', customerName: 'Energy Solutions Group', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-11-08', voucherUsed: 'Field Safety Equipment', voucherAmount: 300.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't174', orderId: 'ORD-2024-504', employeeName: 'Charles Lee', employeeEmail: 'charles.lee@energy.com', employeeGroup: 'Maintenance Team', customerName: 'Energy Solutions Group', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-11-05', voucherUsed: 'Maintenance PPE Budget', voucherAmount: 250.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      // Logistics & Transport Co - adding 5 employees
      { id: 't175', orderId: 'ORD-2024-600', employeeName: 'Steven Brown', employeeEmail: 'steven.brown@logistics.com', employeeGroup: 'Drivers', customerName: 'Logistics & Transport Co', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-11-13', voucherUsed: 'Driver Safety Allowance', voucherAmount: 180.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't176', orderId: 'ORD-2024-601', employeeName: 'Karen Martinez', employeeEmail: 'karen.martinez@logistics.com', employeeGroup: 'Drivers', customerName: 'Logistics & Transport Co', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-11-11', voucherUsed: 'Driver Safety Allowance', voucherAmount: 180.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't177', orderId: 'ORD-2024-602', employeeName: 'Paul Johnson', employeeEmail: 'paul.johnson@logistics.com', employeeGroup: 'Warehouse Staff', customerName: 'Logistics & Transport Co', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-11-09', voucherUsed: 'Warehouse PPE Fund', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't178', orderId: 'ORD-2024-603', employeeName: 'Betty White', employeeEmail: 'betty.white@logistics.com', employeeGroup: 'Drivers', customerName: 'Logistics & Transport Co', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-11-07', voucherUsed: 'Driver Safety Allowance', voucherAmount: 180.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't179', orderId: 'ORD-2024-604', employeeName: 'Frank Garcia', employeeEmail: 'frank.garcia@logistics.com', employeeGroup: 'Warehouse Staff', customerName: 'Logistics & Transport Co', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-11-05', voucherUsed: 'Warehouse PPE Fund', voucherAmount: 200.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      // Food Processing Industries - adding 5 employees
      { id: 't180', orderId: 'ORD-2024-700', employeeName: 'Joseph Smith', employeeEmail: 'joseph.smith@foodprocessing.com', employeeGroup: 'Production Line', customerName: 'Food Processing Industries', productName: 'Latex Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-LG-001', distributorPartNumber: '', quantity: 4, unitPrice: 15.99, totalPrice: 63.96, distributorCost: 11.50, dateOrdered: '2024-11-16', voucherUsed: 'Production Safety Equipment', voucherAmount: 175.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't181', orderId: 'ORD-2024-701', employeeName: 'Carol Johnson', employeeEmail: 'carol.johnson@foodprocessing.com', employeeGroup: 'Production Line', customerName: 'Food Processing Industries', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.50, dateOrdered: '2024-11-14', voucherUsed: 'Production Safety Equipment', voucherAmount: 175.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't182', orderId: 'ORD-2024-702', employeeName: 'Gary Williams', employeeEmail: 'gary.williams@foodprocessing.com', employeeGroup: 'Quality Control', customerName: 'Food Processing Industries', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-11-12', voucherUsed: 'QC Lab Equipment', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't183', orderId: 'ORD-2024-703', employeeName: 'Donna Brown', employeeEmail: 'donna.brown@foodprocessing.com', employeeGroup: 'Production Line', customerName: 'Food Processing Industries', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-11-10', voucherUsed: 'Production Safety Equipment', voucherAmount: 175.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't184', orderId: 'ORD-2024-704', employeeName: 'Ronald Davis', employeeEmail: 'ronald.davis@foodprocessing.com', employeeGroup: 'Quality Control', customerName: 'Food Processing Industries', productName: 'Dust Mask - N95 (20pk)', surewerxPartNumber: 'SWX-DM-001', distributorPartNumber: '', quantity: 2, unitPrice: 24.99, totalPrice: 49.98, distributorCost: 18.50, dateOrdered: '2024-11-08', voucherUsed: 'QC Lab Equipment', voucherAmount: 150.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      // Automotive Parts Manufacturing - adding 5 employees
      { id: 't185', orderId: 'ORD-2024-800', employeeName: 'Brian Wilson', employeeEmail: 'brian.wilson@autoparts.com', employeeGroup: 'Assembly Line', customerName: 'Automotive Parts Manufacturing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-11-15', voucherUsed: 'Assembly Line Safety', voucherAmount: 220.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't186', orderId: 'ORD-2024-801', employeeName: 'Sharon Martinez', employeeEmail: 'sharon.martinez@autoparts.com', employeeGroup: 'Assembly Line', customerName: 'Automotive Parts Manufacturing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-11-13', voucherUsed: 'Assembly Line Safety', voucherAmount: 220.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't187', orderId: 'ORD-2024-802', employeeName: 'Kenneth Taylor', employeeEmail: 'kenneth.taylor@autoparts.com', employeeGroup: 'Welding Department', customerName: 'Automotive Parts Manufacturing', productName: 'Welding Gloves - Heavy Duty', surewerxPartNumber: 'SWX-WG-002', distributorPartNumber: '', quantity: 2, unitPrice: 28.99, totalPrice: 57.98, distributorCost: 22.00, dateOrdered: '2024-11-11', voucherUsed: 'Welding PPE Budget', voucherAmount: 250.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't188', orderId: 'ORD-2024-803', employeeName: 'Deborah Anderson', employeeEmail: 'deborah.anderson@autoparts.com', employeeGroup: 'Welding Department', customerName: 'Automotive Parts Manufacturing', productName: 'Face Shield - Full Coverage', surewerxPartNumber: 'SWX-FS-001', distributorPartNumber: '', quantity: 3, unitPrice: 28.99, totalPrice: 86.97, distributorCost: 21.00, dateOrdered: '2024-11-09', voucherUsed: 'Welding PPE Budget', voucherAmount: 250.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't189', orderId: 'ORD-2024-804', employeeName: 'George Thomas', employeeEmail: 'george.thomas@autoparts.com', employeeGroup: 'Assembly Line', customerName: 'Automotive Parts Manufacturing', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-11-07', voucherUsed: 'Assembly Line Safety', voucherAmount: 220.00, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      // Additional mixed payment transactions (voucher + credit card)
      { id: 't190', orderId: 'ORD-2024-026', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Composite Toe Boots - 8 inch', surewerxPartNumber: 'SWX-CT-001', distributorPartNumber: '', quantity: 1, unitPrice: 99.99, totalPrice: 99.99, distributorCost: 76.00, dateOrdered: '2024-11-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 50.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't191', orderId: 'ORD-2024-026', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Goggles - Anti-Fog', surewerxPartNumber: 'SWX-SG-003', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 16.00, dateOrdered: '2024-11-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 50.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't192', orderId: 'ORD-2024-027', employeeName: 'Mike Davis', employeeEmail: 'mike.davis@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-11-11', voucherUsed: 'Safety Equipment Fund', voucherAmount: 40.00, lineStatus: 'Processing', paymentMethod: 'Mixed' },
      { id: 't193', orderId: 'ORD-2024-027', employeeName: 'Mike Davis', employeeEmail: 'mike.davis@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-11-11', voucherUsed: 'Safety Equipment Fund', voucherAmount: 40.00, lineStatus: 'Processing', paymentMethod: 'Mixed' },
      { id: 't194', orderId: 'ORD-2024-027', employeeName: 'Mike Davis', employeeEmail: 'mike.davis@manufacturing.com', employeeGroup: 'Production Floor', customerName: 'Manufacturing Corp', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 2, unitPrice: 12.99, totalPrice: 25.98, distributorCost: 9.00, dateOrdered: '2024-11-11', voucherUsed: 'Safety Equipment Fund', voucherAmount: 40.00, lineStatus: 'Processing', paymentMethod: 'Mixed' },
      { id: 't195', orderId: 'ORD-2024-028', employeeName: 'Robert Martinez', employeeEmail: 'robert.martinez@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-11-09', voucherUsed: 'PPE Allowance', voucherAmount: 60.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't196', orderId: 'ORD-2024-028', employeeName: 'Robert Martinez', employeeEmail: 'robert.martinez@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Reflective Vest - Class 3', surewerxPartNumber: 'SWX-RV-001', distributorPartNumber: '', quantity: 1, unitPrice: 29.99, totalPrice: 29.99, distributorCost: 22.50, dateOrdered: '2024-11-09', voucherUsed: 'PPE Allowance', voucherAmount: 60.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't197', orderId: 'ORD-2024-029', employeeName: 'Lisa Chen', employeeEmail: 'lisa.chen@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Hard Hat - Full Brim', surewerxPartNumber: 'SWX-HH-006', distributorPartNumber: '', quantity: 1, unitPrice: 32.99, totalPrice: 32.99, distributorCost: 25.00, dateOrdered: '2024-11-08', voucherUsed: 'PPE Allowance', voucherAmount: 25.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't198', orderId: 'ORD-2024-029', employeeName: 'Lisa Chen', employeeEmail: 'lisa.chen@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Work Gloves - Cowhide', surewerxPartNumber: 'SWX-GL-004', distributorPartNumber: '', quantity: 4, unitPrice: 14.99, totalPrice: 59.96, distributorCost: 11.00, dateOrdered: '2024-11-08', voucherUsed: 'PPE Allowance', voucherAmount: 25.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't199', orderId: 'ORD-2024-030', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.00, dateOrdered: '2024-11-07', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 30.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't200', orderId: 'ORD-2024-030', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.50, dateOrdered: '2024-11-07', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 30.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't201', orderId: 'ORD-2024-031', employeeName: 'Anna Rodriguez', employeeEmail: 'anna.rodriguez@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Safety Glasses - Tinted', surewerxPartNumber: 'SWX-SG-002', distributorPartNumber: '', quantity: 4, unitPrice: 17.99, totalPrice: 71.96, distributorCost: 13.50, dateOrdered: '2024-11-06', voucherUsed: 'PPE Allowance', voucherAmount: 45.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't202', orderId: 'ORD-2024-031', employeeName: 'Anna Rodriguez', employeeEmail: 'anna.rodriguez@construction.com', employeeGroup: 'Site Workers', customerName: 'Construction Services', productName: 'Ear Muffs - Standard', surewerxPartNumber: 'SWX-EM-001', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 17.00, dateOrdered: '2024-11-06', voucherUsed: 'PPE Allowance', voucherAmount: 45.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't203', orderId: 'ORD-2024-032', employeeName: 'Tom Wilson', employeeEmail: 'tom.wilson@manufacturing.com', employeeGroup: 'Maintenance', customerName: 'Manufacturing Corp', productName: 'Welding Gloves - Heavy Duty', surewerxPartNumber: 'SWX-WG-002', distributorPartNumber: '', quantity: 3, unitPrice: 28.99, totalPrice: 86.97, distributorCost: 22.00, dateOrdered: '2024-11-05', voucherUsed: 'Safety Equipment Fund', voucherAmount: 50.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      { id: 't204', orderId: 'ORD-2024-032', employeeName: 'Tom Wilson', employeeEmail: 'tom.wilson@manufacturing.com', employeeGroup: 'Maintenance', customerName: 'Manufacturing Corp', productName: 'Face Shield - Full Coverage', surewerxPartNumber: 'SWX-FS-001', distributorPartNumber: '', quantity: 1, unitPrice: 28.99, totalPrice: 28.99, distributorCost: 21.00, dateOrdered: '2024-11-05', voucherUsed: 'Safety Equipment Fund', voucherAmount: 50.00, lineStatus: 'Shipped', paymentMethod: 'Mixed' },
      // Boeing orders with multiple vouchers applied to different line items
      { id: 't205', orderId: 'ORD-2024-133', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Clear Lens', surewerxPartNumber: 'SWX-SG-001', distributorPartNumber: '', quantity: 2, unitPrice: 15.99, totalPrice: 31.98, distributorCost: 12.00, dateOrdered: '2024-11-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 31.98, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't206', orderId: 'ORD-2024-133', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Hard Hat - Yellow', surewerxPartNumber: 'SWX-HH-002', distributorPartNumber: '', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, distributorCost: 18.50, dateOrdered: '2024-11-12', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 24.99, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't207', orderId: 'ORD-2024-133', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Steel Toe Boots - 6 inch', surewerxPartNumber: 'SWX-ST-001', distributorPartNumber: '', quantity: 1, unitPrice: 89.99, totalPrice: 89.99, distributorCost: 68.00, dateOrdered: '2024-11-12', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 89.99, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't208', orderId: 'ORD-2024-133', employeeName: 'John Smith', employeeEmail: 'john.smith@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Work Gloves - Leather', surewerxPartNumber: 'SWX-GL-003', distributorPartNumber: '', quantity: 3, unitPrice: 12.99, totalPrice: 38.97, distributorCost: 9.00, dateOrdered: '2024-11-12', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 38.97, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't209', orderId: 'ORD-2024-134', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Vest - Hi-Vis Orange', surewerxPartNumber: 'SWX-SV-004', distributorPartNumber: '', quantity: 2, unitPrice: 19.99, totalPrice: 39.98, distributorCost: 14.00, dateOrdered: '2024-11-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 39.98, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't210', orderId: 'ORD-2024-134', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Nitrile Gloves - Disposable (100pk)', surewerxPartNumber: 'SWX-NG-001', distributorPartNumber: '', quantity: 3, unitPrice: 19.99, totalPrice: 59.97, distributorCost: 14.50, dateOrdered: '2024-11-10', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 59.97, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't211', orderId: 'ORD-2024-134', employeeName: 'Sarah Johnson', employeeEmail: 'sarah.johnson@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Composite Toe Boots - 8 inch', surewerxPartNumber: 'SWX-CT-001', distributorPartNumber: '', quantity: 1, unitPrice: 99.99, totalPrice: 99.99, distributorCost: 76.00, dateOrdered: '2024-11-10', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 99.99, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't212', orderId: 'ORD-2024-135', employeeName: 'Michael Brown', employeeEmail: 'michael.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Dust Mask - N95 (20pk)', surewerxPartNumber: 'SWX-DM-001', distributorPartNumber: '', quantity: 2, unitPrice: 24.99, totalPrice: 49.98, distributorCost: 18.50, dateOrdered: '2024-11-08', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 49.98, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't213', orderId: 'ORD-2024-135', employeeName: 'Michael Brown', employeeEmail: 'michael.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Half Mask Respirator - Reusable', surewerxPartNumber: 'SWX-HM-001', distributorPartNumber: '', quantity: 2, unitPrice: 34.99, totalPrice: 69.98, distributorCost: 26.50, dateOrdered: '2024-11-08', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 69.98, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't214', orderId: 'ORD-2024-135', employeeName: 'Michael Brown', employeeEmail: 'michael.brown@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Winter Work Boots - Insulated', surewerxPartNumber: 'SWX-WB-001', distributorPartNumber: '', quantity: 1, unitPrice: 119.99, totalPrice: 119.99, distributorCost: 91.00, dateOrdered: '2024-11-08', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 119.99, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't215', orderId: 'ORD-2024-136', employeeName: 'Emily Davis', employeeEmail: 'emily.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Safety Glasses - Tinted', surewerxPartNumber: 'SWX-SG-002', distributorPartNumber: '', quantity: 3, unitPrice: 17.99, totalPrice: 53.97, distributorCost: 13.50, dateOrdered: '2024-11-05', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 53.97, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't216', orderId: 'ORD-2024-136', employeeName: 'Emily Davis', employeeEmail: 'emily.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Ear Muffs - Standard', surewerxPartNumber: 'SWX-EM-001', distributorPartNumber: '', quantity: 2, unitPrice: 22.99, totalPrice: 45.98, distributorCost: 17.00, dateOrdered: '2024-11-05', voucherUsed: 'Monthly Safety Allowance', voucherAmount: 45.98, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't217', orderId: 'ORD-2024-136', employeeName: 'Emily Davis', employeeEmail: 'emily.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Face Shield - Full Coverage', surewerxPartNumber: 'SWX-FS-001', distributorPartNumber: '', quantity: 3, unitPrice: 28.99, totalPrice: 86.97, distributorCost: 21.00, dateOrdered: '2024-11-05', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 86.97, lineStatus: 'Shipped', paymentMethod: 'Voucher' },
      { id: 't218', orderId: 'ORD-2024-136', employeeName: 'Emily Davis', employeeEmail: 'emily.davis@boeing.com', employeeGroup: 'Safety Team', customerName: 'Boeing', productName: 'Welding Gloves - Heavy Duty', surewerxPartNumber: 'SWX-WG-002', distributorPartNumber: '', quantity: 2, unitPrice: 28.99, totalPrice: 57.98, distributorCost: 22.00, dateOrdered: '2024-11-05', voucherUsed: 'Quarterly PPE Budget', voucherAmount: 57.98, lineStatus: 'Shipped', paymentMethod: 'Voucher' }
    ];
  },
  
  // Populate employees from transactions
  populateEmployeesFromTransactions: function() {
    var self = this;
    
    this.customers.forEach(function(customer) {
      // First, ensure all existing employees have at least one identifier and one date
      if (customer.employees && customer.employees.length > 0) {
        customer.employees.forEach(function(emp) {
          // Ensure at least one identifier (Employee ID or Username)
          if (!emp.employeeId && !emp.username) {
            // Prefer username (from email) if available, otherwise generate employee ID
            if (emp.email) {
              emp.username = emp.email.split('@')[0];
            } else {
              var prefix = customer.id === 'p1' ? 'EMP' : 
                          customer.id === 'p2' ? 'MFG' :
                          customer.id === 'p3' ? 'CON' :
                          customer.id === 'p4' ? 'HC' :
                          customer.id === 'p5' ? 'EN' :
                          customer.id === 'p6' ? 'LT' :
                          customer.id === 'p7' ? 'FP' :
                          customer.id === 'p8' ? 'AP' : 'EMP';
              var num = customer.employees.indexOf(emp) + 1;
              emp.employeeId = prefix + '-' + String(num).padStart(3, '0');
            }
          }
          
          // Ensure at least one date (Birth Date or Start Date)
          if (!emp.dateOfBirth && !emp.startDate) {
            // Prefer start date (more common), otherwise use birth date
            var yearsAgo = Math.floor(Math.random() * 5);
            var startYear = new Date().getFullYear() - yearsAgo;
            var startMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            var startDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            emp.startDate = startYear + '-' + startMonth + '-' + startDay;
          }
          
          // Also ensure required fields are present if customer config requires them
          if (customer.employeeFieldConfig && customer.employeeFieldConfig.requireDateOfBirth && !emp.dateOfBirth) {
            var age = 25 + Math.floor(Math.random() * 40);
            var birthYear = new Date().getFullYear() - age;
            var birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            var birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            emp.dateOfBirth = birthYear + '-' + birthMonth + '-' + birthDay;
          }
          
          if (customer.employeeFieldConfig && customer.employeeFieldConfig.requireStartDate && !emp.startDate) {
            var yearsAgo = Math.floor(Math.random() * 5);
            var startYear = new Date().getFullYear() - yearsAgo;
            var startMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            var startDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            emp.startDate = startYear + '-' + startMonth + '-' + startDay;
          }
        });
      }
      
      // Get unique employees from transactions for this customer
      var customerTransactions = self.transactions.filter(function(t) {
        return t.customerName === customer.name;
      });
      
      // If no transactions, skip
      if (customerTransactions.length === 0) {
        return;
      }
      
      // Create a map of unique employees by email
      var employeeMap = new Map();
      customerTransactions.forEach(function(t) {
        var email = t.employeeEmail;
        var name = t.employeeName;
        var groupName = t.employeeGroup;
        
        if (email && !employeeMap.has(email.toLowerCase())) {
          // Find or create a department for this employee
          var departmentId = null;
          var locationId = null;
          if (customer.locations && customer.locations.length > 0) {
            for (var locIdx = 0; locIdx < customer.locations.length; locIdx++) {
              var loc = customer.locations[locIdx];
              if (loc.departments) {
                var dept = loc.departments.find(function(d) { return d.name === groupName; });
                if (dept) {
                  departmentId = dept.id;
                  locationId = loc.id;
                  break;
                }
              }
            }
            // If not found, use first available department
            if (!departmentId) {
              for (var locIdx2 = 0; locIdx2 < customer.locations.length; locIdx2++) {
                var loc2 = customer.locations[locIdx2];
                if (loc2.departments && loc2.departments.length > 0) {
                  departmentId = loc2.departments[0].id;
                  locationId = loc2.id;
                  break;
                }
              }
            }
          }
          
          // Parse name
          var nameParts = name.split(' ');
          var firstName = nameParts[0] || '';
          var lastName = nameParts.slice(1).join(' ') || '';
          
          employeeMap.set(email.toLowerCase(), {
            email: email,
            name: name,
            firstName: firstName,
            lastName: lastName,
            departmentId: departmentId,
            locationId: locationId,
            employeeGroup: groupName
          });
        }
      });
      
      // Get existing employee emails
      var existingEmails = new Set();
      if (customer.employees && customer.employees.length > 0) {
        customer.employees.forEach(function(emp) {
          if (emp.email) {
            existingEmails.add(emp.email.toLowerCase());
          }
        });
      }
      
      // Add employees from transactions that don't already exist
      var newEmployees = [];
      employeeMap.forEach(function(empData, email) {
        if (!existingEmails.has(email)) {
          // Generate employee ID if required
          var employeeId = null;
          if (customer.employeeFieldConfig && customer.employeeFieldConfig.requireEmployeeId) {
            var prefix = customer.id === 'p1' ? 'EMP' : 
                        customer.id === 'p2' ? 'MFG' :
                        customer.id === 'p3' ? 'CON' :
                        customer.id === 'p4' ? 'HC' :
                        customer.id === 'p5' ? 'EN' :
                        customer.id === 'p6' ? 'LT' :
                        customer.id === 'p7' ? 'FP' :
                        customer.id === 'p8' ? 'AP' : 'EMP';
            var num = (customer.employees ? customer.employees.length : 0) + newEmployees.length + 1;
            employeeId = prefix + '-' + String(num).padStart(3, '0');
          }
          
          // Get first available department if no departmentId specified (for mock data generation)
          var departmentId = empData.departmentId;
          var locationId = empData.locationId;
          if (!departmentId && customer.locations && customer.locations.length > 0) {
            for (var i = 0; i < customer.locations.length; i++) {
              var loc = customer.locations[i];
              if (loc.departments && loc.departments.length > 0) {
                departmentId = loc.departments[0].id;
                locationId = loc.id;
                break;
              }
            }
          }
          
          // Get voucher balances if vouchers exist
          var voucherBalances = [];
          var remainingBalance = 0;
          if (customer.vouchers && customer.vouchers.length > 0 && departmentId) {
            var activeVouchers = customer.vouchers.filter(function(v) { 
              if (!v.isActive) return false;
              if (v.departmentId === departmentId) {
                if (locationId && v.locationId) {
                  return v.locationId === locationId;
                }
                return !locationId && !v.locationId;
              }
              return false;
            });
            activeVouchers.forEach(function(v) {
                voucherBalances.push({
                  voucherId: v.id,
                  remainingAmount: v.defaultAmount || 0
                });
                remainingBalance += (v.defaultAmount || 0);
            });
          }
          
          var newEmployee = {
            id: 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: empData.name,
            firstName: empData.firstName,
            lastName: empData.lastName,
            email: empData.email,
            departmentId: departmentId,
            locationId: locationId,
            voucherExpiry: customer.vouchers && customer.vouchers.length > 0 ? customer.vouchers[0].endDate : '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: remainingBalance,
            voucherBalances: voucherBalances,
            status: 'active'
          };
          
          // Ensure at least one identifier (Employee ID or Username)
          if (employeeId) {
            newEmployee.employeeId = employeeId;
          }
          
          // Add username if required OR if no employee ID (to ensure at least one identifier)
          if (customer.employeeFieldConfig && customer.employeeFieldConfig.requireUsername) {
            var username = empData.email.split('@')[0];
            newEmployee.username = username;
          } else if (!employeeId) {
            // If no employee ID and username not required, add username anyway to ensure at least one identifier
            var username = empData.email.split('@')[0];
            newEmployee.username = username;
          }
          
          // Ensure at least one date (Birth Date or Start Date)
          var hasDate = false;
          
          // Add date of birth if required
          if (customer.employeeFieldConfig && customer.employeeFieldConfig.requireDateOfBirth) {
            // Generate a random date of birth (age between 25-65)
            var age = 25 + Math.floor(Math.random() * 40);
            var birthYear = new Date().getFullYear() - age;
            var birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            var birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            newEmployee.dateOfBirth = birthYear + '-' + birthMonth + '-' + birthDay;
            hasDate = true;
          }
          
          // Add start date if required
          if (customer.employeeFieldConfig && customer.employeeFieldConfig.requireStartDate) {
            // Generate a random start date (within last 5 years)
            var yearsAgo = Math.floor(Math.random() * 5);
            var startYear = new Date().getFullYear() - yearsAgo;
            var startMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            var startDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            newEmployee.startDate = startYear + '-' + startMonth + '-' + startDay;
            hasDate = true;
          }
          
          // If no date was added yet, add a start date to ensure at least one date
          if (!hasDate) {
            var yearsAgo = Math.floor(Math.random() * 5);
            var startYear = new Date().getFullYear() - yearsAgo;
            var startMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            var startDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            newEmployee.startDate = startYear + '-' + startMonth + '-' + startDay;
          }
          
          newEmployees.push(newEmployee);
        }
      });
      
      // Add new employees to partner
      if (newEmployees.length > 0) {
        if (!customer.employees) {
          customer.employees = [];
        }
        customer.employees = customer.employees.concat(newEmployees);
      }
      
      // Update employeeCount to match the actual number of employees from transactions
      // This ensures the count reflects all employees that have made transactions
      if (customer.employees && customer.employees.length > 0) {
        customer.employeeCount = customer.employees.length;
      }
      
      // Note: We no longer generate additional employees to fill up to a target count
      // The employeeCount should reflect the actual employees from transactions
      
      // Legacy code removed - we used to generate employees to match employeeCount,
      // but now we populate from transactions and update employeeCount accordingly
      /*
      var currentCount = customer.employees ? customer.employees.length : 0;
      var targetCount = customer.employeeCount || 0;
      
      if (currentCount < targetCount) {
        var needed = targetCount - currentCount;
          // Get first available department if departments exist (for mock data generation)
        var departmentId = null;
        var locationId = null;
        if (customer.locations && customer.locations.length > 0) {
          for (var locIdx = 0; locIdx < customer.locations.length; locIdx++) {
            var loc = customer.locations[locIdx];
            if (loc.departments && loc.departments.length > 0) {
              departmentId = loc.departments[0].id;
              locationId = loc.id;
              break;
            }
          }
        }
        
        // Get domain from partner email or generate one
        var domain = customer.contactEmail ? customer.contactEmail.split('@')[1] : 
                    customer.id === 'p1' ? 'techsolutions.com' :
                    customer.id === 'p2' ? 'manufacturing.com' :
                    customer.id === 'p3' ? 'construction.com' :
                    customer.id === 'p4' ? 'healthcare.com' :
                    customer.id === 'p5' ? 'energy.com' :
                    customer.id === 'p6' ? 'logistics.com' :
                    customer.id === 'p7' ? 'foodprocessing.com' :
                    customer.id === 'p8' ? 'autoparts.com' : 'company.com';
        
        var firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Cameron', 'Dakota', 'Blake', 'Sage', 'River', 'Phoenix', 'Skylar'];
        var lastNames = ['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor'];
        
        for (var i = 0; i < needed; i++) {
          var firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
          var lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
          var email = firstName.toLowerCase() + '.' + lastName.toLowerCase() + '@' + domain;
          
          // Make sure email is unique
          var emailExists = customer.employees.some(function(e) { return e.email && e.email.toLowerCase() === email.toLowerCase(); });
          var counter = 1;
          while (emailExists) {
            email = firstName.toLowerCase() + '.' + lastName.toLowerCase() + counter + '@' + domain;
            emailExists = customer.employees.some(function(e) { return e.email && e.email.toLowerCase() === email.toLowerCase(); });
            counter++;
          }
          
          // Generate employee ID if required
          var employeeId = null;
          if (customer.employeeFieldConfig && customer.employeeFieldConfig.requireEmployeeId) {
            var prefix = customer.id === 'p1' ? 'EMP' : 
                        customer.id === 'p2' ? 'MFG' :
                        customer.id === 'p3' ? 'CON' :
                        customer.id === 'p4' ? 'HC' :
                        customer.id === 'p5' ? 'EN' :
                        customer.id === 'p6' ? 'LT' :
                        customer.id === 'p7' ? 'FP' :
                        customer.id === 'p8' ? 'AP' : 'EMP';
            var num = customer.employees.length + 1;
            employeeId = prefix + '-' + String(num).padStart(3, '0');
          }
          
          // Get voucher balances
          var voucherBalances = [];
          var remainingBalance = 0;
          if (customer.vouchers && customer.vouchers.length > 0 && departmentId) {
            var activeVouchers = customer.vouchers.filter(function(v) { 
              if (!v.isActive) return false;
              if (v.departmentId === departmentId) {
                if (locationId && v.locationId) {
                  return v.locationId === locationId;
                }
                return !locationId && !v.locationId;
              }
              return false;
            });
            activeVouchers.forEach(function(v) {
                voucherBalances.push({
                  voucherId: v.id,
                  remainingAmount: v.defaultAmount || 0
                });
                remainingBalance += (v.defaultAmount || 0);
            });
          }
          
          var generatedEmployee = {
            id: 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: firstName + ' ' + lastName,
            firstName: firstName,
            lastName: lastName,
            email: email,
            departmentId: departmentId,
            locationId: locationId,
            voucherExpiry: customer.vouchers && customer.vouchers.length > 0 ? customer.vouchers[0].endDate : '2024-12-31',
            voucherStatus: 'active',
            remainingBalance: remainingBalance,
            voucherBalances: voucherBalances,
            status: 'active'
          };
          
          // Ensure at least one identifier (Employee ID or Username)
          if (employeeId) {
            generatedEmployee.employeeId = employeeId;
          }
          
          if (customer.employeeFieldConfig && customer.employeeFieldConfig.requireUsername) {
            generatedEmployee.username = email.split('@')[0];
          } else if (!employeeId) {
            // If no employee ID and username not required, add username anyway to ensure at least one identifier
            generatedEmployee.username = email.split('@')[0];
          }
          
          // Ensure at least one date (Birth Date or Start Date)
          var hasDate = false;
          
          // Add date of birth if required
          if (customer.employeeFieldConfig && customer.employeeFieldConfig.requireDateOfBirth) {
            // Generate a random date of birth (age between 25-65)
            var age = 25 + Math.floor(Math.random() * 40);
            var birthYear = new Date().getFullYear() - age;
            var birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            var birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            generatedEmployee.dateOfBirth = birthYear + '-' + birthMonth + '-' + birthDay;
            hasDate = true;
          }
          
          // Add start date if required
          if (customer.employeeFieldConfig && customer.employeeFieldConfig.requireStartDate) {
            // Generate a random start date (within last 5 years)
            var yearsAgo = Math.floor(Math.random() * 5);
            var startYear = new Date().getFullYear() - yearsAgo;
            var startMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            var startDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            generatedEmployee.startDate = startYear + '-' + startMonth + '-' + startDay;
            hasDate = true;
          }
          
          // If no date was added yet, add a start date to ensure at least one date
          if (!hasDate) {
            var yearsAgo = Math.floor(Math.random() * 5);
            var startYear = new Date().getFullYear() - yearsAgo;
            var startMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            var startDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            generatedEmployee.startDate = startYear + '-' + startMonth + '-' + startDay;
          }
          
          customer.employees.push(generatedEmployee);
        }
      }
      */
    });
  },
  
  enrichTransactions: function() {
    // Skip if transactions are empty
    if (!this.transactions || this.transactions.length === 0) {
      return;
    }
    
    // Store reference to AppState for use in closures
    var self = this;
    
    // Group transactions by orderId
    var orderGroups = {};
    this.transactions.forEach(function(t) {
      if (!orderGroups[t.orderId]) {
        orderGroups[t.orderId] = [];
      }
      orderGroups[t.orderId].push(t);
    });
    
    // Process each order
    Object.keys(orderGroups).forEach(function(orderId) {
      var orderItems = orderGroups[orderId];
      var firstItem = orderItems[0];
      
      // Always enrich - don't skip even if fields exist (allows updates)
      
      var orderTotal = orderItems.reduce(function(sum, item) { return sum + item.totalPrice; }, 0);
      var voucherAmount = firstItem.voucherAmount || 0;
      
      // Generate order-level fields (same for all items in the order)
      var invoiceNumber = 'INV-' + orderId.replace('ORD-', '');
      var invoiceDate = firstItem.dateOrdered;
      // Due date is 30 days after invoice date
      var invoiceDateObj = new Date(invoiceDate);
      invoiceDateObj.setDate(invoiceDateObj.getDate() + 30);
      var invoiceDueDate = invoiceDateObj.toISOString().split('T')[0];
      var terms = 'Net 30';
      
      // Generate shipping info (use consistent seed based on orderId for reproducibility)
      var shippingCarriers = ['UPS', 'FedEx', 'USPS', 'DHL'];
      var shippingMethods = ['Standard', 'Two-Day Shipping'];
      var orderHash = orderId.split('').reduce(function(acc, char) { return acc + char.charCodeAt(0); }, 0);
      var shippingCarrier = shippingCarriers[orderHash % shippingCarriers.length];
      var shippingMethod = shippingMethods[orderHash % shippingMethods.length];
      var trackingNumber = shippingCarrier.substring(0, 1) + orderId.replace(/[^0-9]/g, '').substring(0, 9).padEnd(9, '0') + 'US';
      var shippingCost = orderTotal > 100 ? 0 : (shippingMethod === 'Two-Day Shipping' ? 15.99 : 8.99);
      
      // Generate shipping address (use employee info if available, otherwise generic)
      // Note: No email addresses should be included in shipping addresses
      var shippingAddress = firstItem.employeeName + '<br>' + 
        '123 Main St<br>Anytown, ST 12345';
      
      // Get customer to determine available payment methods for remainder
      var customer = null;
      if (self.customers && Array.isArray(self.customers)) {
        customer = self.customers.find(function(p) { return p.name === firstItem.customerName; });
      }
      var customerPaymentMethods = customer && customer.paymentMethods ? customer.paymentMethods : ['Credit Card'];
      
      // Determine which payment method to use for remainder (always Credit Card)
      var remainderPaymentMethod = 'Credit Card';
      
      // VOUCHER APPLICATION AT ORDER LEVEL (per requirements)
      // 1. Determine voucher eligibility at line-item (SKU) level
      // 2. Group line items by voucher and sum their totals
      // 3. Cap each voucher total at the voucher limit
      // 4. Calculate remaining balance and credit card payment at order level
      
      // Get customer to check voucher eligibility
      var customer = null;
      if (self.customers && Array.isArray(self.customers)) {
        customer = self.customers.find(function(p) { return p.name === firstItem.customerName; });
      }
      
      // Debug logging for order ORD-2024-001
      if (orderId === 'ORD-2024-001') {
        console.log('ORD-2024-001 Customer Lookup:', {
          customerName: firstItem.customerName,
          hasCustomersArray: !!(self.customers && Array.isArray(self.customers)),
          customersCount: self.customers ? self.customers.length : 0,
          customerFound: !!customer,
          availableCustomerNames: self.customers ? self.customers.map(function(c) { return c.name; }) : []
        });
      }
      
      // First pass: Determine voucher eligibility for each line item and group by voucher
      var voucherLineTotals = {}; // { voucherName: sum of qualifying line item totals }
      var voucherLimits = {}; // { voucherName: voucher limit (defaultAmount) }
      
      orderItems.forEach(function(item) {
        // Determine voucher eligibility at line-item (SKU) level
        var voucherEligible = false;
        var eligibleVoucherName = null;
        
        // Debug logging for order ORD-2024-001
        if (orderId === 'ORD-2024-001') {
          console.log('ORD-2024-001 Starting Item Check:', {
            sku: item.surewerxPartNumber,
            hasCustomer: !!customer,
            hasVouchers: !!(customer && customer.vouchers),
            vouchersCount: customer && customer.vouchers ? customer.vouchers.length : 0,
            hasSku: !!item.surewerxPartNumber
          });
        }
        
        if (customer && customer.vouchers && item.surewerxPartNumber) {
          // Find active vouchers for this customer
          var activeVouchers = customer.vouchers.filter(function(v) {
            return v.isActive && v.productIds && v.productIds.length > 0;
          });
          
          // Check if this SKU is in any voucher's product list
          var product = self.products.find(function(p) {
            return p.surewerxSku === item.surewerxPartNumber;
          });
          
          // Debug logging for order ORD-2024-001
          if (orderId === 'ORD-2024-001') {
            console.log('ORD-2024-001 Product Lookup:', {
              sku: item.surewerxPartNumber,
              productFound: !!product,
              allProductsCount: self.products ? self.products.length : 0
            });
          }
          
          if (product) {
            // Debug logging for order ORD-2024-001
            if (orderId === 'ORD-2024-001') {
              console.log('ORD-2024-001 Product Found:', {
                sku: item.surewerxPartNumber,
                productId: product.id,
                productName: product.name,
                voucherUsed: item.voucherUsed,
                activeVouchersCount: activeVouchers.length
              });
            }
            
            // If voucherUsed is specified in the transaction, prioritize that voucher
            if (item.voucherUsed) {
              var specifiedVoucher = activeVouchers.find(function(v) {
                return v.name === item.voucherUsed || (v.name && v.name.toLowerCase().trim() === item.voucherUsed.toLowerCase().trim());
              });
              
              // Debug logging for order ORD-2024-001
              if (orderId === 'ORD-2024-001') {
                console.log('ORD-2024-001 Specified Voucher:', {
                  sku: item.surewerxPartNumber,
                  voucherUsed: item.voucherUsed,
                  specifiedVoucher: specifiedVoucher ? {
                    name: specifiedVoucher.name,
                    productIds: specifiedVoucher.productIds,
                    hasProductId: specifiedVoucher.productIds && specifiedVoucher.productIds.indexOf(product.id) !== -1
                  } : null
                });
              }
              
              if (specifiedVoucher && specifiedVoucher.productIds && specifiedVoucher.productIds.indexOf(product.id) !== -1) {
                voucherEligible = true;
                eligibleVoucherName = specifiedVoucher.name;
                
                // Initialize voucher totals if not already done
                if (!voucherLineTotals[specifiedVoucher.name]) {
                  voucherLineTotals[specifiedVoucher.name] = 0;
                  voucherLimits[specifiedVoucher.name] = specifiedVoucher.defaultAmount || 0;
                }
                
                // Add this line item's total to the voucher's line total
                voucherLineTotals[specifiedVoucher.name] += item.totalPrice;
              }
            } else {
              // If no voucherUsed specified, check if product ID is in any voucher's productIds
              // Apply to the FIRST matching voucher only (don't double-count across multiple vouchers)
              for (var i = 0; i < activeVouchers.length; i++) {
                var voucher = activeVouchers[i];
                if (voucher.productIds && voucher.productIds.indexOf(product.id) !== -1) {
                  voucherEligible = true;
                  eligibleVoucherName = voucher.name;
                  
                  // Initialize voucher totals if not already done
                  if (!voucherLineTotals[voucher.name]) {
                    voucherLineTotals[voucher.name] = 0;
                    voucherLimits[voucher.name] = voucher.defaultAmount || 0;
                  }
                  
                  // Add this line item's total to the voucher's line total
                  voucherLineTotals[voucher.name] += item.totalPrice;
                  
                  // Only apply to first matching voucher, then stop
                  break;
                }
              }
            }
          }
        }
        
        // Store eligibility for later use
        item.voucherEligible = voucherEligible;
        item.eligibleVoucherName = eligibleVoucherName || item.voucherUsed || firstItem.voucherUsed || null;
        
        // Debug logging for order ORD-2024-001
        if (orderId === 'ORD-2024-001') {
          console.log('ORD-2024-001 Item Processing:', {
            sku: item.surewerxPartNumber,
            voucherUsed: item.voucherUsed,
            voucherEligible: voucherEligible,
            eligibleVoucherName: item.eligibleVoucherName,
            totalPrice: item.totalPrice,
            voucherLineTotals: JSON.parse(JSON.stringify(voucherLineTotals))
          });
        }
      });
      
      // Calculate order-level voucher totals (capped at voucher limits)
      var orderVoucherTotals = {}; // { voucherName: amount used (capped at limit) }
      var totalVoucherApplied = 0;
      
      for (var voucherName in voucherLineTotals) {
        if (voucherLineTotals.hasOwnProperty(voucherName)) {
          var voucherLineTotal = voucherLineTotals[voucherName];
          var voucherLimit = voucherLimits[voucherName] || 0;
          var voucherAmountUsed = Math.min(voucherLineTotal, voucherLimit);
          
          orderVoucherTotals[voucherName] = voucherAmountUsed;
          totalVoucherApplied += voucherAmountUsed;
          
          // Debug logging for order ORD-2024-001
          if (orderId === 'ORD-2024-001') {
            console.log('ORD-2024-001 Voucher Calc:', {
              voucherName: voucherName,
              voucherLineTotal: voucherLineTotal,
              voucherLimit: voucherLimit,
              voucherAmountUsed: voucherAmountUsed,
              totalVoucherApplied: totalVoucherApplied
            });
          }
        }
      }
      
      // Fallback: Check for any vouchers specified in voucherUsed that weren't found in the first pass
      // This handles cases where product matching failed or vouchers were missed
      if (customer && customer.vouchers) {
        // Collect all unique voucher names from all line items
        var voucherNamesToProcess = [];
        orderItems.forEach(function(item) {
          if (item.voucherUsed && voucherNamesToProcess.indexOf(item.voucherUsed) === -1) {
            voucherNamesToProcess.push(item.voucherUsed);
          }
        });
        
        // Process each voucher found in the order that isn't already in orderVoucherTotals
        voucherNamesToProcess.forEach(function(voucherName) {
          // Skip if this voucher is already in orderVoucherTotals
          if (orderVoucherTotals[voucherName]) {
            return;
          }
          
          var voucher = customer.vouchers.find(function(v) {
            return v.name === voucherName || (v.name && v.name.toLowerCase().trim() === voucherName.toLowerCase().trim());
          });
          
          if (voucher && voucher.isActive) {
            // Re-check line items against this voucher's product list
            // Only include items that have this voucher in their voucherUsed field
            var voucherLineTotal = 0;
            orderItems.forEach(function(item) {
              // Only process items that are assigned to this voucher
              if (item.voucherUsed === voucherName && item.surewerxPartNumber) {
                var product = self.products.find(function(p) {
                  return p.surewerxSku === item.surewerxPartNumber;
                });
                if (product && voucher.productIds && voucher.productIds.indexOf(product.id) !== -1) {
                  voucherLineTotal += item.totalPrice;
                }
              }
            });
            
            // If no products matched but voucherUsed is set, apply voucher to at least part of the order
            // This ensures all orders with voucherUsed set will use at least some voucher amount
            if (voucherLineTotal === 0 && orderTotal > 0) {
              // Calculate total for items assigned to this voucher
              var itemsForThisVoucher = orderItems.filter(function(item) {
                return item.voucherUsed === voucherName;
              });
              var totalForThisVoucher = itemsForThisVoucher.reduce(function(sum, item) {
                return sum + item.totalPrice;
              }, 0);
              
              if (totalForThisVoucher > 0) {
                // Apply voucher to the items assigned to it, capped at voucher limit
                var voucherLimit = voucher.defaultAmount || 0;
                voucherLineTotal = Math.min(totalForThisVoucher, voucherLimit);
              }
            }
            
            if (voucherLineTotal > 0) {
              var voucherLimit = voucher.defaultAmount || 0;
              var voucherAmountUsed = Math.min(voucherLineTotal, voucherLimit);
              orderVoucherTotals[voucherName] = voucherAmountUsed;
              totalVoucherApplied += voucherAmountUsed;
            }
          }
        });
      }
      
      // Calculate remaining balance and credit card payment at order level
      var grandTotal = orderTotal + shippingCost;
      var remainingBalance = grandTotal - totalVoucherApplied;
      var creditCardPayment = remainingBalance > 0 ? remainingBalance : 0;
      
      // Second pass: Add order-level fields and payment breakdown to each item
      orderItems.forEach(function(item, index) {
        // Add order-level fields
        item.invoiceNumber = invoiceNumber;
        item.invoiceDate = invoiceDate;
        item.invoiceDueDate = invoiceDueDate;
        item.terms = terms;
        item.shippingAddress = shippingAddress;
        item.shippingCarrier = shippingCarrier;
        item.shippingMethod = shippingMethod;
        item.trackingNumber = trackingNumber;
        item.shippingCost = index === 0 ? shippingCost : 0; // Only add shipping cost to first item
        
        // Add partnerName as alias for customerName for backward compatibility
        if (item.customerName && !item.partnerName) {
          item.partnerName = item.customerName;
        }
        
        // Store order-level voucher information (same for all items in order)
        item.orderVoucherTotals = orderVoucherTotals; // Order-level voucher totals per voucher
        item.totalVoucherApplied = totalVoucherApplied; // Total voucher amount applied at order level
        item.remainingBalance = remainingBalance; // Remaining balance after vouchers
        item.creditCardPayment = creditCardPayment; // Credit card payment required
        
        // For backward compatibility and display purposes, calculate line-item payment breakdown
        // This represents the allocation, but actual voucher application is at order level
        var itemTotal = item.totalPrice;
        var lineVoucherAllocation = 0;
        var lineCreditCardAllocation = 0;
        
        if (totalVoucherApplied > 0 && orderTotal > 0) {
          // Allocate voucher proportionally to line items (for display only)
          var voucherRatio = totalVoucherApplied / orderTotal;
          lineVoucherAllocation = itemTotal * voucherRatio;
        }
        
        lineCreditCardAllocation = itemTotal - lineVoucherAllocation;
        
        // Set payment breakdown fields (for display and backward compatibility)
        item.voucherAmountPaid = lineVoucherAllocation; // Line-item allocation (display only)
        item.creditCardAmountPaid = lineCreditCardAllocation; // Line-item credit card allocation
        
        // Set payment method
        // If voucherUsed is set in raw data, ensure we use voucher (never credit card only)
        if (lineVoucherAllocation > 0 && lineCreditCardAllocation > 0) {
          item.paymentMethod = 'Mixed';
        } else if (lineVoucherAllocation > 0) {
          item.paymentMethod = 'Voucher';
        } else if (firstItem.voucherUsed && totalVoucherApplied > 0) {
          // If voucherUsed is set and order has vouchers but this line didn't get allocation,
          // use Mixed to indicate voucher was used in the order
          item.paymentMethod = 'Mixed';
        } else if (firstItem.voucherUsed) {
          // If voucherUsed is set but no vouchers were calculated, still show as Mixed
          // (voucher was intended to be used)
          item.paymentMethod = 'Mixed';
        } else {
          item.paymentMethod = 'Credit Card';
        }
      });
    });
  },
  
  // Convert customer groups to locations with departments
  convertGroupsToLocations: function() {
    var self = this;
    
    this.customers.forEach(function(customer) {
      // Initialize locations array if it doesn't exist
      if (!customer.locations) {
        customer.locations = [];
      }
      
      // If customer already has locations with departments, ensure they have city/state
      if (customer.locations.length > 0) {
        customer.locations.forEach(function(location) {
          // If location has addressCity/addressState but not city/state, migrate them
          if (location.addressCity && !location.city) {
            location.city = location.addressCity;
            delete location.addressCity;
          }
          if (location.addressState && !location.state) {
            location.state = location.addressState;
            delete location.addressState;
          }
          // Ensure address is just the address line, not combined
          if (location.address && location.address.indexOf(',') > -1 && location.city && location.state) {
            // If address contains city/state and we have separate fields, extract just the address line
            var addressParts = location.address.split(',');
            if (addressParts.length >= 3) {
              location.address = addressParts[0].trim();
              location.addressLine1 = addressParts[0].trim();
            }
          }
          // Ensure addressLine1 is set if address exists
          if (location.address && !location.addressLine1) {
            location.addressLine1 = location.address;
          }
        });
        
        // Ensure each existing location has a distributor branch assigned
        if (customer.distributorId && customer.locations.length > 0) {
          customer.locations.forEach(function(location) {
            if (!location.distributorBranchId) {
              // First try to find a branch that matches by city/state
              var matchingBranch = self.branchLocations.find(function(branch) {
                var branchDistributorId = null;
                if (branch.id.startsWith('br-d1-')) branchDistributorId = 'd1';
                else if (branch.id.startsWith('br-d2-')) branchDistributorId = 'd2';
                else if (branch.id.startsWith('br-d3-')) branchDistributorId = 'd3';
                else if (branch.id.startsWith('br-d4-')) branchDistributorId = 'd4';
                
                if (branchDistributorId !== customer.distributorId) {
                  return false;
                }
                
                var branchAddressLower = (branch.branchAddress || '').toLowerCase();
                var locationCityLower = (location.city || '').toLowerCase();
                var locationStateLower = (location.state || '').toLowerCase();
                
                if (locationCityLower && branchAddressLower.indexOf(locationCityLower) > -1) {
                  return true;
                }
                if (locationStateLower && branchAddressLower.indexOf(locationStateLower) > -1) {
                  return true;
                }
                return false;
              });
              
              if (!matchingBranch) {
                matchingBranch = self.branchLocations.find(function(branch) {
                  var branchDistributorId = null;
                  if (branch.id.startsWith('br-d1-')) branchDistributorId = 'd1';
                  else if (branch.id.startsWith('br-d2-')) branchDistributorId = 'd2';
                  else if (branch.id.startsWith('br-d3-')) branchDistributorId = 'd3';
                  else if (branch.id.startsWith('br-d4-')) branchDistributorId = 'd4';
                  return branchDistributorId === customer.distributorId;
                });
              }
              
              if (matchingBranch) {
                location.distributorBranchId = matchingBranch.id;
              }
            }
          });
        }
        
        // If locations already exist and have departments, skip conversion
        var hasDepartments = customer.locations.some(function(loc) {
          return loc.departments && loc.departments.length > 0;
        });
        if (hasDepartments) {
          return;
        }
      }
      
      // If customer has groups, convert them to locations with departments
      if (customer.groups && customer.groups.length > 0) {
        // Group groups by locationId to create locations
        var locationMap = {};
        
        customer.groups.forEach(function(group) {
          var locationId = group.locationId || 'LOC-' + group.id;
          var locationKey = locationId;
          
          // Create location if it doesn't exist
          if (!locationMap[locationKey]) {
            // Parse locationAddress if it exists but addressLine1 doesn't
            var addressLine1 = group.addressLine1 || '';
            var city = group.addressCity || '';
            var state = group.addressState || '';
            var zip = group.addressZip || '';
            
            // If locationAddress exists but we don't have separate fields, try to parse it
            if (!addressLine1 && group.locationAddress) {
              var addressParts = group.locationAddress.split(',');
              if (addressParts.length >= 3) {
                addressLine1 = addressParts[0].trim();
                city = addressParts[1].trim();
                var stateZip = addressParts[2].trim();
                var stateZipParts = stateZip.split(' ');
                if (stateZipParts.length >= 2) {
                  state = stateZipParts[0].trim();
                  zip = stateZipParts.slice(1).join(' ').trim();
                } else {
                  state = stateZip;
                }
              } else {
                addressLine1 = group.locationAddress;
              }
            }
            
            locationMap[locationKey] = {
              id: locationId,
              locationId: locationId,
              address: addressLine1,
              addressLine1: addressLine1 || '',
              city: city,
              state: state,
              addressZip: zip,
              departments: []
            };
          }
          
          // Add department to location
          locationMap[locationKey].departments.push({
            id: group.id,
            name: group.name,
            employeeCount: group.employeeCount || 0,
            productIds: group.productIds || [],
            categoryIds: group.categoryIds || []
          });
        });
        
        // Convert locationMap to array
        customer.locations = Object.keys(locationMap).map(function(key) {
          return locationMap[key];
        });
      } else if (customer.locations.length === 0) {
        // If no groups and no locations, create a default location with multiple departments
        var defaultLocation = {
          id: 'LOC-001',
          locationId: 'LOC-001',
          address: 'Main Office',
          addressLine1: 'Main Office',
          city: '',
          state: '',
          addressZip: '',
          departments: [
            {
              id: 'DEPT-001',
              name: 'Operations',
              employeeCount: 0,
              productIds: [],
              categoryIds: []
            },
            {
              id: 'DEPT-002',
              name: 'Administration',
              employeeCount: 0,
              productIds: [],
              categoryIds: []
            }
          ]
        };
        
        // Assign distributor branch if customer has distributorId
        if (customer.distributorId) {
          var firstBranch = self.branchLocations.find(function(branch) {
            var branchDistributorId = null;
            if (branch.id.startsWith('br-d1-')) branchDistributorId = 'd1';
            else if (branch.id.startsWith('br-d2-')) branchDistributorId = 'd2';
            else if (branch.id.startsWith('br-d3-')) branchDistributorId = 'd3';
            else if (branch.id.startsWith('br-d4-')) branchDistributorId = 'd4';
            return branchDistributorId === customer.distributorId;
          });
          if (firstBranch) {
            defaultLocation.distributorBranchId = firstBranch.id;
          }
        }
        
        customer.locations = [defaultLocation];
      }
      
      // Update employees to reference correct department/location IDs
      if (customer.employees && customer.employees.length > 0) {
        customer.employees.forEach(function(employee) {
          // If employee has departmentId but no locationId, find the location
          if (employee.departmentId && !employee.locationId) {
            // Search through locations to find the department
            for (var i = 0; i < customer.locations.length; i++) {
              var location = customer.locations[i];
              if (location.departments) {
                var department = location.departments.find(function(d) { return d.id === employee.departmentId; });
                if (department) {
                  employee.locationId = location.id;
                  break;
                }
              }
            }
          }
          
          // If employee has locationId but no departmentId, assign to first department in that location
          if (employee.locationId && !employee.departmentId) {
            var location = customer.locations.find(function(l) { return l.id === employee.locationId; });
            if (location && location.departments && location.departments.length > 0) {
              employee.departmentId = location.departments[0].id;
            }
          }
          
          // If employee has neither, assign to first location's first department
          if (!employee.departmentId && !employee.locationId && customer.locations.length > 0) {
            var firstLocation = customer.locations[0];
            if (firstLocation.departments && firstLocation.departments.length > 0) {
              employee.locationId = firstLocation.id;
              employee.departmentId = firstLocation.departments[0].id;
            }
          }
        });
        
        // Recalculate employee counts for departments
        customer.locations.forEach(function(location) {
          if (location.departments) {
            location.departments.forEach(function(department) {
              var count = customer.employees.filter(function(e) {
                return e.departmentId === department.id && e.locationId === location.id;
              }).length;
              department.employeeCount = count;
            });
          }
        });
      }
      
      // Ensure each location has a distributor branch assigned
      if (customer.distributorId && customer.locations && customer.locations.length > 0) {
        customer.locations.forEach(function(location) {
          if (!location.distributorBranchId) {
            // First try to find a branch that matches by city/state
            var matchingBranch = self.branchLocations.find(function(branch) {
              // Match by distributor ID (branch ID prefix matches distributor)
              var branchDistributorId = null;
              if (branch.id.startsWith('br-d1-')) branchDistributorId = 'd1';
              else if (branch.id.startsWith('br-d2-')) branchDistributorId = 'd2';
              else if (branch.id.startsWith('br-d3-')) branchDistributorId = 'd3';
              else if (branch.id.startsWith('br-d4-')) branchDistributorId = 'd4';
              
              // Must match distributor first
              if (branchDistributorId !== customer.distributorId) {
                return false;
              }
              
              // Try to match by city and state in branch address
              var branchAddressLower = (branch.branchAddress || '').toLowerCase();
              var locationCityLower = (location.city || '').toLowerCase();
              var locationStateLower = (location.state || '').toLowerCase();
              
              if (locationCityLower && branchAddressLower.indexOf(locationCityLower) > -1) {
                return true;
              }
              if (locationStateLower && branchAddressLower.indexOf(locationStateLower) > -1) {
                return true;
              }
              return false;
            });
            
            // If no city/state match found, use first branch of distributor
            if (!matchingBranch) {
              matchingBranch = self.branchLocations.find(function(branch) {
                var branchDistributorId = null;
                if (branch.id.startsWith('br-d1-')) branchDistributorId = 'd1';
                else if (branch.id.startsWith('br-d2-')) branchDistributorId = 'd2';
                else if (branch.id.startsWith('br-d3-')) branchDistributorId = 'd3';
                else if (branch.id.startsWith('br-d4-')) branchDistributorId = 'd4';
                return branchDistributorId === customer.distributorId;
              });
            }
            
            if (matchingBranch) {
              location.distributorBranchId = matchingBranch.id;
            }
          }
        });
      }
      
      // Ensure each location has multiple departments (at least 2)
      if (customer.locations && customer.locations.length > 0) {
        customer.locations.forEach(function(location) {
          if (location.departments && location.departments.length === 1) {
            // If location only has one department, add a default second department
            location.departments.push({
              id: 'DEPT-' + location.id + '-002',
              name: 'Additional Department',
              employeeCount: 0,
              productIds: [],
              categoryIds: []
            });
          }
        });
      }
    });
  }
};

// Initialize state on load
$(function() {
  AppState.init();
});