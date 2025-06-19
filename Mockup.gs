const MOCK_CONFIG = {
  NUM_LEADS: 25,
};

function populateAllSheetsWithMockData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const usersData = generateUsers(ss);
  const tiersData = generateCustomerTiers(ss);
  const leadsData = generateLeads(ss, usersData, tiersData);
  const cropsData = generateCrops(ss);
  const productsData = generateProducts(ss);
  const ordersData = generateOrders(ss, leadsData, usersData);
  
  generateOrderDetails(ss, ordersData, productsData);
  generateSalesHistory(ss, leadsData, usersData);
  generateReasons(ss);
  generateActivityLogs(ss, leadsData, usersData);
  generateLeadCrops(ss, leadsData, cropsData);
  
  ui.alert('✅ Sample Data Generated!', 'ข้อมูลตัวอย่างถูกสร้างขึ้นในชีตต่างๆ เรียบร้อยแล้ว', ui.ButtonSet.OK);
}

function generateUsers(ss) {
  const sheet = ss.getSheetByName('Users');
  if (sheet.getLastRow() > 1) return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const currentUserEmail = Session.getActiveUser().getEmail();
  const users = [
    ['U001', 'สมชาย ใจดี (Admin)', 'admin.example@youremaildomain.com', 'Admin', 'TRUE'],
    ['U002', 'สมศรี มีสุข (Sup)', 'supervisor.example@youremaildomain.com', 'Sup-Telesale', 'TRUE'],
    ['U003', `คุณ (${currentUserEmail})`, currentUserEmail, 'Telesales', 'TRUE'],
    ['U004', 'มานะ อดทน', 'mana.example@youremaildomain.com', 'Telesales', 'TRUE'],
    ['U005', 'ปิติ ยินดี', 'piti.example@youremaildomain.com', 'Telesales', 'FALSE'],
  ];
  sheet.getRange(2, 1, users.length, users[0].length).setValues(users);
  return users;
}

function generateCustomerTiers(ss) {
    const sheet = ss.getSheetByName('CustomerTiers');
    if (sheet.getLastRow() > 1) return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    const tiers = [ ['T01', 'Platinum', 'ลูกค้าระดับพรีเมียม ยอดซื้อสูง'], ['T02', 'Gold', 'ลูกค้าประจำ มีประวัติการซื้อที่ดี'], ['T03', 'Silver', 'ลูกค้าทั่วไป'], ['T04', 'New', 'ลูกค้าใหม่ ยังไม่เคยมีประวัติ'] ];
    sheet.getRange(2, 1, tiers.length, tiers[0].length).setValues(tiers);
    return tiers;
}

function generateLeads(ss, users, tiers) {
  const sheet = ss.getSheetByName('Leads');
  if (sheet.getLastRow() > 1) return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const leads = [];
  const firstNames = ['กวิน', 'จิรา', 'ธนพล', 'ปรียา', 'วีรศักดิ์', 'อารยา', 'ณัฐวุฒิ', 'สิริน'];
  const lastNames = ['วงศ์สว่าง', 'กิจเจริญ', 'สุวรรณโชติ', 'พรหมเทศ', 'จันทรประภา', 'อุดมศิลป์'];
  const statuses = ['New', 'Contacted', 'Qualified', 'Closed-Won', 'Closed-Lost'];
  const sources = ['Website', 'Facebook', 'Event'];
  const products = ['ปุ๋ยสูตร A', 'ยาฆ่าแมลง B', 'เมล็ดพันธุ์ C'];
  const telesalesUsers = users.filter(u => u[3] === 'Telesales');
  const sampleAddresses = [
      { addr: '123/45 หมู่ 6', sub: 'บางพูด', dist: 'ปากเกร็ด', prov: 'นนทบุรี', zip: '11120' }, { addr: '88 ซอยสุขุมวิท 101', sub: 'บางจาก', dist: 'พระโขนง', prov: 'กรุงเทพมหานคร', zip: '10260' },
      { addr: '555 ถนนมิตรภาพ', sub: 'ในเมือง', dist: 'เมือง', prov: 'นครราชสีมา', zip: '30000' }, { addr: '21/8 หมู่ 2', sub: 'สุเทพ', dist: 'เมือง', prov: 'เชียงใหม่', zip: '50200' }
  ];
  for (let i = 1; i <= MOCK_CONFIG.NUM_LEADS; i++) {
    const randomAddress = sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)];
    const leadId = `L${Date.now() + i}`;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const phone = '08' + Math.random().toString().slice(2, 10);
    const email = `${firstName.toLowerCase()}.${lastName.substring(0,2).toLowerCase()}@example.com`;
    const source = sources[Math.floor(Math.random() * sources.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const status = i < 5 ? 'Closed-Won' : statuses[Math.floor(Math.random() * statuses.length)]; // Ensure some are Closed-Won
    const assignedToUser = telesalesUsers[Math.floor(Math.random() * telesalesUsers.length)];
    const assignedToEmail = assignedToUser[2];
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    leads.push([
      leadId, firstName, lastName, phone, email, source, product, status,
      assignedToEmail, createdDate, new Date(), new Date(), tier[1], '',
      randomAddress.addr, randomAddress.sub, randomAddress.dist, randomAddress.prov, randomAddress.zip
    ]);
  }
  sheet.getRange(2, 1, leads.length, leads[0].length).setValues(leads);
  return sheet.getRange(2, 1, leads.length, sheet.getLastColumn()).getValues();
}

