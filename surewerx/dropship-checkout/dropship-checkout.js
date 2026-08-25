/*global jQuery */
(function ($) {
    'use strict';

    var DEFAULT_WAREHOUSE = {
        company: 'CASH CUSTOMER - TERRAFORM',
        attentionTo: 'INTERNAL USE',
        address1: 'DO NOT SHIP - INTERNAL USE ONLY',
        address2: '',
        city: 'Elgin',
        state: 'IL',
        postalCode: '60123',
        country: 'United States',
        phone: ''
    };

    var DESTINATION_TYPE_LABELS = {
        RESIDENTIAL: 'Residential',
        COMMERCIAL: 'Commercial / Business',
        JOB_SITE: 'Job Site/Other Restricted Access'
    };

    var REQUIRED_FIELDS = [
        { name: 'destinationType', label: 'Destination type' },
        { name: 'company', label: 'Company' },
        { name: 'attentionTo', label: 'Attention To' },
        { name: 'address1', label: 'Address Line 1' },
        { name: 'city', label: 'City' },
        { name: 'state', label: 'State/Province' },
        { name: 'postalCode', label: 'ZIP/Postal Code' },
        { name: 'phone', label: 'Receiver Phone Number #' },
        { name: 'email', label: 'Receiver Email' }
    ];

    /* Prototype stand-in for Google Places Autocomplete + Address Validation API.
       Production: ViewOnePageCheckoutAjax-ValidateDropShipAddress. */
    var GOOGLE_AVS_ADDRESSES = [
        { placeId: 'ChIJswrx-hq', address1: '325 Corporate Drive', city: 'Elgin', state: 'IL', postalCode: '60123' },
        { placeId: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA', address1: '1600 Amphitheatre Parkway', city: 'Mountain View', state: 'CA', postalCode: '94043' },
        { placeId: 'ChIJD5gyo-3hD4gRcv4sip6DXAY', address1: '1 Infinite Loop', city: 'Cupertino', state: 'CA', postalCode: '95014' },
        { placeId: 'ChIJPTacImX2wokRQIBuGTh6Rw', address1: '350 Fifth Avenue', city: 'New York', state: 'NY', postalCode: '10118' },
        { placeId: 'ChIJ7cv00DwsDogRAMDACa2m4K8', address1: '233 S Wacker Drive', city: 'Chicago', state: 'IL', postalCode: '60606' },
        { placeId: 'ChIJOwg_06VPwokRYv534QaPC8g', address1: '200 E Randolph Street', city: 'Chicago', state: 'IL', postalCode: '60601' },
        { placeId: 'ChIJjQmTaV0E9YgRC2pJZ4Ymy58', address1: '500 W 2nd Street', city: 'Austin', state: 'TX', postalCode: '78701' },
        { placeId: 'ChIJvQz5T4V-VIgR-a1SnR1hA', address1: '100 N Tryon Street', city: 'Charlotte', state: 'NC', postalCode: '28202' }
    ];

    var UNIT_PRICE = 120.3;
    var MIN_DROPSHIP_TOTAL = 500;

    var DropShipCheckout = {
        enabled: false,
        applied: false,
        shippingMethod: 'PREPAID',
        address: {},
        options: {
            shippingNotes: '',
            avsStatus: ''
        },
        avsActiveIndex: -1,
        fillingFromAvs: false,
        demoMode: '',
        ineligibleReason: '',

        init: function () {
            this.cacheDom();
            this.demoMode = this.parseDemoParam();
            this.bindEvents();
            this.applyDemoMode();
            this.syncPlaceOrderState();
        },

        cacheDom: function () {
            this.$doc = $(document);
            this.$toggleBox = $('.dropship-toggle');
            this.$openBtn = $('#dropShipOpen');
            this.$modal = $('#dropShipDialog');
            this.$form = $('#dropShipAddressForm');
            this.$warehouseBox = $('#warehouseAddressBox');
            this.$dropShipBox = $('#dropShipAppliedAddress');
            this.$pickupNote = $('#dropShipPickupNote');
            this.$terms = $('#terms-conditions-agree');
            this.$placeOrder = $('#submit-order');
            this.$poNumber = $('#purchaseOrderId');
            this.$fieldError = $('#checkout-req-field-error');
            this.$dropShipError = $('#dropShipFormError');
            this.$avsResults = $('#dropShipAvsResults');
            this.$avsUnverified = $('#dropShipAvsUnverified');
            this.$avsConfirm = $('#dropShipAvsConfirm');
            this.$clearDialog = $('#dropShipClearDialog');
            this.$ineligible = $('#dropShipIneligible');
            this.$ineligibleReason = $('#dropShipIneligibleReason');
            this.$restrictedBadge = $('#dropShipRestrictedBadge');
            this.$demoMode = $('#dropShipDemoMode');
            this.closingAfterApply = false;
        },

        bindEvents: function () {
            var self = this;

            this.$openBtn.on('click', function () {
                if (self.$openBtn.is(':disabled') || self.ineligibleReason) {
                    return;
                }
                self.setEnabled(true);
            });

            this.$doc.on('change', '.update-shipping-method-custom', function () {
                self.onShippingMethodChange($(this).val());
            });

            this.$form.on('submit', function (e) {
                e.preventDefault();
                self.applyDropShip();
            });

            $('#dropShipCancel').on('click', function () {
                self.$modal.modal('hide');
            });

            $('#dropShipEdit').on('click', function (e) {
                e.preventDefault();
                self.editDropShip();
            });

            $('#dropShipClear').on('click', function (e) {
                e.preventDefault();
                self.$clearDialog.modal('show');
            });

            $('#dropShipClearConfirm').on('click', function (e) {
                e.preventDefault();
                self.$clearDialog.modal('hide');
                self.clearDropShip();
            });

            $('#dropShipPhone').on('input', function () {
                self.formatPhoneInput(this);
            });

            this.$form.on('change', 'input[name="destinationType"]', function () {
                self.syncDestinationTypeButtons();
                $('.dropship-destination-type-group', self.$form).removeClass('has-error');
            });

            $('#dropShipAddress1').on('input', function () {
                self.onAddress1Input();
            });

            $('#dropShipAddress1, #dropShipCity, #dropShipState, #dropShipPostalCode').on('change input', function () {
                if (!self.fillingFromAvs) {
                    self.invalidateAvs();
                }
            });

            this.$avsResults.on('mousedown', 'li[data-place-id]', function (e) {
                e.preventDefault();
                self.selectAvsSuggestion($(this).data('place-id'));
            });

            $('#dropShipAddress1').on('keydown', function (e) {
                self.onAvsKeydown(e);
            });

            this.$doc.on('click', function (e) {
                if (!$(e.target).closest('.dropship-avs-wrap').length) {
                    self.hideAvsResults();
                }
            });

            this.$avsConfirm.on('change', function () {
                $('.dropship-avs-confirm-error').addClass('hide');
            });

            this.$modal.on('shown.bs.modal', function () {
                self.syncDestinationTypeButtons();
                $('#dropShipCompany').trigger('focus');
            });

            this.$modal.on('hide.bs.modal', function () {
                if (self.closingAfterApply) {
                    self.closingAfterApply = false;
                    self.hideAvsResults();
                    return;
                }
                self.hideAvsResults();
                if (!self.applied) {
                    self.enabled = false;
                    self.$warehouseBox.removeClass('is-inactive');
                    self.syncHiddenFields();
                    self.syncPlaceOrderState();
                }
            });

            this.$terms.on('change', function () {
                self.syncPlaceOrderState();
            });

            this.$poNumber.on('input blur', function () {
                self.validatePoNumber(false);
            });

            $('#order-submit-form').on('submit', function (e) {
                e.preventDefault();
                self.placeOrder();
            });

            $('.checkout-quantity-up-arrow, .checkout-quantity-down-arrow').on('click', function (e) {
                e.preventDefault();
                self.adjustQuantity($(this).hasClass('checkout-quantity-up-arrow') ? 1 : -1);
            });

            $('#shipWhenComplete').on('change', function () {
                if (this.checked) {
                    $('#shipWhenCompleteDialog').modal('show');
                }
            });

            $('.ackButton').on('click', function () {
                $('#shipWhenCompleteDialog').modal('hide');
            });

            $('.noWaitButton').on('click', function () {
                $('#shipWhenComplete').prop('checked', false);
                $('#shipWhenCompleteDialog').modal('hide');
            });

            if ($.fn.datepicker) {
                $('#ShipToComplete').datepicker({
                    dateFormat: 'mm/dd/yy',
                    minDate: 0
                });
            }
        },

        onShippingMethodChange: function (method) {
            this.shippingMethod = method || 'PREPAID';
            var isPickup = this.shippingMethod === 'PICKUP';

            $('.update-shipping-method-custom').closest('.panel').removeClass('is-selected');
            $('.update-shipping-method-custom:checked').closest('.panel').addClass('is-selected');

            $('#select-ship-method').val(this.shippingMethod);
            this.$pickupNote.toggleClass('hide', !isPickup);

            if (isPickup && this.enabled) {
                this.setEnabled(false);
            }

            this.$openBtn.prop('disabled', isPickup || !!this.ineligibleReason);
            this.$toggleBox.toggleClass('is-disabled', isPickup && !this.ineligibleReason);
        },

        setEnabled: function (enabled) {
            this.enabled = !!enabled;

            if (!this.enabled) {
                this.applied = false;
                this.syncHiddenFields();
                this.$modal.modal('hide');
                this.$warehouseBox.removeClass('is-inactive');
                this.$dropShipBox.addClass('hide');
                this.$toggleBox.removeClass('is-applied');
                this.clearFieldErrors();
                this.resetAvsUi();
                this.syncPlaceOrderState();
                return;
            }

            this.$warehouseBox.addClass('is-inactive');
            this.$modal.modal('show');
            this.syncPlaceOrderState();
        },

        readForm: function () {
            var data = {};
            this.$form.serializeArray().forEach(function (field) {
                data[field.name] = $.trim(field.value || '');
            });
            return data;
        },

        validateForm: function () {
            var data = this.readForm();
            var errors = [];

            this.clearFieldErrors();

            REQUIRED_FIELDS.forEach(function (field) {
                if (!data[field.name]) {
                    errors.push(field.label + ' is required.');
                    if (field.name === 'destinationType') {
                        $('.dropship-destination-type-group', this.$form).addClass('has-error');
                    } else {
                        $('[name="' + field.name + '"]', this.$form)
                            .closest('.form-group')
                            .addClass('has-error');
                    }
                }
            }, this);

            if (data.postalCode && !/^\d{5}(?:-\d{4})?$/.test(data.postalCode)) {
                errors.push('Enter a valid 5-digit ZIP code.');
                $('[name="postalCode"]', this.$form).closest('.form-group').addClass('has-error');
            }

            if (data.phone && data.phone.replace(/\D/g, '').length < 10) {
                errors.push('Enter a valid 10-digit phone number.');
                $('[name="phone"]', this.$form).closest('.form-group').addClass('has-error');
            }

            if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
                errors.push('Enter a valid email address.');
                $('[name="email"]', this.$form).closest('.form-group').addClass('has-error');
            }

            this.showFormErrors(errors);
            return errors.length === 0;
        },

        clearFieldErrors: function () {
            this.$form.find('.form-group').removeClass('has-error');
            this.$dropShipError.addClass('hide').empty();
            this.$fieldError.addClass('hide');
        },

        showFormErrors: function (errors) {
            if (!errors.length) {
                this.$dropShipError.addClass('hide').empty();
                return;
            }
            this.$dropShipError
                .removeClass('hide')
                .html('<strong>Please correct the following:</strong><ul><li>' + errors.join('</li><li>') + '</li></ul>');
        },

        applyDropShip: function () {
            if (!this.validateForm()) {
                return;
            }

            var data = this.readForm();
            var avsStatus = this.resolveAvsStatus(data);

            if (avsStatus !== 'verified') {
                this.$avsUnverified.removeClass('hide');
                if (!this.$avsConfirm.is(':checked')) {
                    $('.dropship-avs-confirm-error').removeClass('hide');
                    this.$avsUnverified.get(0).scrollIntoView({ block: 'nearest' });
                    return;
                }
                avsStatus = 'manual';
            } else {
                this.$avsUnverified.addClass('hide');
            }

            this.address = {
                destinationType: data.destinationType,
                company: data.company,
                attentionTo: data.attentionTo,
                address1: data.address1,
                address2: data.address2,
                city: data.city,
                state: data.state,
                postalCode: data.postalCode,
                country: 'United States',
                phone: data.phone,
                email: data.email
            };
            this.options = {
                shippingNotes: data.shippingNotes || '',
                avsStatus: avsStatus
            };
            $('#dropShipAvsStatus').val(avsStatus);
            this.applied = true;
            this.$toggleBox.addClass('is-applied');
            this.syncHiddenFields();
            this.renderAppliedAddress();
            this.closingAfterApply = true;
            this.$modal.modal('hide');
            this.syncPlaceOrderState();
        },

        normalizeAvs: function (value) {
            return String(value || '').replace(/[.,]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        },

        findAvsMatch: function (data) {
            var street = this.normalizeAvs(data.address1);
            var city = this.normalizeAvs(data.city);
            var state = this.normalizeAvs(data.state);
            var zip = String(data.postalCode || '').substring(0, 5);

            for (var i = 0; i < GOOGLE_AVS_ADDRESSES.length; i++) {
                var item = GOOGLE_AVS_ADDRESSES[i];
                if (this.normalizeAvs(item.address1) === street &&
                    this.normalizeAvs(item.city) === city &&
                    this.normalizeAvs(item.state) === state &&
                    item.postalCode === zip) {
                    return item;
                }
            }
            return null;
        },

        resolveAvsStatus: function (data) {
            if (data.avsStatus === 'verified' && this.findAvsMatch(data)) {
                return 'verified';
            }
            if (this.findAvsMatch(data)) {
                return 'verified';
            }
            return 'unverified';
        },

        onAddress1Input: function () {
            var query = $.trim($('#dropShipAddress1').val()).toLowerCase();
            this.hideAvsResults();
            if (query.length < 3) {
                return;
            }

            var matches = $.grep(GOOGLE_AVS_ADDRESSES, function (item) {
                var haystack = (item.address1 + ' ' + item.city + ' ' + item.state + ' ' + item.postalCode).toLowerCase();
                return haystack.indexOf(query) !== -1;
            });

            this.renderAvsResults(matches, query);
        },

        renderAvsResults: function (matches) {
            var html = '';
            if (!matches.length) {
                html = '<li class="avs-empty">No Google match. Enter the address manually and confirm it is valid.</li>';
            } else {
                matches.forEach(function (item) {
                    html += '<li data-place-id="' + item.placeId + '">' +
                        '<span class="avs-main">' + this.escape(item.address1) + '</span>' +
                        '<span class="avs-sub">' + this.escape(item.city) + ', ' + this.escape(item.state) + ' ' + this.escape(item.postalCode) + '</span>' +
                        '</li>';
                }, this);
            }
            html += '<li class="avs-footer">Address lookup powered by Google</li>';
            this.$avsResults.html(html).show();
            this.avsActiveIndex = matches.length ? 0 : -1;
            this.highlightAvsResult();
        },

        highlightAvsResult: function () {
            var $items = this.$avsResults.find('li[data-place-id]');
            $items.removeClass('is-active');
            if (this.avsActiveIndex >= 0) {
                $items.eq(this.avsActiveIndex).addClass('is-active');
            }
        },

        onAvsKeydown: function (e) {
            if (!this.$avsResults.is(':visible')) {
                return;
            }
            var $items = this.$avsResults.find('li[data-place-id]');
            if (e.keyCode === 40) {
                e.preventDefault();
                this.avsActiveIndex = Math.min(this.avsActiveIndex + 1, $items.length - 1);
                this.highlightAvsResult();
            } else if (e.keyCode === 38) {
                e.preventDefault();
                this.avsActiveIndex = Math.max(this.avsActiveIndex - 1, 0);
                this.highlightAvsResult();
            } else if (e.keyCode === 13 && this.avsActiveIndex >= 0) {
                e.preventDefault();
                this.selectAvsSuggestion($items.eq(this.avsActiveIndex).data('place-id'));
            } else if (e.keyCode === 27) {
                this.hideAvsResults();
            }
        },

        selectAvsSuggestion: function (placeId) {
            var match = null;
            $.each(GOOGLE_AVS_ADDRESSES, function (i, item) {
                if (item.placeId === placeId) {
                    match = item;
                    return false;
                }
            });
            if (!match) {
                return;
            }

            this.fillingFromAvs = true;
            $('#dropShipAddress1').val(match.address1);
            $('#dropShipCity').val(match.city);
            $('#dropShipState').val(match.state);
            $('#dropShipPostalCode').val(match.postalCode);
            $('#dropShipAvsStatus').val('verified');
            $('#dropShipAvsPlaceId').val(match.placeId);
            this.fillingFromAvs = false;
            this.hideAvsResults();
            this.resetAvsConfirm();
        },

        invalidateAvs: function () {
            $('#dropShipAvsStatus').val('');
            $('#dropShipAvsPlaceId').val('');
            this.resetAvsConfirm();
        },

        resetAvsConfirm: function () {
            this.$avsUnverified.addClass('hide');
            this.$avsConfirm.prop('checked', false);
            $('.dropship-avs-confirm-error').addClass('hide');
        },

        resetAvsUi: function () {
            this.hideAvsResults();
            this.invalidateAvs();
        },

        hideAvsResults: function () {
            this.$avsResults.hide().empty();
            this.avsActiveIndex = -1;
        },

        formatPhoneNumber: function (value) {
            var digits = String(value || '').replace(/\D/g, '').substring(0, 10);
            if (!digits) {
                return '';
            }
            if (digits.length < 4) {
                return '(' + digits;
            }
            if (digits.length < 7) {
                return '(' + digits.substring(0, 3) + ')' + digits.substring(3);
            }
            return '(' + digits.substring(0, 3) + ')' + digits.substring(3, 6) + '-' + digits.substring(6);
        },

        formatPhoneInput: function (input) {
            var el = input;
            var start = el.selectionStart;
            var oldValue = el.value;
            var digitsBefore = oldValue.substring(0, start).replace(/\D/g, '').length;
            var formatted = this.formatPhoneNumber(oldValue);

            if (formatted === oldValue) {
                return;
            }

            el.value = formatted;

            var newPos = formatted.length;
            if (start < oldValue.length) {
                newPos = 0;
                var seen = 0;
                while (newPos < formatted.length && seen < digitsBefore) {
                    if (/\d/.test(formatted.charAt(newPos))) {
                        seen += 1;
                    }
                    newPos += 1;
                }
            }
            if (typeof el.setSelectionRange === 'function') {
                el.setSelectionRange(newPos, newPos);
            }
        },

        editDropShip: function () {
            var phoneEl = document.getElementById('dropShipPhone');
            if (phoneEl) {
                phoneEl.value = this.formatPhoneNumber(phoneEl.value);
            }
            this.$modal.modal('show');
            if (this.options.avsStatus === 'manual') {
                this.$avsUnverified.removeClass('hide');
                this.$avsConfirm.prop('checked', true);
            }
        },

        clearDropShip: function () {
            this.setEnabled(false);
            this.$form[0].reset();
            this.clearFieldErrors();
            this.resetAvsUi();
            this.syncDestinationTypeButtons();
        },

        syncDestinationTypeButtons: function () {
            this.$form.find('.dropship-dest-btn').each(function () {
                var $btn = $(this);
                $btn.toggleClass('is-selected', $btn.find('input[type="radio"]').is(':checked'));
            });
        },

        syncHiddenFields: function () {
            $('#dropShipEnabledHidden').val(this.enabled && this.applied ? 'true' : 'false');
            $('#dropShipDestinationTypeHidden').val(this.applied ? (this.address.destinationType || '') : '');
            $('#dropShipEmailHidden').val(this.applied ? (this.address.email || '') : '');
            $('#dropShipShippingNotesHidden').val(this.applied ? (this.options.shippingNotes || '') : '');
            $('#dropShipAvsStatusHidden').val(this.applied ? (this.options.avsStatus || '') : '');
        },

        renderAppliedAddress: function () {
            var addr = this.address;
            var notes = this.options.shippingNotes;
            var destinationLabel = DESTINATION_TYPE_LABELS[addr.destinationType] || addr.destinationType || '';

            $('#dropShipAppliedBody').html(
                (destinationLabel ? '<div class="dropship-applied-type">' + this.escape(destinationLabel) + '</div>' : '') +
                '<strong>' + this.escape(addr.company) + '</strong><br>' +
                'Attn: ' + this.escape(addr.attentionTo) + '<br>' +
                this.escape(addr.address1) + '<br>' +
                (addr.address2 ? this.escape(addr.address2) + '<br>' : '') +
                this.escape(addr.city) + ',&nbsp;' + this.escape(addr.state) + '&nbsp;' + this.escape(addr.postalCode) + '<br>' +
                this.escape(addr.country) + '<br>' +
                this.escape(addr.phone) + '<br>' +
                this.escape(addr.email)
            );

            if (notes) {
                $('#dropShipAppliedNotes')
                    .removeClass('hide')
                    .html('<strong>Shipping notes:</strong> ' + this.escape(notes));
            } else {
                $('#dropShipAppliedNotes').addClass('hide').empty();
            }

            this.$dropShipBox.removeClass('hide');
        },

        validatePoNumber: function (showError) {
            var value = $.trim(this.$poNumber.val());
            var valid = value.length > 0;
            $('.purchase-order-no-error').toggleClass('hide', valid || !showError);
            this.$poNumber.closest('.po_number').toggleClass('has-error', !valid && showError);
            return valid;
        },

        syncPlaceOrderState: function () {
            var termsOk = this.$terms.is(':checked');
            var dropShipOk = !this.enabled || this.applied;
            this.$placeOrder.prop('disabled', !(termsOk && dropShipOk));
        },

        placeOrder: function () {
            var errors = [];

            if (!this.validatePoNumber(true)) {
                errors.push('Please enter a PO number.');
            }
            if (!$('.update-shipping-method-custom:checked').length) {
                errors.push('Please select a shipping method.');
                $('.ship-meth-error').removeClass('hide');
            }
            if (this.enabled && !this.applied) {
                errors.push('Please apply a drop ship destination.');
            }
            if (!this.$terms.is(':checked')) {
                errors.push('Please accept the Terms and Conditions.');
                $('.terms-and-cond-error').removeClass('hide');
            }

            if (errors.length) {
                this.$fieldError.removeClass('hide').text(errors[0]);
                $('html, body').animate({ scrollTop: this.$fieldError.offset().top - 80 }, 250);
                return;
            }

            this.$fieldError.addClass('hide');
            this.showConfirmation();
        },

        showConfirmation: function () {
            var addr = this.applied ? this.address : DEFAULT_WAREHOUSE;
            var shipLabel = this.shippingMethod === 'PICKUP' ? 'Pickup' : 'Prepaid';
            var destLabel = this.applied
                ? 'Drop ship to ' + addr.company
                : 'Ship to warehouse';

            $('#confirmShipMethod').text(shipLabel);
            $('#confirmDestination').html(
                destLabel + '<br>' +
                this.escape(addr.address1) + '<br>' +
                this.escape(addr.city) + ', ' + this.escape(addr.state) + ' ' + this.escape(addr.postalCode)
            );
            $('#confirmPo').text(this.$poNumber.val());
            if (this.applied && this.options.shippingNotes) {
                $('#confirmNotes').text(this.options.shippingNotes);
                $('#confirmNotesRow').removeClass('hide');
            } else {
                $('#confirmNotesRow').addClass('hide');
            }
            $('#orderConfirmDialog').modal('show');
        },

        adjustQuantity: function (delta) {
            var $input = $('.checkout-review-section-quantity');
            var qty = parseInt($input.val(), 10) || 1;
            var next = Math.max(1, qty + delta);
            $input.val(next);
            this.updateOrderTotals(next);
            this.syncMinOrderEligibility();
        },

        updateOrderTotals: function (qty) {
            var total = this.formatMoney(UNIT_PRICE * qty);
            $('.checkoutSubTotal div').first().text('$ ' + total);
            $('.summary-row .summary-column.right').first().text('$ ' + total);
            $('.total-price.summary-column.right').text('$ ' + total);
            $('.total-price.summary-column.left strong').text('Order Total (' + qty + (qty === 1 ? ' unit)' : ' units)'));
        },

        getOrderTotal: function () {
            var qty = parseInt($('.checkout-review-section-quantity').val(), 10) || 1;
            return UNIT_PRICE * qty;
        },

        formatMoney: function (value) {
            return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },

        parseDemoParam: function () {
            var query = window.location.search.replace(/^\?/, '');
            if (!query) {
                return '';
            }
            var value = '';
            query.split('&').forEach(function (pair) {
                var parts = pair.split('=');
                var key = decodeURIComponent(parts[0] || '').toLowerCase();
                if (key === 'dropship') {
                    value = decodeURIComponent(parts[1] || '').toLowerCase();
                }
            });
            if (value === 'min' || value === 'minimum') {
                return 'min';
            }
            if (value === 'restricted' || value === 'item') {
                return 'restricted';
            }
            if (value === 'both' || value === 'all') {
                return 'both';
            }
            return '';
        },

        applyDemoMode: function () {
            if (this.demoMode === 'min') {
                $('.checkout-review-section-quantity').val(1);
                this.updateOrderTotals(1);
                this.$demoMode.removeClass('hide').text('Demo: under minimum');
                this.syncMinOrderEligibility();
                return;
            }
            if (this.demoMode === 'restricted') {
                this.$demoMode.removeClass('hide').text('Demo: restricted item');
                this.$restrictedBadge.removeClass('hide');
                this.setIneligible('This order includes an item that cannot be drop shipped.');
                return;
            }
            if (this.demoMode === 'both') {
                $('.checkout-review-section-quantity').val(1);
                this.updateOrderTotals(1);
                this.$demoMode.removeClass('hide').text('Demo: under minimum + restricted item');
                this.$restrictedBadge.removeClass('hide');
                this.setIneligible(
                    'This order is under the $' + this.formatMoney(MIN_DROPSHIP_TOTAL) +
                    ' drop ship minimum and includes a restricted item.'
                );
            }
        },

        syncMinOrderEligibility: function () {
            if (this.demoMode !== 'min') {
                return;
            }
            var total = this.getOrderTotal();
            if (total >= MIN_DROPSHIP_TOTAL) {
                this.clearIneligible();
                return;
            }
            if (this.enabled || this.applied) {
                this.setEnabled(false);
            }
            this.setIneligible(
                'Drop ship requires a minimum order of $' + this.formatMoney(MIN_DROPSHIP_TOTAL) +
                '. Your order total is $' + this.formatMoney(total) + '.'
            );
        },

        setIneligible: function (reason) {
            this.ineligibleReason = reason;
            this.$ineligibleReason.text(reason);
            this.$ineligible.removeClass('hide');
            this.$toggleBox.addClass('is-ineligible');
            this.$openBtn.prop('disabled', true);
        },

        clearIneligible: function () {
            this.ineligibleReason = '';
            this.$ineligible.addClass('hide');
            this.$ineligibleReason.empty();
            this.$toggleBox.removeClass('is-ineligible');
            this.$openBtn.prop('disabled', this.shippingMethod === 'PICKUP');
        },

        escape: function (value) {
            return $('<div/>').text(value == null ? '' : String(value)).html();
        }
    };

    window.DropShipCheckout = DropShipCheckout;

    $(function () {
        DropShipCheckout.init();
    });
}(jQuery));
