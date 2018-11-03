odoo.define('pos_retail.chromes', function (require) {
    "use strict";

    var chrome = require('point_of_sale.chrome');
    var core = require('web.core');
    var _t = core._t;
    var qweb = core.qweb;
    var session = require('web.session');

    chrome.Chrome.include({
        build_widgets: function () {
            this._super();
            if (this.pos.config.allow_lock_screen) {
                this.pos.default_screen = this.gui.default_screen;
                this.pos.startup_screen = this.gui.startup_screen;
                this.gui.set_startup_screen('login_page');
                this.gui.set_default_screen('login_page');
            }
        }
    });

    var CountItemWidget = chrome.StatusWidget.extend({
        template: 'CountItemWidget',
        init: function () {
            this._super(arguments[0], {});
            this.show = true;
        },
        start: function () {
            var self = this;
            this._super();
            $('.show_hide_buttons').click(function () {
                var current_screen = self.pos.gui.get_current_screen();
                if (current_screen == 'products') {
                    if (self.pos.show_left_buttons == true || self.pos.show_left_buttons == undefined) {
                        $('.buttons_pane').animate({width: 0}, 'fast');
                        $('.leftpane').animate({left: 0}, 'fast');
                        $('.rightpane').animate({left: 440}, 'fast');
                        $('.fa fa-list').toggleClass('highlight');
                        $('.show_hide_buttons .fa-list').toggleClass('fa-list fa-th');
                        self.pos.show_left_buttons = false;
                    } else {
                        $('.buttons_pane').animate({width: 300}, 'fast');
                        $('.leftpane').animate({left: 300}, 'fast');
                        $('.rightpane').animate({left: 740}, 'fast');
                        $('.show_hide_buttons .fa-th').toggleClass('fa-th fa-list');
                        self.pos.show_left_buttons = true;
                    }
                }
            });
        }
    });
    chrome.Chrome.include({
        build_widgets: function () {
            this.widgets = _.filter(this.widgets, function (widget) {
                return widget['name'] != 'count_item_widget';
            })
            this.widgets.push(
                {
                    'name': 'count_item_widget',
                    'widget': CountItemWidget,
                    'append': '.pos-branding',
                }
            );
            this._super();
        }
    });

    // validate delete order
    chrome.OrderSelectorWidget.include({
        deleteorder_click_handler: function (event, $el) {
            if (this.pos.config.validate_remove_order) {
                return this.pos.gui.show_popup('password', {
                    confirm: function (value) {
                        if (value != this.pos.user.pos_security_pin) {
                            return this.pos.gui.show_popup('confirm', {
                                title: 'Wrong',
                                body: 'Password not correct, please check pos secuirty pin',
                            })
                        } else {
                            var self = this;
                            var order = this.pos.get_order();
                            if (!order) {
                                return;
                            } else if (!order.is_empty()) {
                                this.gui.show_popup('confirm', {
                                    'title': _t('Destroy Current Order ?'),
                                    'body': _t('You will lose any data associated with the current order'),
                                    confirm: function () {
                                        self.pos.delete_current_order();
                                    },
                                });
                            } else {
                                this.pos.delete_current_order();
                            }
                        }
                    }
                })
            } else {
                return this._super()
            }
        },
        renderElement: function () {
            this._super();
            if (!this.pos.config.allow_remove_order || this.pos.config.allow_remove_order == false || this.pos.config.staff_level == 'marketing' || this.pos.config.staff_level == 'waiter' || this.pos.config.is_customer_screen) {
                this.$('.deleteorder-button').replaceWith('');
            }
            if (!this.pos.config.allow_add_order || this.pos.config.allow_add_order == false || this.pos.config.is_customer_screen) {
                this.$('.neworder-button').replaceWith('');
            }
            if (this.pos.config.is_customer_screen) {
                $('.pos .order-selector').css('display', 'none');
            }
        },
    });

    chrome.HeaderButtonWidget.include({
        renderElement: function () {
            var self = this;
            this._super();
            if (this.action) {
                this.$el.click(function () {
                    self.action();
                    if (self.pos.config.close_session) {
                        session.rpc("/web/session/destroy", {});
                        window.open("/web/login", "_self");
                    }
                });
            }
        },
    })
});