function generateLeadCrops(ss, leads, crops) {
    const sheet = ss.getSheetByName('LeadCrops');
    if (sheet.getLastRow() > 1) { return; }
    if (!leads || leads.length === 0 || !crops || crops.length === 0) return;
    const leadCrops = [];
    leads.slice(0, 15).forEach(lead => {
        const leadId = lead[0];
        const numCrops = Math.floor(Math.random() * 3) + 1;
        let usedCrops = new Set();
        for (let i = 0; i < numCrops; i++) {
            let randomCrop = crops[Math.floor(Math.random() * crops.length)];
            while(usedCrops.has(randomCrop[1])) {
                randomCrop = crops[Math.floor(Math.random() * crops.length)];
            }
            usedCrops.add(randomCrop[1]);
            const leadCropId = `LC${Date.now() + leadCrops.length + i}`;
            const rai = Math.floor(Math.random() * 50) + 1;
            const plantCount = Math.floor(Math.random() * 1000) + 50;
            leadCrops.push([leadCropId, leadId, randomCrop[1], rai, plantCount]);
        }
    });
    if (leadCrops.length > 0) {
        sheet.getRange(2, 1, leadCrops.length, leadCrops[0].length).setValues(leadCrops);
    }
}

function generateProducts(ss) {
    const sheet = ss.getSheetByName('Products');
    if (sheet.getLastRow() > 1) return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    const products = [
        ['P001', 'ปุ๋ยเร่งดอก สูตร 8-24-24', 'FERT-001', 850, 100, true],
        ['P002', 'ยาฆ่าเพลี้ยไฟ ไซเปอร์แม็ก', 'PEST-001', 450, 50, true],
        ['P003', 'เมล็ดพันธุ์ข้าวโพดหวาน', 'SEED-001', 1200, 200, true],
        ['P004', 'ฮอร์โมนพืช ไคโตซาน', 'HORM-001', 600, 80, true],
        ['P005', 'ปุ๋ยยูเรีย 46-0-0', 'FERT-002', 950, 120, false]
    ];
    sheet.getRange(2, 1, products.length, products[0].length).setValues(products);
    return products;
}

function generateOrders(ss, leads, users) {
    const sheet = ss.getSheetByName('Orders');
    if (sheet.getLastRow() > 1) return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    if (!leads || leads.length === 0) return [];
    const orders = [];
    const salespersons = users.filter(u => u[3] === 'Telesales');
    leads.slice(0, 5).forEach((lead, i) => {
        const orderId = `ORD${Date.now() + i}`;
        const orderDate = new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000);
        const leadId = lead[0];
        const customerName = `${lead[1]} ${lead[2]}`;
        const totalAmount = Math.floor(Math.random() * 5000) + 1000;
        const status = 'Pending';
        const shipping = 'Kerry Express';
        const shippingDate = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000);
        const createdBy = salespersons[Math.floor(Math.random() * salespersons.length)][2];
        orders.push([orderId, orderDate, leadId, customerName, totalAmount, status, shipping, shippingDate, createdBy]);
    });
    sheet.getRange(2, 1, orders.length, orders[0].length).setValues(orders);
    return orders;
}

