// ====== 版本資訊（部署前務必更新這兩行）======
var APP_VERSION = '@26';
var APP_UPDATED = '2026-09-20';

// 前端頁尾用
function getAppInfo() {
  var url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (e) { url = ''; }
  return { version: APP_VERSION, updated: APP_UPDATED, url: url };
}

// 1. 產生網頁 HTML
function doGet(e) {
  var page = e && e.parameter && e.parameter.page;
  if (page === 'report') {
    return HtmlService.createTemplateFromFile('index_report')
        .evaluate()
        .setTitle('學扶報表 → 教學資源建議')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  if (page === 'scroll') {
    return HtmlService.createHtmlOutputFromFile('index_scroll')
        .setTitle('英語學扶數位資源搜尋')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('英語學扶數位資源搜尋')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 2. 抓取更新紀錄
function getChangelog() {
  try {
    var ss = SpreadsheetApp.openById("1DmN1oFXCyqp4XL7C92IsExE-571XJxNenKgSrlaJe_Q");
    var sheet = ss.getSheetByName('更新紀錄');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    var logs = [];
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = String(row[5] || '').trim();
        // 只回傳狀態為「顯示」的紀錄
        if (status === '顯示') {
            
            // 處理日期格式 (若是 Date 物件轉為 YYYY-MM-DD字串)
            var dateVal = row[0];
            var dateStr = '';
            if (dateVal instanceof Date) {
              var y = dateVal.getFullYear();
              var m = ('0' + (dateVal.getMonth() + 1)).slice(-2);
              var d = ('0' + dateVal.getDate()).slice(-2);
              dateStr = y + '-' + m + '-' + d;
            } else {
              dateStr = String(dateVal || '').trim();
            }

            logs.push({
                date: dateStr,
                type: String(row[1] || '').trim(),
                grade: String(row[2] || '').trim(),
                domain: String(row[3] || '').trim(),
                content: String(row[4] || '').trim()
            });
        }
    }
    return logs.reverse(); // 最新的在最上面
  } catch(e) {
    return [];
  }
}

// 3. 抓取試算表資料 (API)
function getDataFromSheet() {
  try {
    // 取得當前試算表
    var ss = SpreadsheetApp.openById("1DmN1oFXCyqp4XL7C92IsExE-571XJxNenKgSrlaJe_Q");
    
    // ⚠️ 請確認您的工作表名稱真的是這個，差一個字都不行
    var sheetName = 'English'; 
    var sheet = ss.getSheetByName(sheetName);

    // 如果找不到工作表，回傳錯誤給前端
    if (!sheet) {
      throw new Error("找不到名為 '" + sheetName + "' 的工作表。請檢查下方分頁名稱是否完全一致。");
    }

    // 取得所有資料
    var data = sheet.getDataRange().getValues();
    
    // 如果只有標題沒有資料
    if (data.length <= 1) {
      return []; 
    }

    // 移除空白列與標題列（工作表第一列為空白，第二列為標題）
    var rows = data.filter(function(row) {
      return row[0] && row[0] !== '年級';
    });

    // 🧹 資料清洗：將所有資料轉為字串，避免日期或特殊格式導致卡住
    var cleanData = rows.map(function(row) {
      return row.map(function(cell) {
        if (cell === "" || cell === null || cell === undefined) return "";
        return String(cell); // 強制轉成字串
      });
    });

    return {
      resources: cleanData,
      logs: getChangelog(),
      appInfo: getAppInfo()
    };

  } catch (e) {
    // 將後端錯誤丟給前端顯示
    throw new Error(e.toString());
  }
}

// 供 HTML 樣板引入其他檔案
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
