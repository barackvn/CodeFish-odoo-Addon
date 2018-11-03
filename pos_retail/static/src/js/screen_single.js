odoo.define('pos_retail.screen_single', function (require) {
    var screens = require('point_of_sale.screens');
    var core = require('web.core');

    screens.ScreenWidget.include({
        init: function (parent, options) {
            var self = this;
            this.disable_leftpane = ['payment', 'clientlist'];
            this._super(parent, options);
            this.pos.bind('change:selectedOrder', function () {
                self.show_order_information();
            }, this);
        },
        show: function () {
            var self = this;
            this._super();
            if (this.pos.config.single_screen) {
                this.show_order_information();
            }
        },
        hide: function () {
            this._super();
            if (this.pos.config.single_screen) {
                this.show_order_information();
            }
        },
        renderElement: function () {
            this._super();
            if (this.pos.config.single_screen) {
                this.show_order_information();
            }
        },
        show_order_information: function () {
            var cur_screen = this.pos.gui.get_current_screen();
            if (this.pos.$order_html) {
                var is_screen_of_screens = _.indexOf(this.disable_leftpane, cur_screen);
                if (cur_screen && is_screen_of_screens != -1) {
                    this.$('.screen-content').css({
                        'width': '100%',
                        'max-width': '100%'
                    });
                    this.$('.screen-content').append(this.pos.$order_html);
                    this.$('.screen-content .searchbox').addClass('oe_hidden');
                    this.$('.left-content').css({
                        'left': '30%',
                        'right': '50%',
                        'top': '0px',
                    });
                    this.$('.order-container .order-scroller').css({
                        'width': '30%',
                        'right': '50%',
                    });
                    this.$('.right-content').css({
                        'left': '50%',
                        'top': '0px',
                    });
                    this.$('.bus-info').addClass('oe_hidden');
                    this.$('.header_order').addClass('oe_hidden');
                }
            }
            if (cur_screen == 'clientlist') {
                this.$('.order-scroller').css({
                    'width': '30%',
                    'right': '70%',
                });
                this.$('.top-content').css({
                    'left': '30%',
                });
                this.$('.full-content').css({
                    'left': '30%',
                });
                this.$('.top-content .searchbox').removeClass('oe_hidden');
            }
            if (cur_screen == 'products') {
                this.$('.order-container .order-scroller').css({
                    'width': '100%',
                    'right': '0%',
                });
                this.$('.bus-info').removeClass('oe_hidden');
                this.$('.header_order').removeClass('oe_hidden');
                if (!this.pos.hide_pads) {
                    this.$('.buttons_pane').css({
                            'width': '300px',
                            'right': '300px'
                        }
                    )
                }
            }
            if (cur_screen == 'payment') {
                this.$('.order-scroller').css({
                    'width': '30%',
                });
            }
        },
    });
});
