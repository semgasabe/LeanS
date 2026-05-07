const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbW9xeGVqcG0wMDBmMXlyeXM4bXJqc3B2Iiwicm9sZSI6IkFETUlOIiwidGVuYW50SWQiOiJ0ZW5hbnRfZGVmYXVsdCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTc3Nzg4MjYxMiwiZXhwIjoxNzc3ODgzNTEyfQ.SpOe6dcKa2AAD-pTMcgKf0pXBcS5rRx-439zHJ3t2aY';

function request(method, path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Content-Length': data.length
      }
    };
    const req = http.request(opts, (res) => {
      let respBody = '';
      res.on('data', (d) => respBody += d);
      res.on('end', () => resolve(JSON.parse(respBody)));
    });
    req.write(data);
    req.end();
  });
}

async function test() {
  try {
    // 1. Create location
    const loc = await request('POST', '/api/v1/locations', {
      name: 'Warehouse A',
      address: '123 Main St'
    });
    console.log('✓ Location 1:', loc.id);

    // 2. Create location 2
    const loc2 = await request('POST', '/api/v1/locations', {
      name: 'Warehouse B',
      address: '456 Oak Ave'
    });
    console.log('✓ Location 2:', loc2.id);

    // 3. Create product
    const prod = await request('POST', '/api/v1/products', {
      name: 'Widget',
      sku: 'WIDGET-001-' + Date.now(),
      price: 19.99
    });
    console.log('✓ Product:', prod.id);

    // 4. Create inventory item 1
    const inv1 = await request('POST', '/api/v1/inventory', {
      productId: prod.id,
      locationId: loc.id,
      quantity: 100
    });
    console.log('✓ Inventory 1:', inv1.id, '(Qty: 100)');

    // 5. Create inventory item 2
    const inv2 = await request('POST', '/api/v1/inventory', {
      productId: prod.id,
      locationId: loc2.id,
      quantity: 50
    });
    console.log('✓ Inventory 2:', inv2.id, '(Qty: 50)');

    // 6. Test transfer
    const transfer = await request('POST', '/api/v1/inventory/transfer', {
      fromInventoryId: inv1.id,
      toInventoryId: inv2.id,
      quantity: 20,
      note: 'Test transfer'
    });
    
    console.log('\n✅ TRANSFER SUCCESS:');
    console.log(JSON.stringify(transfer, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  }
}

test();