function generateOrderDetails(ss, orders, products) {
    const sheet = ss.getSheetByName('OrderDetails');
    if (sheet.getLastRow() > 1) return;
    if (!orders || orders.length === 0 || !products || products.length === 0) return;
    const details = [];
    orders.forEach(order => {
        const orderId = order[0];
        const numItems = Math.floor(Math.random() * 3) + 1;
        for(let i=0; i < numItems; i++) {
            const detailId = `OD${Date.now() + details.length}`;
            const product = products[Math.floor(Math.random() * products.length)];
            const productId = product[0];
            const productName = product[1];
            const price = product[3];
            const quantity = Math.floor(Math.random() * 5) + 1;
            const subtotal = price * quantity;
            details.push([detailId, orderId, productId, productName, quantity, price, subtotal]);
        }
    });
    if (details.length > 0) {
        sheet.getRange(2, 1, details.length, details[0].length).setValues(details);
    }
}
function generateSalesHistory(ss, leads, users) {
    const sheet = ss.getSheetByName('SalesHistory');
    if (sheet.getLastRow() > 1) return;
    const sales = [];
    const products = [ { name: 'ปุ๋ยสูตร A', price: 550 }, { name: 'ยาฆ่าแมลง B', price: 320 }, { name: 'เมล็ดพันธุ์ C', price: 1500 }, { name: 'อุปกรณ์ D', price: 800 } ];
    const salespersons = users.filter(u => u[3] === 'Telesales');
    if (!leads || leads.length === 0) return;
    leads.slice(0, 10).forEach(lead => {
        const numberOfSales = Math.floor(Math.random() * 4);
        for (let i = 0; i < numberOfSales; i++) {
            const saleId = `S${Date.now() + sales.length}`;
            const leadId = lead[0];
            const salesperson = salespersons[Math.floor(Math.random() * salespersons.length)];
            const userId = salesperson[0];
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 5) + 1;
            const totalPrice = product.price * quantity;
            const saleDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
            sales.push([saleId, leadId, userId, product.name, quantity, product.price, totalPrice, saleDate]);
        }
    });
    if (sales.length > 0) { sheet.getRange(2, 1, sales.length, sales[0].length).setValues(sales); }
}

function generateActivityLogs(ss, leads, users) {
    const sheet = ss.getSheetByName('ActivityLogs');
    if (sheet.getLastRow() > 1) { return; }
    const activities = [];
    const outcomes = ["รับสาย-ได้สนทนา", "ไม่รับสาย", "ตัดสายทิ้ง"];
    const salespersons = users.filter(u => u[3] === 'Telesales');
    if (!leads || leads.length === 0 || salespersons.length === 0) return;
    leads.forEach(lead => {
        const numberOfActivities = Math.floor(Math.random() * 5);
        for (let i = 0; i < numberOfActivities; i++) {
            const activityId = `ACT${Date.now() + activities.length}`;
            const leadId = lead[0];
            const timestamp = new Date(Date.now() - (Math.random() * 120 * 24 * 60 * 60 * 1000));
            const agent = salespersons[Math.floor(Math.random() * salespersons.length)];
            const agentEmail = agent[2];
            const callOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
            const salesStatus = lead[7];
            const notes = `บันทึกการติดตามครั้งที่ ${i + 1}`;
            const duration = Math.floor(Math.random() * 300) + 30;
            activities.push([activityId, leadId, timestamp, agentEmail, callOutcome, salesStatus, notes, duration]);
        }
    });
    if (activities.length > 0) { sheet.getRange(2, 1, activities.length, activities[0].length).setValues(activities); }
}

function generateReasons(ss) {
    const sheet = ss.getSheetByName('Reasons');
    if (sheet.getLastRow() > 1) return;
    const reasons = [ ['R01', 'ราคาสูงเกินไป', 'TRUE'], ['R02', 'ยังไม่สนใจตอนนี้', 'TRUE'], ['R03', 'ใช้ของเจ้าอื่นอยู่', 'TRUE'], ['R04', 'ติดต่อไม่ได้', 'FALSE'] ];
    sheet.getRange(2, 1, reasons.length, reasons[0].length).setValues(reasons);
}

function generateCrops(ss) {
    const sheet = ss.getSheetByName('Crops');
    if (sheet.getLastRow() > 1) return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    const crops = [ ['C01', 'มะม่วง'], ['C02', 'มะพร้าว'], ['C03', 'ทุเรียน'], ['C04', 'ข้าวโพด'], ['C05', 'อ้อย'] ];
    sheet.getRange(2, 1, crops.length, crops[0].length).setValues(crops);
    return crops;
}