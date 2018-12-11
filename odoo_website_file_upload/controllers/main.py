# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

import odoo.http as http
from odoo.http import request


class OdooWebsiteFileUpload(http.Controller):

    @http.route('/shop/payment/attachment/add', type='http', auth="public", website=True)
    def payment_attachment_add(self, url=None, upload=None, **post):
    
        cr, uid, context = request.cr, request.uid, request.context 

        order = request.website.sale_get_order()
                    
        Attachments = request.env['ir.attachment']  # registry for the attachment table
        
        upload_file = request.httprequest.files.getlist('upload')[0]
        data = upload_file.read()

        attachment_id = Attachments.create({
            'name': upload_file.filename,
            'type': 'binary',
            'datas': data.encode('base64'),
            'datas_fname': upload_file.filename,
            'public': True,
            'res_model': 'ir.ui.view',
            'sale_order_id' : order.id,
        })   
        
        return request.redirect('/shop/payment')
            	
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:        
