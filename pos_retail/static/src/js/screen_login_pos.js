"use strict";
odoo.define('pos_retail.login_pos', function (require) {

    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');

    var login_page = screens.ScreenWidget.extend({
        template: 'login_page',
        login: function () {
            var pos_security_pin = this.$('.pos_security_pin').val();
            if (this.pos.user.pos_security_pin == false) {
                return this.gui.show_popup('confirm', {
                    title: 'Warning',
                    body: 'Your account not set pos security pin, Please go to Setting / User and set pos pin',
                });
            }
            if (pos_security_pin == this.pos.user.pos_security_pin) {
                $('.pos-topheader').removeClass('oe_hidden');
                this.$('.pos_security_pin').value = '';
                var default_screen = this.pos.default_screen;
                var startup_screen = this.gui.startup_screen;
                this.gui.set_default_screen(default_screen);
                this.gui.set_startup_screen(startup_screen);
                this.gui.show_screen(default_screen);
            } else {
                return this.gui.show_popup('confirm', {
                    title: 'Wrong',
                    body: 'Wrong pos security pin, please check again'
                });
            }
        },
        show: function () {
            var self = this;
            $('#password').focus();
            $('#password').value = "";
            this.$('.confirm-login').click(function () {
                self.login()
            });
            this.$('.confirm-logout').click(function () {
                self.gui._close();
            });
            $('.pos-topheader').addClass('oe_hidden');
            this.pos.barcode_reader.set_action_callback({
                'login_security': _.bind(self.scan_barcode_pos_security_pin, self)
            });
            this._super();
        },
        scan_barcode_pos_security_pin: function (datas) {
            var barcode = datas['code'];
            if (this.pos.user['barcode'] == barcode) {
                $('.pos-topheader').removeClass('oe_hidden');
                this.$('.pos_security_pin').value = '';
                var default_screen = this.pos.default_screen;
                var startup_screen = this.gui.startup_screen;
                this.gui.set_default_screen(default_screen);
                this.gui.set_startup_screen(startup_screen);
                this.gui.show_screen(default_screen);
                return true
            } else {
                this.barcode_error_action(datas);
                return false;
            }
        }
    });
    gui.define_screen({name: 'login_page', widget: login_page});

    return {
        login_page: login_page
    };

});