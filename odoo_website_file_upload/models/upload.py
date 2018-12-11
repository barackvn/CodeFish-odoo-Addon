# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.
from odoo import fields, models, api, _

class ir_attachment(models.Model):
    _inherit='ir.attachment'

    sale_order_id  =  fields.Many2one('sale.order', 'Sale Order')

class sale_order(models.Model):
    _inherit='sale.order'


    @api.multi
    def _get_attachment_count(self):
        for order in self:
            attachment_ids = self.env['ir.attachment'].search([('sale_order_id','=',order.id)])
            order.attachment_count = len(attachment_ids)
        
    attachment_count  =  fields.Integer('Attachments', compute='_get_attachment_count')
    

    @api.multi
    def attachment_on_sale_order_button(self):
        
        self.ensure_one()
        return {
            'name': 'Attachment.Details',
            'type': 'ir.actions.act_window',
            'view_mode': 'kanban,tree,form',
            'res_model': 'ir.attachment',
            'domain': [('sale_order_id', '=', self.id)],
            
        }
        
        
        
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:    
