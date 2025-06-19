/**
 * @fileoverview Setup.gs
 * @version 2.2 - Added Order Management Schemas
 */

function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('⚙️ CRM Setup')
      .addItem('1. Run Initial Database Setup', 'initialDatabaseSetup')
      .addItem('2. Populate with Sample Data', 'populateAllSheetsWithMockData')
      .addSeparator()
      .addItem('เมนูลับ: ล้างข้อมูลและชีตทั้งหมด', '_DANGER_deleteAllDataAndSheets_')
      .addToUi();
}

const DB_SCHEMA = {
  'Leads': [ 'LeadID', 'FirstName', 'LastName', 'PhoneNumber', 'Email', 'Source', 'ProductInterest', 'Status', 'AssignedTo', 'DateCreated', 'DateAssigned', 'LastUpdated', 'CustomerGrade', 'NextAppointmentDate', 'Address', 'SubDistrict', 'District', 'Province', 'PostalCode' ],
  'Users': [ 'UserID', 'FullName', 'Email', 'Role', 'IsActive' ],
  'LeadCrops': [ 'LeadCropID', 'LeadID', 'CropName', 'Rai', 'PlantCount' ],
  'SalesHistory': [ 'SaleID', 'LeadID', 'UserID', 'ProductName', 'Quantity', 'PricePerUnit', 'TotalPrice', 'SaleDate' ],
  'ActivityLogs': [ 'ActivityID', 'LeadID', 'Timestamp', 'AgentID', 'CallOutcome', 'SalesStatus', 'Notes', 'CallDuration_seconds' ],
  'Products': [ 'ProductID', 'ProductName', 'SKU', 'Price', 'Stock', 'IsActive' ],
  'Orders': [ 'OrderID', 'OrderDate', 'LeadID', 'CustomerName', 'TotalAmount', 'Status', 'ShippingMethod', 'ShippingDate', 'CreatedBy' ],
  'OrderDetails': [ 'OrderDetailID', 'OrderID', 'ProductID', 'ProductName', 'Quantity', 'PricePerUnit', 'SubTotal' ],
  'Reasons': [ 'ReasonID', 'ReasonText', 'IsActive' ],
  'Crops': [ 'CropID', 'CropName' ],
  'CustomerTiers': [ 'TierID', 'TierName', 'Description' ]
};

function initialDatabaseSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  let sheetsCreated = 0;
  let headersWritten = 0;
  for (const sheetName in DB_SCHEMA) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheetsCreated++;
    }
    if (sheet.getRange('A1').isBlank()) {
      const headers = DB_SCHEMA[sheetName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers])
           .setFontWeight('bold').setBackground('#eeeeee');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
      headersWritten++;
    }
  }
  const message = `Database setup complete.\n\n- Sheets Created: ${sheetsCreated}\n- Sheets with new Headers: ${headersWritten}`;
  ui.alert('🚀 Setup Complete!', message, ui.ButtonSet.OK);
}

function _DANGER_deleteAllDataAndSheets_() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('คำเตือน!', 'คุณกำลังจะลบข้อมูลและชีตเกือบทั้งหมดในไฟล์นี้ การกระทำนี้ไม่สามารถย้อนกลับได้ คุณแน่ใจหรือไม่ที่จะดำเนินการต่อ?', ui.ButtonSet.YES_NO);
  if (response == ui.Button.YES) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    const protectedSheetName = 'Sheet1';
    for (let i = allSheets.length - 1; i >= 0; i--) {
        if (allSheets[i].getName() !== protectedSheetName) {
            ss.deleteSheet(allSheets[i]);
        }
    }
    const sheet1 = ss.getSheetByName(protectedSheetName);
    if(sheet1){
        sheet1.clear();
        sheet1.setName('Sheet1');
    }
    ui.alert('การล้างข้อมูลเสร็จสมบูรณ์');
  } else {
    ui.alert('ยกเลิกการดำเนินการ');
  }
}