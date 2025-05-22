import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateViewer() {
  console.log('Generating data viewer...');
  
  try {
    // Fetch all data
    const { data: customers } = await supabase.from('customers').select('*');
    const { data: orders } = await supabase.from('orders').select('*');
    const { data: items } = await supabase.from('items').select('*');
    
    // Sanitize data (remove password hashes)
    const sanitizedCustomers = customers.map(({ password_hash, ...rest }) => rest);
    
    // Connect items to orders
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: items.filter(item => item.order_id === order.id)
    }));
    
    // Connect orders to customers
    const ordersWithCustomers = ordersWithItems.map(order => ({
      ...order,
      customer: sanitizedCustomers.find(customer => customer.id === order.customer_id)
    }));
    
    // Create data for the viewer
    const viewerData = {
      customers: sanitizedCustomers,
      orders: ordersWithCustomers,
      items,
      summary: {
        customerCount: customers.length,
        orderCount: orders.length,
        itemCount: items.length,
        totalItemValue: items.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0),
        totalPayoutValue: items.reduce((sum, item) => sum + Number(item.payout_value || 0), 0),
      }
    };
    
    // Generate HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dutch Thrift Data Viewer</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    header {
      background-color: #333;
      color: white;
      padding: 1rem;
      border-radius: 5px;
      margin-bottom: 2rem;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-value {
      font-size: 1.8rem;
      font-weight: bold;
      color: #3498db;
      margin: 10px 0;
    }
    .stat-label {
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 0.8rem;
      color: #7f8c8d;
    }
    .content-section {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .order-card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .order-items {
      margin-top: 15px;
    }
    .item-row {
      padding: 10px;
      border-bottom: 1px solid #eee;
      display: flex;
      flex-wrap: wrap;
    }
    .item-row:last-child {
      border-bottom: none;
    }
    .item-title {
      flex: 2;
      font-weight: 500;
    }
    .item-price {
      flex: 1;
      text-align: right;
    }
    .badge {
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
    }
    .badge-awaiting {
      background-color: #f39c12;
      color: white;
    }
    .badge-processing {
      background-color: #3498db;
      color: white;
    }
    .badge-completed {
      background-color: #2ecc71;
      color: white;
    }
    .collapse-btn {
      background: none;
      border: none;
      color: #3498db;
      cursor: pointer;
      font-size: 14px;
      padding: 5px;
      margin-top: 10px;
    }
    .collapse-btn:hover {
      text-decoration: underline;
    }
    .tabs {
      display: flex;
      margin-bottom: 20px;
      border-bottom: 1px solid #ddd;
    }
    .tab {
      padding: 10px 20px;
      cursor: pointer;
      background-color: #f2f2f2;
      border: 1px solid #ddd;
      border-bottom: none;
      margin-right: 5px;
      border-radius: 5px 5px 0 0;
    }
    .tab.active {
      background-color: white;
      font-weight: bold;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <header>
    <h1>Dutch Thrift Data Viewer</h1>
    <p>View your Supabase database contents</p>
  </header>
  
  <div class="dashboard">
    <div class="stat-card">
      <div class="stat-label">Consignors</div>
      <div class="stat-value">${viewerData.summary.customerCount}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Orders</div>
      <div class="stat-value">${viewerData.summary.orderCount}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Items</div>
      <div class="stat-value">${viewerData.summary.itemCount}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Value</div>
      <div class="stat-value">€${viewerData.summary.totalItemValue.toFixed(2)}</div>
    </div>
  </div>
  
  <div class="tabs">
    <div class="tab active" onclick="openTab(event, 'orders-tab')">Orders</div>
    <div class="tab" onclick="openTab(event, 'items-tab')">Items</div>
    <div class="tab" onclick="openTab(event, 'consignors-tab')">Consignors</div>
    <div class="tab" onclick="openTab(event, 'json-tab')">Raw JSON</div>
  </div>
  
  <div id="orders-tab" class="tab-content active">
    <div class="content-section">
      <h2>Orders</h2>
      ${viewerData.orders.map(order => `
        <div class="order-card">
          <div class="order-header">
            <div>
              <h3>Order ID: ${order.id.slice(0, 8)}</h3>
              <p>Customer: ${order.customer ? order.customer.name : 'Unknown'}</p>
              <p>Created: ${new Date(order.created_at).toLocaleString()}</p>
            </div>
            <div>
              <span class="badge badge-${order.status}">${order.status}</span>
              <p>Total: €${order.total_estimated_value}</p>
              <p>Payout: €${order.total_payout_value}</p>
            </div>
          </div>
          <div class="order-items">
            <h4>Items (${order.items.length})</h4>
            ${order.items.map(item => `
              <div class="item-row">
                <div class="item-title">${item.title}</div>
                <div class="item-price">€${item.estimated_value}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  
  <div id="items-tab" class="tab-content">
    <div class="content-section">
      <h2>Items</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Value</th>
            <th>Payout</th>
            <th>Commission</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${viewerData.items.map(item => `
            <tr>
              <td>${item.title}</td>
              <td>€${item.estimated_value}</td>
              <td>€${item.payout_value}</td>
              <td>${item.commission_rate}%</td>
              <td><span class="badge badge-${item.status}">${item.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  
  <div id="consignors-tab" class="tab-content">
    <div class="content-section">
      <h2>Consignors</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${viewerData.customers.map(customer => `
            <tr>
              <td>${customer.id.slice(0, 8)}</td>
              <td>${customer.name}</td>
              <td>${customer.email}</td>
              <td>${new Date(customer.created_at).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  
  <div id="json-tab" class="tab-content">
    <div class="content-section">
      <h2>Raw JSON Data</h2>
      <pre style="overflow: auto; max-height: 500px;">${JSON.stringify(viewerData, null, 2)}</pre>
    </div>
  </div>
  
  <script>
  function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].className = tabcontent[i].className.replace(" active", "");
    }
    tablinks = document.getElementsByClassName("tab");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).className += " active";
    evt.currentTarget.className += " active";
  }
  </script>
</body>
</html>
    `;
    
    // Write HTML to file
    fs.writeFileSync('dutch-thrift-viewer.html', html);
    
    console.log('Data viewer generated successfully!');
    console.log('Open dutch-thrift-viewer.html in your browser to view the data.');
    
  } catch (error) {
    console.error('Error generating viewer:', error);
  }
}

// Generate the viewer
generateViewer();