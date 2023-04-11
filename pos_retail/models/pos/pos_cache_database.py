# -*- coding: utf-8 -*-
from odoo import api, models, fields, registry
import logging
import json
import ast
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
import odoo
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
from datetime import datetime, timedelta, MAXYEAR
import base64
import threading

_logger = logging.getLogger(__name__)


class pos_cache_database(models.Model):
    _name = "pos.cache.database"
    _description = "Management POS database"

    res_id = fields.Char('Id')
    res_model = fields.Char('Model')
    data = fields.Text('Data')

    @api.model
    def sync_orders(self, config_id, datas):
        config = self.env['pos.config'].sudo().browse(config_id)
        for data in datas:
            value = {
                'data': data,
                'action': 'new_order',
                'bus_id': config.bus_id.id,
                'order_uid': data['uid']
            }

            self.env['bus.bus'].sendmany(
                [[(self.env.cr.dbname, 'pos.bus', config.user_id.id), json.dumps({
                    'user_send_id': self.env.user.id,
                    'value': value
                })]])

    @api.multi
    def refresh_cache(self, bus, database_parameter, config_id):
        database = self.load_master_data(database_parameter, config_id)
        self.env['pos.cache.database'].load_master_data()
        datas = {
            'cache': base64.encodestring(json.dumps(database).encode('utf-8')),
        }
        return bus.write(datas)

    @api.model
    def get_cache(self, config_id):
        config=self.env['pos.config'].browse(config_id)
        if config.bus_id and config.bus_id.cache:
            return json.loads(base64.decodestring(config.bus_id.cache).decode('utf-8'))
        else:
            return False

    @api.model
    def load_master_data(self, database_parameter={}, config_id=None):
        _logger.info('begin load_master_data')
        database = {}
        domain = [model for model, load in database_parameter.items() if load == True]
        if caches := self.search_read(
            [('res_model', 'in', tuple(domain))],
            ['res_id', 'res_model', 'data', 'write_date'],
        ):
            for model, load in database_parameter.items():
                if load == True:
                    database[model] = []
            _logger.info(f'len of caches: {len(caches)}')
            for cache in caches:
                vals = json.loads(cache['data'])
                vals['write_date'] = cache['write_date']
                database[cache['res_model']].append(vals)
        _logger.info('end load_master_data')
        return database or False

    @api.multi
    def get_fields_by_model(self, model_name):
        if params := self.env['ir.config_parameter'].sudo().get_param(model_name):
            params = ast.literal_eval(params)
            return params.get('fields', [])
        else:
            list_fields = self.env[model_name].fields_get()
            return [
                k
                for k, v in list_fields.items()
                if v['type'] not in ['one2many', 'binary']
            ]

    @api.multi
    def get_domain_by_model(self, model_name):
        if params := self.env['ir.config_parameter'].sudo().get_param(model_name):
            params = ast.literal_eval(params)
            return params.get('domain', [])
        else:
            return []

    @api.model
    def insert_data(self, datas, model, first_install=False):
        all_fields = self.env[model].fields_get()
        version_info = odoo.release.version_info[0]
        if version_info == 12 and all_fields:
            for data in datas:
                for field, value in data.items():
                    if field == 'model':
                        continue
                    if all_fields[field] and all_fields[field]['type'] in ['date', 'datetime'] and value:
                        data[field] = value.strftime(DEFAULT_SERVER_DATETIME_FORMAT)
        if first_install:
            for data in datas:
                self.create({
                    'res_id': str(data['id']),
                    'res_model': model,
                    'data': json.dumps(data)
                })
        else:
            for data in datas:
                if last_caches := self.search(
                    [('res_id', '=', str(data['id'])), ('res_model', '=', model)]
                ):
                    last_caches.write({
                        'data': json.dumps(data)
                    })
                else:
                    self.create({
                        'res_id': str(data['id']),
                        'res_model': model,
                        'data': json.dumps(data)
                    })
        return True

    def sync_to_pos(self, data):
        _logger.info('begin sync_to_pos')
        if data['model'] == 'product.product':
            data['price'] = data['list_price']
        sessions = self.env['pos.session'].sudo().search([
            ('state', '=', 'opened')
        ])
        self.insert_data([data], data['model'])
        for session in sessions:
            self.env['bus.bus'].sendmany(
                [[(self.env.cr.dbname, 'pos.sync.data', session.user_id.id), data]])
        return True

    @api.model
    def remove_record(self, data):
        self.search([('res_id', '=', str(data['id'])), ('res_model', '=', data['model'])]).unlink()
        sessions = self.env['pos.session'].sudo().search([
            ('state', '=', 'opened')
        ])
        data['deleted'] = True
        for session in sessions:
            self.env['bus.bus'].sendmany(
                [[(self.env.cr.dbname, 'pos.sync.data', session.user_id.id), data]])
        return True

    @api.model
    def save_parameter_models_load(self, model_datas):
        set_param = self.env['ir.config_parameter'].sudo().set_param
        for model_name, value in model_datas.items():
            set_param(model_name, value)
        return True

    @api.model
    def get_stock_datas(self, location_id=None, product_need_update_onhand=[]):
        _logger.info('begin get_stock_datas()')
        location = self.env['stock.location'].browse(location_id)
        _logger.info(product_need_update_onhand)
        _logger.info(location.name)
        values = {}
        datas = []
        datas = (
            self.env['product.template']
            .with_context(location=location_id)
            .search_read(
                [
                    ('type', '=', 'product'),
                    ('available_in_pos', '=', True),
                    ('id', 'in', product_need_update_onhand),
                ],
                ['name', 'qty_available', 'default_code'],
            )
            if product_need_update_onhand
            else self.env['product.template']
            .with_context(location=location_id)
            .search_read(
                [('type', '=', 'product'), ('available_in_pos', '=', True)],
                ['name', 'qty_available', 'default_code'],
            )
        )
        for data in datas:
            values[data['id']] = data['qty_available']
            if products := self.env['product.product'].search(
                [('product_tmpl_id', '=', data['id'])]
            ):
                values[products[0].id] = data['qty_available']
        _logger.info(values)
        _logger.info('end get_stock_datas()')
        return values

    @api.model
    def get_datas_updated(self, write_date):
        _logger.info('begin get_datas_updated()')
        _logger.info(write_date)
        if not write_date:
            return []
        write_date = datetime.strptime(write_date, DEFAULT_SERVER_DATETIME_FORMAT)
        write_date = write_date + timedelta(seconds=1)
        write_date = write_date.strftime(DEFAULT_SERVER_DATETIME_FORMAT)
        datas = []
        caches = self.search_read(
            [('write_date', '>', write_date)], ['res_id', 'res_model', 'data', 'write_date'])
        for cache in caches:
            val = json.loads(cache['data'])
            val['write_date'] = cache['write_date']
            val['model'] = cache['res_model']
            datas.append(val)
        return datas
