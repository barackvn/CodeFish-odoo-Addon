import xmlrpclib
import json
import time
import logging

__logger = logging.getLogger(__name__)

start_time = time.time()

database = 'v11_pos_dev'
login = 'admin'
password = '1'
url = 'http://localhost:8011'

common = xmlrpclib.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(database, login, password, {})

models = xmlrpclib.ServerProxy(f'{url}/xmlrpc/object')

with open("img.png", "rb") as f:
    data = f.read()
    for i in range(100):
        vals = {
            'list_price': i,
            'description': u'description',
            'display_name': f'Product - {str(i)}',
            'name': f'Product : {str(i)}',
            'pos_categ_id': 1,
            'to_weight': u'True',
            'image': data.encode("base64"),
        }
        models.execute_kw(database, uid, password, 'product.product', 'create', [vals])
        __logger.info(f'created: {i}')
