# -*- coding: utf-8 -*-

from odoo import models, fields, api


class ProductSupplierinfo(models.Model):
    _inherit = 'product.supplierinfo'

    barcode = fields.Char('Barcode', related='product_tmpl_id.barcode')
    standard_price = fields.Float('Cost', related='product_tmpl_id.standard_price')
    qty_available = fields.Float('Quantity On Hand', related='product_tmpl_id.qty_available')
    total = fields.Float(compute='_value_pc', string='Total')

    @api.multi
    @api.depends('standard_price', 'qty_available')
    def _value_pc(self):
        for line in self:
            line.total = line.standard_price * line.qty_available
