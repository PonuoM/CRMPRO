/**
 * @fileoverview Code.gs - Backend logic for the CRM Web App.
 * @version 2.2 - Final Corrected Version with all functions.
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEET_USERS = "Users";
const SHEET_LEADS = "Leads";
const SHEET_ACTIVITY_LOGS = "ActivityLogs";
const SHEET_CROPS = "Crops";
const SHEET_SALES_HISTORY = "SalesHistory";
const SHEET_LEAD_CROPS = "LeadCrops";

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('CRM Lead Management').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getMyLeads(statusFilter) {
  try {
    const currentUserEmail = Session.getActiveUser().getEmail();
    const leadsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_LEADS);
    const allData = leadsSheet.getDataRange().getValues();
    const headers = allData.shift(); 
    
    const assignedToColIndex = headers.indexOf('AssignedTo');
    const statusColIndex = headers.indexOf('Status');
    if (assignedToColIndex === -1 || statusColIndex === -1) { throw new Error("Could not find 'AssignedTo' or 'Status' columns."); }
    
    const userLeads = allData.filter(row => row[assignedToColIndex] === currentUserEmail);
    
    const statusMap = { 'New': 'ใหม่', 'Contacted': 'ติดต่อแล้ว', 'Qualified': 'มีแนวโน้ม', 'Closed-Won': 'ปิดการขาย', 'Closed-Lost': 'ปิด (ไม่สำเร็จ)' };
    const addressIndexes = {
      address: headers.indexOf('Address'), subDistrict: headers.indexOf('SubDistrict'),
      district: headers.indexOf('District'), province: headers.indexOf('Province'), postalCode: headers.indexOf('PostalCode')
    };
    const dateColumnIndexes = [ headers.indexOf('DateCreated'), headers.indexOf('DateAssigned'), headers.indexOf('LastUpdated'), headers.indexOf('NextAppointmentDate') ].filter(index => index !== -1);

    const preparedData = userLeads.map(row => {
      const dateConvertedRow = row.map((cell, index) => {
        if (dateColumnIndexes.includes(index) && cell instanceof Date) {
          return Utilities.formatDate(cell, "Asia/Bangkok", "yyyy-MM-dd");
        }
        return cell;
      });

      const leadId = dateConvertedRow[headers.indexOf('LeadID')];
      const firstName = dateConvertedRow[headers.indexOf('FirstName')];
      const lastName = dateConvertedRow[headers.indexOf('LastName')];
      const phone = dateConvertedRow[headers.indexOf('PhoneNumber')];
      const fullAddress = [
        dateConvertedRow[addressIndexes.address], dateConvertedRow[addressIndexes.subDistrict],
        dateConvertedRow[addressIndexes.district], dateConvertedRow[addressIndexes.province],
        dateConvertedRow[addressIndexes.postalCode]
      ].filter(Boolean).join(' ');
      const originalStatus = dateConvertedRow[statusColIndex];
      const thaiStatus = statusMap[originalStatus] || originalStatus;
      
      return {
        display: [ leadId, `${firstName} ${lastName}`, phone, fullAddress, thaiStatus, originalStatus ],
        full: dateConvertedRow
      };
    });
    return preparedData;
  } catch (error) {
    Logger.log(`Error in getMyLeads: ${error.message}`);
    throw new Error(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${error.message}`);
  }
}

function getLeadDetails(leadId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const leadsSheet = ss.getSheetByName(SHEET_LEADS);
    const leadsHeaders = leadsSheet.getRange(1, 1, 1, leadsSheet.getLastColumn()).getValues()[0];
    const leadIdColIndex = leadsHeaders.indexOf('LeadID');
    const allLeads = leadsSheet.getDataRange().getValues();
    const leadDataRow = allLeads.find(row => row[leadIdColIndex] === leadId);
    if (!leadDataRow) { throw new Error("ไม่พบข้อมูล Lead"); }
    
    const leadData = leadsHeaders.reduce((obj, header, index) => {
        const cell = leadDataRow[index];
        if (cell instanceof Date) { obj[header] = Utilities.formatDate(cell, "Asia/Bangkok", "yyyy-MM-dd"); } 
        else { obj[header] = cell; }
        return obj;
    }, {});

    const leadCropsSheet = ss.getSheetByName(SHEET_LEAD_CROPS);
    let leadCrops = [];
    if (leadCropsSheet.getLastRow() > 1) {
        const allLeadCrops = leadCropsSheet.getDataRange().getValues();
        const headers = allLeadCrops.shift();
        const leadIdCol = headers.indexOf('LeadID');
        leadCrops = allLeadCrops.filter(row => row[leadIdCol] === leadId);
    }
    
    return { leadData, leadCrops };

  } catch (error) {
    Logger.log(`Error in getLeadDetails: ${error.message} Stack: ${error.stack}`);
    throw new Error(`เกิดข้อผิดพลาดในการดึงข้อมูลรายละเอียด: ${error.message}`);
  }
}

function saveInteractionAndData(data) {
  try {
    const { leadId, interactionData, cropData } = data;
    const agentEmail = Session.getActiveUser().getEmail();
    const timestamp = new Date();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    const activitySheet = ss.getSheetByName(SHEET_ACTIVITY_LOGS);
    activitySheet.appendRow([
      'ACT' + timestamp.getTime(), leadId, timestamp, agentEmail,
      interactionData.callOutcome, interactionData.newSalesStatus,
      interactionData.notes, interactionData.callDuration
    ]);

    const leadsSheet = ss.getSheetByName(SHEET_LEADS);
    const leadsValues = leadsSheet.getDataRange().getValues();
    const leadsHeaders = leadsValues[0];
    const leadIdCol = leadsHeaders.indexOf('LeadID');
    const rowIndexToUpdate = leadsValues.findIndex(row => row[leadIdCol] === leadId);

    if (rowIndexToUpdate > -1) {
      const sheetRow = rowIndexToUpdate + 1;
      const leadUpdates = {
        'Status': interactionData.newSalesStatus,
        'LastUpdated': timestamp,
        'NextAppointmentDate': interactionData.appointmentDate ? new Date(interactionData.appointmentDate) : ''
      };
      for (const header in leadUpdates) {
        const colIndex = leadsHeaders.indexOf(header);
        if (colIndex > -1) {
          leadsSheet.getRange(sheetRow, colIndex + 1).setValue(leadUpdates[header]);
        }
      }
    }

    const leadCropsSheet = ss.getSheetByName(SHEET_LEAD_CROPS);
    const allLeadCrops = leadCropsSheet.getDataRange().getValues();
    const cropHeaders = allLeadCrops.shift() || [];
    const cropLeadIdCol = cropHeaders.indexOf('LeadID');
    
    if(cropLeadIdCol > -1){
      for (let i = allLeadCrops.length - 1; i >= 0; i--) {
          if (allLeadCrops[i][cropLeadIdCol] === leadId) {
              leadCropsSheet.deleteRow(i + 2);
          }
      }
    }
    
    if (cropData && cropData.length > 0) {
        const newRows = cropData.map(crop => [ 
          `LC${Date.now() + Math.random()}`, 
          leadId, 
          crop.name, 
          crop.rai, 
          crop.plants 
        ]);
        if (newRows.length > 0) {
            leadCropsSheet.getRange(leadCropsSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
        }
    }

    return { status: 'success', message: 'บันทึกข้อมูลทั้งหมดเรียบร้อย' };
  } catch(e) {
    Logger.log(`Error in saveInteractionAndData: ${e.message} ${e.stack}`);
    throw new Error('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + e.message);
  }
}

function addNewCrop(cropName) {
  if (!cropName || typeof cropName !== 'string' || cropName.trim() === '') {
    throw new Error("Invalid crop name provided.");
  }
  try {
    const cropSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_CROPS);
    const newId = 'C' + (cropSheet.getLastRow() + 1).toString().padStart(2, '0');
    cropSheet.appendRow([newId, cropName.trim()]);
    return { status: 'success', message: `เพิ่ม '${cropName.trim()}' เรียบร้อย`, newCrop: cropName.trim() };
  } catch (e) {
    Logger.log(`Error in addNewCrop: ${e.message}`);
    throw new Error("เกิดข้อผิดพลาดในการเพิ่มข้อมูลพืช");
  }
}

function getLastActivityForLead(leadId) {
  try {
    const activitySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_ACTIVITY_LOGS);
    if (activitySheet.getLastRow() < 2) return null;
    const allActivities = activitySheet.getDataRange().getValues();
    const headers = allActivities.shift();
    const leadIdCol = headers.indexOf('LeadID');
    const timestampCol = headers.indexOf('Timestamp');
    const leadActivities = allActivities.filter(row => row[leadIdCol] === leadId);
    if (leadActivities.length === 0) { return null; }
    leadActivities.sort((a, b) => new Date(b[timestampCol]) - new Date(a[timestampCol]));
    const lastActivityRow = leadActivities[0];
    const lastActivity = headers.reduce((obj, header, index) => {
        const cell = lastActivityRow[index];
        if (cell instanceof Date) { obj[header] = Utilities.formatDate(cell, "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"); } 
        else { obj[header] = cell; }
        return obj;
    }, {});
    return lastActivity;
  } catch (error) {
    Logger.log(`Error in getLastActivityForLead: ${error.message}`);
    throw new Error(`เกิดข้อผิดพลาดในการดึงข้อมูลล่าสุด: ${error.message}`);
  }
}

function getSalesHistoryForLead(leadId) {
  try {
    const historySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SALES_HISTORY);
    if (historySheet.getLastRow() < 2) return [];
    const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_USERS);
    const allHistory = historySheet.getDataRange().getValues();
    const allUsers = usersSheet.getDataRange().getValues();
    const historyHeaders = allHistory.shift();
    const usersHeaders = allUsers.shift();
    const leadIdCol = historyHeaders.indexOf('LeadID');
    const userIdCol = historyHeaders.indexOf('UserID');
    const usersMap = new Map(allUsers.map(user => [user[usersHeaders.indexOf('UserID')], user[usersHeaders.indexOf('FullName')]]));
    const leadHistory = allHistory.filter(row => row[leadIdCol] === leadId);
    const saleDateCol = historyHeaders.indexOf('SaleDate');
    return leadHistory.map(row => {
      let newRow = [...row];
      if (newRow[saleDateCol] instanceof Date) {
        newRow[saleDateCol] = Utilities.formatDate(newRow[saleDateCol], "Asia/Bangkok", "dd/MM/yyyy");
      }
      newRow[userIdCol] = usersMap.get(newRow[userIdCol]) || newRow[userIdCol];
      return newRow;
    });
  } catch (error) {
    Logger.log(`Error in getSalesHistoryForLead: ${error.message}`);
    throw new Error(`เกิดข้อผิดพลาดในการดึงประวัติการซื้อ: ${error.message}`);
  }
}

function getActivityHistoryForLead(leadId) {
  try {
    const activitySheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_ACTIVITY_LOGS);
    if (activitySheet.getLastRow() < 2) return [];
    const allActivities = activitySheet.getDataRange().getValues();
    const headers = allActivities.shift();
    const leadIdCol = headers.indexOf('LeadID');
    const leadActivities = allActivities.filter(row => row[leadIdCol] === leadId);
    const timestampCol = headers.indexOf('Timestamp');
    leadActivities.sort((a, b) => new Date(b[timestampCol]) - new Date(a[timestampCol]));
    return leadActivities.map(row => {
      let newRow = [...row];
      if (newRow[timestampCol] instanceof Date) {
        newRow[timestampCol] = Utilities.formatDate(newRow[timestampCol], "Asia/Bangkok", "yyyy-MM-dd HH:mm");
      }
      return newRow;
    });
  } catch (error) {
    Logger.log(`Error in getActivityHistoryForLead: ${error.message}`);
    throw new Error(`เกิดข้อผิดพลาดในการดึงประวัติการติดต่อ: ${error.message}`);
  }
}

// --- ADDED MISSING FUNCTION ---
function getOptions(sheetName) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet) { 
      throw new Error(`Sheet with name "${sheetName}" not found.`); 
    }
    if (sheet.getLastRow() < 2) return [];
    
    const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
    
    return data.map(row => row[0]).filter(Boolean);

  } catch (e) {
    Logger.log(`Error in getOptions for sheet "${sheetName}": ${e.message}`);
    throw e;
  }
}

function getProducts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Products');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  // header: ['ProductID', 'ProductName', 'SKU', 'Price', 'Stock', 'IsActive']
  return data
    .filter(row => row[headers.indexOf('IsActive')] === true || row[headers.indexOf('IsActive')] === 'TRUE')
    .map(row => ({
      ProductID: row[headers.indexOf('ProductID')],
      ProductName: row[headers.indexOf('ProductName')],
      Price: row[headers.indexOf('Price')],
      Stock: row[headers.indexOf('Stock')],
      SKU: row[headers.indexOf('SKU')]
    }));
}

function saveOrder(orderData) {
  try {
    const { orderHeader, orderDetails } = orderData;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName('Orders');
    const orderDetailsSheet = ss.getSheetByName('OrderDetails');

    // สร้าง OrderID ใหม่
    const orderId = 'ORD' + Date.now();

    // เพิ่มข้อมูลลง Orders
    ordersSheet.appendRow([
      orderId,
      new Date(), // OrderDate
      orderHeader.leadId,
      orderHeader.customerName,
      orderHeader.totalAmount,
      'Pending', // Status
      orderHeader.shippingMethod,
      orderHeader.shippingDate,
      Session.getActiveUser().getEmail()
    ]);

    // เพิ่มข้อมูลลง OrderDetails
    orderDetails.forEach((item, idx) => {
      orderDetailsSheet.appendRow([
        'OD' + Date.now() + idx,
        orderId,
        item.productId,
        item.productName,
        item.quantity,
        item.price,
        item.subtotal
      ]);
    });

    return { status: 'success', message: 'บันทึกออเดอร์สำเร็จ!' };
  } catch (e) {
    return { status: 'error', message: 'เกิดข้อผิดพลาด: ' + e.message };
  }
}