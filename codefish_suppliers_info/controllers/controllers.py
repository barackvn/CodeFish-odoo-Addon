# -*- coding: utf-8 -*-
from odoo import http

# class CodefishSuppliersInfo(http.Controller):
#     @http.route('/codefish_suppliers_info/codefish_suppliers_info/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/codefish_suppliers_info/codefish_suppliers_info/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('codefish_suppliers_info.listing', {
#             'root': '/codefish_suppliers_info/codefish_suppliers_info',
#             'objects': http.request.env['codefish_suppliers_info.codefish_suppliers_info'].search([]),
#         })

#     @http.route('/codefish_suppliers_info/codefish_suppliers_info/objects/<model("codefish_suppliers_info.codefish_suppliers_info"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('codefish_suppliers_info.object', {
#             'object': obj
#         })