"use strict";
odoo.define('pos_retail.screen_sale_orders', function (require) {

    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');
    var core = require('web.core');
    var gui = require('point_of_sale.gui');
    var rpc = require('pos.rpc');
    var qweb = core.qweb;

    var sale_orders = screens.ScreenWidget.extend({ // sale orders screen, booked orders
        template: 'sale_orders',

        init: function (parent, options) {
            var self = this;
            this._super(parent, options);
            this.sale_orders_cache = new screens.DomCache();
            this.sale_selected = null;
            this.pos.bind('sync:sale_orders', function (sale_id) {
                var current_screen = self.pos.gui.get_current_screen();
                if (current_screen == 'sale_orders' && self.sale_selected && self.sale_selected['id'] == sale_id) {
                    self.show();
                    var sale = self.pos.db.sale_order_by_id[sale_id];
                    self.display_sale_order(sale);
                }
            }, this);
        },

        show: function (options) {
            var sale_selected = this.pos.sale_selected;
            this._super(options);
            var self = this;
            this.$('.back').click(function () {
                self.gui.show_screen('products');
            });
            this.auto_complete_search();
            var search_timeout = null;
            this.render_sale_orders(this.pos.db.sale_orders);
            this.$('.client-list-contents').delegate('.sale_row', 'click', function (event) {
                self.order_select(event, $(this), parseInt($(this).data('id')));
            });
            var search_timeout = null;

            if (this.pos.config.iface_vkeyboard && this.chrome.widget.keyboard) {
                this.chrome.widget.keyboard.connect(this.$('.searchbox input'));
            }

            this.$('.searchbox input').on('keypress', function (event) {
                clearTimeout(search_timeout);
                var searchbox = this;
                search_timeout = setTimeout(function () {
                    self.perform_search(searchbox.value, event.which === 13);
                }, 70);
                var contents = self.$('.sale_order_detail');
                contents.empty();
            });
            this.$('.booked_order_button').click(function () {
                var sale_orders = _.filter(self.pos.db.sale_orders, function (order) {
                    return order['book_order'] == true && (order['state'] == 'draft' || order['state'] == 'sent');
                });
                var contents = self.$('.sale_order_detail');
                contents.empty();
                self.render_sale_orders(sale_orders);

            });
            this.$('.sale_lock_button').click(function () {
                var sale_orders = _.filter(self.pos.db.sale_orders, function (order) {
                    return order['state'] == 'sale' || order['state'] == 'done';
                });
                var contents = self.$('.sale_order_detail');
                contents.empty();
                self.render_sale_orders(sale_orders);
            });
            this.$('.searchbox .search-clear').click(function () {
                var contents = self.$('.sale_order_detail');
                contents.empty();
                self.clear_search();
            });
            if (sale_selected) {
                var sale = self.pos.db.sale_order_by_id[sale_selected['id']];
                self.display_sale_order(sale);
            }
        },
        clear_search: function () {
            var contents = this.$('.sale_order_detail');
            contents.empty();
            this.render_sale_orders(this.pos.db.sale_orders);
            this.$('.searchbox input')[0].value = '';
            this.$('.searchbox input').focus();
        },
        perform_search: function (query, associate_result) {
            var orders;
            if (query) {
                orders = this.pos.db.search_sale_orders(query);
                if (associate_result && orders.length === 1) {
                    return this.display_sale_order(orders[0]);
                }
                return this.render_sale_orders(orders);
            } else {
                sale_orders = this.pos.db.sale_orders;
                return this.render_sale_orders(sale_orders);
            }
        },
        auto_complete_search: function () {
            var self = this;
            var $search_box = $('.search-pos-order >input');
            if ($search_box) {
                $search_box.autocomplete({
                    source: this.pos.db.sale_orders_autocomplete,
                    minLength: this.pos.config.min_length_search,
                    select: function (event, ui) {
                        if (ui && ui['item'] && ui['item']['value']) {
                            var order = self.pos.db.sale_order_by_id[ui['item']['value']];
                            self.display_sale_order(order);
                            setTimeout(function () {
                                self.clear_search();
                            }, 1000);
                        }
                    }
                });
            }
        },
        partner_icon_url: function (id) {
            return '/web/image?model=res.partner&id=' + id + '&field=image_small';
        },
        order_select: function (event, $order, id) {
            var order = this.pos.db.sale_order_by_id[id];
            this.$('.client-line').removeClass('highlight');
            $order.addClass('highlight');
            this.display_sale_order(order);
        },
        render_sale_orders: function (sales) {
            var contents = this.$el[0].querySelector('.sale_orders_table');
            contents.innerHTML = "";
            for (var i = 0, len = Math.min(sales.length, 1000); i < len; i++) {
                var sale = sales[i];
                var sale_row = this.sale_orders_cache.get_node(sale.id);
                if (!sale_row) {
                    var sale_row_html = qweb.render('sale_row', {widget: this, sale: sale});
                    var sale_row = document.createElement('tbody');
                    sale_row.innerHTML = sale_row_html;
                    sale_row = sale_row.childNodes[1];
                    this.sale_orders_cache.cache_node(sale.id, sale_row);
                }
                if (sale === this.sale_selected) {
                    sale_row.classList.add('highlight');
                } else {
                    sale_row.classList.remove('highlight');
                }
                contents.appendChild(sale_row);
            }
        },
        display_sale_order: function (sale) {
            this.sale_selected = sale;
            var self = this;
            var contents = this.$('.sale_order_detail');
            contents.empty();
            if (!sale) {
                return;
            }
            sale['link'] = window.location.origin + "/web#id=" + sale.id + "&view_type=form&model=sale.order";
            contents.append($(qweb.render('sale_order_detail', {widget: this, sale: sale})));
            var sale_lines = this.pos.db.sale_lines_by_sale_id[sale.id];
            if (sale_lines) {
                var line_contents = this.$('.lines_detail');
                line_contents.empty();
                line_contents.append($(qweb.render('sale_order_lines', {widget: this, lines: sale_lines})));
            }
            this.$('.print_quotation').click(function () {
                self.chrome.do_action('sale.action_report_saleorder', {
                    additional_context: {
                        active_ids: [self.sale_selected['id']]
                    }
                })
            });
            this.$('.action_report_pro_forma_invoice').click(function () {
                self.chrome.do_action('sale.action_report_saleorder', {
                    additional_context: {
                        active_ids: [self.sale_selected['id']]
                    }
                })
            });
            this.$('.action_confirm').click(function () {
                self.pos.gui.close_popup();
                return rpc.query({
                    model: 'sale.order',
                    method: 'action_confirm',
                    args:
                        [[self.sale_selected['id']]],
                    context: {
                        pos: true
                    }
                }).then(function () {
                    self.link = window.location.origin + "/web#id=" + self.sale_selected.id + "&view_type=form&model=sale.order";
                    return self.gui.show_popup('confirm', {
                        title: 'Done',
                        body: self.sale_selected['name'] + ' confirmed',
                        confirm: function () {
                            window.open(self.link, '_blank');
                        },
                        cancel: function () {
                            self.pos.gui.close_popup();
                        }
                    })
                }).fail(function (type, error) {
                    return self.pos.query_backend_fail(type, error);
                })
            });
            this.$('.action_done').click(function () {
                return rpc.query({
                    model: 'sale.order',
                    method: 'action_done',
                    args:
                        [[self.sale_selected['id']]],
                    context: {
                        pos: true
                    }
                }).then(function () {
                    self.link = window.location.origin + "/web#id=" + self.sale_selected.id + "&view_type=form&model=sale.order";
                    return self.gui.show_popup('confirm', {
                        title: 'Done',
                        body: 'Order processed to done, are you want open order ?',
                        confirmButtonText: 'Yes',
                        cancelButtonText: 'Close',
                        confirm: function () {
                            return window.open(self.link, '_blank');
                        },
                    })
                }).fail(function (type, error) {
                    return self.pos.query_backend_fail(type, error);
                })
            });
            this.$('.action_return').click(function () {
                if (self.sale_selected) {
                    self.pos.gui.show_popup('popup_stock_return_picking', {
                        sale: self.sale_selected,
                        title: 'Return sale order',
                        confirm: function () {
                            self.render_sale_orders(self.pos.db.sale_orders);
                        }
                    })
                }

            });
            this.$('.action_validate_picking').click(function () {
                if (self.sale_selected) {
                    return rpc.query({
                        model: 'sale.order',
                        method: 'action_validate_picking',
                        args:
                            [[self.sale_selected['id']]],
                        context: {
                            pos: true
                        }
                    }).then(function (picking_name) {
                        if (picking_name) {
                            self.link = window.location.origin + "/web#id=" + self.sale_selected.id + "&view_type=form&model=sale.order";
                            return self.pos.gui.show_popup('confirm', {
                                title: 'Done',
                                body: 'Order create delivery success, are you want open Picking now ?',
                                confirm: function () {
                                    window.open(self.link, '_blank');
                                },
                                cancel: function () {
                                    self.pos.gui.close_popup();
                                }
                            })
                        } else {
                            self.link = window.location.origin + "/web#id=" + self.sale_selected.id + "&view_type=form&model=sale.order";
                            return self.pos.gui.show_popup('confirm', {
                                title: 'Warning',
                                body: 'Order have 2 picking, please do manual',
                                confirm: function () {
                                    window.open(self.link, '_blank');
                                },
                                cancel: function () {
                                    self.pos.gui.close_popup();
                                }
                            })
                        }
                        return self.pos.gui.close_popup();
                    }).fail(function (type, error) {
                        return self.pos.query_backend_fail(type, error);
                    })
                }
            })
            this.$('.delivery_order').click(function () {
                if (self.sale_selected) {
                    var lines = self.pos.db.sale_lines_by_sale_id[self.sale_selected['id']];
                    var sale_selected = self.sale_selected;
                    if (!lines) {
                        return self.pos.gui.show_popup('confirm', {
                            title: 'Warning',
                            body: 'Sale order is blank lines, could not cover to pos order',
                        })
                    }
                    var order = new models.Order({}, {pos: self.pos, temporary: true});
                    order['name'] = self.sale_selected['name'];
                    order['sale_id'] = sale_selected['id'];
                    order['delivery_address'] = sale_selected['delivery_address'];
                    order['delivery_date'] = sale_selected['delivery_date'];
                    order['delivery_phone'] = sale_selected['delivery_phone'];
                    var partner_id = sale_selected['partner_id'];
                    var partner = self.pos.db.get_partner_by_id(partner_id[0]);
                    if (partner) {
                        order.set_client(partner);
                    } else {
                        return self.pos.gui.show_popup('confirm', {
                            title: 'Warning',
                            body: 'Partner ' + partner_id[1] + ' not available on pos, please update this partner active on POS',
                        })
                    }
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        var product = self.pos.db.get_product_by_id(line.product_id[0])
                        if (!product) {
                            return self.pos.gui.show_popup('confirm', {
                                title: 'Warning',
                                body: 'Product ' + line.product_id[1] + ' not available on pos, please checking to field available on pos for this product',
                            })
                        } else {
                            var new_line = new models.Orderline({}, {pos: self.pos, order: order, product: product});
                            new_line.set_unit_price(line.price_unit)
                            new_line.set_quantity(line.product_uom_qty, 'keep price');
                            order.orderlines.add(new_line);
                        }
                    }
                    if (self.sale_selected['payment_partial_amount'] && self.sale_selected['payment_partial_journal_id']) {
                        var payment_partial_journal_id = self.sale_selected['payment_partial_journal_id'][0];
                        var payment_partial_register = _.find(self.pos.cashregisters, function (cashregister) {
                            return cashregister.journal['id'] == payment_partial_journal_id;
                        });
                        if (payment_partial_register) {
                            var partial_paymentline = new models.Paymentline({}, {
                                order: order,
                                cashregister: payment_partial_register,
                                pos: self.pos
                            });
                            partial_paymentline.set_amount(self.sale_selected['payment_partial_amount']);
                            order.paymentlines.add(partial_paymentline);
                            order['amount_debit'] = order.get_total_with_tax() - self.sale_selected['payment_partial_amount']
                        } else {
                            return self.pos.gui.show_popup('confirm', {
                                title: 'Warning',
                                body: 'POS have not journal ' + self.sale_selected['payment_partial_journal_id'][1],
                            })
                        }
                    }
                    var orders = self.pos.get('orders');
                    orders.add(order);
                    self.pos.set('selectedOrder', order);
                    self.pos.gui.show_screen('receipt');
                }
            })
        }
    });
    gui.define_screen({name: 'sale_orders', widget: sale_orders});
});