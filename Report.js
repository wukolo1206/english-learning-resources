// ============================================================
// 報表對應資源：後端
// 規格：docs/規格_學扶報表對應資源.md (v1.4)
// 原則：只讀試算表，不寫入；不儲存任何學生資料；伺服器端不接觸學生姓名
// ============================================================

var CFG_SHEETS = {
  ind: '指標對應',
  alias: '評量重點別名',
  rules: '比對規則',
  words: '字詞主題',
  themes: '主題別名'
};
var RESOURCE_SHEET = 'English';
var SEP = '｜';

// ---------- 共用：正規化（規格 5.1）----------
function canon_(text) {
  var t = String(text == null ? '' : text);
  t = t.replace(/[​‎‏﻿]/g, '');
  t = t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  t = t.replace(/<br\s*\/?>/gi, '').replace(/[◎★]/g, '');
  t = t.replace(/\s+/g, '');
  // 全形英數轉半形
  t = t.replace(/[！-～]/g, function(c) {
    return String.fromCharCode(c.charCodeAt(0) - 0xfee0);
  });
  return t.toLowerCase();
}

function gradeNum_(g) {
  var map = { '三年級': '3', '四年級': '4', '五年級': '5', '六年級': '6' };
  var t = String(g == null ? '' : g).trim();
  if (map[t]) return map[t];
  var m = /^([3-6])年級$/.exec(t);      // 報表工作表名是「4年級」，設定檔寫「四年級」
  if (m) return m[1];
  return t.charAt(0);
}

// 年級比較一律用數字，避免「4年級」與「四年級」對不起來
function sameGrade_(a, b) {
  return gradeNum_(a) === gradeNum_(b);
}
function gradeCN_(g) {
  var cn = { '3': '三年級', '4': '四年級', '5': '五年級', '6': '六年級' };
  return cn[gradeNum_(g)] || String(g);
}

function splitList_(v) {
  var s = String(v == null ? '' : v).trim();
  if (!s) return [];
  return s.split(SEP).map(function(x) { return x.trim(); }).filter(function(x) { return x; });
}

function sheetObjects_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) return null;
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var head = data[0].map(function(h) { return String(h).trim(); });
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]).trim() === '') continue;
    var o = {};
    for (var j = 0; j < head.length; j++) o[head[j]] = String(row[j] == null ? '' : row[j]).trim();
    out.push(o);
  }
  return out;
}

// ---------- 載入設定 + 驗證（規格 9.1）----------
function loadConfig_() {
  var ss = SpreadsheetApp.openById(SHEET_ID_);
  var cfg = { errors: [], warnings: [] };

  for (var key in CFG_SHEETS) {
    var rows = sheetObjects_(ss, CFG_SHEETS[key]);
    if (rows === null) {
      cfg.errors.push('找不到工作表「' + CFG_SHEETS[key] + '」');
      rows = [];
    }
    cfg[key] = rows;
  }

  // 資源（沿用既有過濾邏輯：跳過空白列與標題列）
  var rs = ss.getSheetByName(RESOURCE_SHEET);
  var res = [];
  if (!rs) {
    cfg.errors.push('找不到資源工作表「' + RESOURCE_SHEET + '」');
  } else {
    var raw = rs.getDataRange().getValues();
    for (var i = 0; i < raw.length; i++) {
      var r = raw[i];
      if (!r[0] || r[0] === '年級') continue;
      res.push({
        grade: String(r[0]).trim(), area: String(r[1]).trim(), type: String(r[2]).trim(),
        unit: String(r[3]).trim(), name: String(r[4]).trim(), form: String(r[5]).trim(),
        url: String(r[6] == null ? '' : r[6]).trim()
      });
    }
  }
  cfg.resources = res;

  // 索引：年級+領域+單元 → 資源
  cfg.unitIndex = {};
  for (var k = 0; k < res.length; k++) {
    var key2 = res[k].grade + '' + res[k].area + '' + res[k].unit;
    (cfg.unitIndex[key2] = cfg.unitIndex[key2] || []).push(res[k]);
  }

  // 細項索引
  cfg.indIndex = {};
  for (var a = 0; a < cfg.ind.length; a++) {
    var it = cfg.ind[a];
    if (cfg.indIndex[it['細項編號']]) cfg.errors.push('指標對應有重複的細項編號：' + it['細項編號']);
    cfg.indIndex[it['細項編號']] = it;
  }

  // 別名：只採用「已確認」；檢查正規化鍵碰撞（規格 5.1）
  cfg.aliasIndex = {};
  var byKey = {};
  for (var b = 0; b < cfg.alias.length; b++) {
    var al = cfg.alias[b];
    var key3 = al['年級'] + '' + al['報表類別'] + '' + canon_(al['原文']);
    (byKey[key3] = byKey[key3] || []).push(al);
    if (al['狀態'] !== '已確認') continue;
    if (cfg.aliasIndex[key3] && cfg.aliasIndex[key3]['對應細項'] !== al['對應細項']) {
      cfg.errors.push('別名衝突（同鍵不同結果）：' + al['別名ID']);
    }
    cfg.aliasIndex[key3] = al;
  }
  for (var kk in byKey) {
    var grp = byKey[kk];
    var origins = {};
    for (var g = 0; g < grp.length; g++) origins[grp[g]['原文']] = true;
    if (Object.keys(origins).length > 1) {
      cfg.warnings.push('正規化後碰撞：同一個鍵對到不同原文（' + Object.keys(origins).join(' / ') + '），這些列不進入自動比對');
      for (var g2 = 0; g2 < grp.length; g2++) delete cfg.aliasIndex[kk];
    }
  }

  // 主題別名 / 字詞主題
  cfg.themeIndex = {};
  for (var c = 0; c < cfg.themes.length; c++) {
    cfg.themeIndex[cfg.themes[c]['年級'] + '' + canon_(cfg.themes[c]['主題別名'])] = cfg.themes[c]['對應主題標籤'];
  }
  cfg.wordThemes = {};
  for (var d = 0; d < cfg.words.length; d++) {
    cfg.wordThemes[cfg.words[d]['年級'] + '' + cfg.words[d]['主題標籤']] = true;
  }

  // 規則檢查
  for (var e = 0; e < cfg.rules.length; e++) {
    var ru = cfg.rules[e];
    if (ru['啟用'] !== '是') continue;
    if (['互斥', '可疊加', '修飾'].indexOf(ru['規則型態']) < 0) {
      cfg.errors.push('比對規則 ' + ru['規則ID'] + ' 的規則型態不合法：' + ru['規則型態']);
    }
    var outs = splitList_(ru['輸出細項']);
    for (var f = 0; f < outs.length; f++) {
      if (outs[f].indexOf('（') === 0) continue; // 動態決定
      if (!cfg.indIndex[outs[f]]) cfg.errors.push('比對規則 ' + ru['規則ID'] + ' 指到不存在的細項：' + outs[f]);
    }
    if (ru['比對方式'] === '正規表示式') {
      try { new RegExp(ru['比對內容']); }
      catch (err) { cfg.errors.push('比對規則 ' + ru['規則ID'] + ' 的正規表示式無法編譯'); }
    }
  }

  cfg.fetchedAt = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm');
  cfg.resourceCount = res.length;
  return cfg;
}

var SHEET_ID_ = '1DmN1oFXCyqp4XL7C92IsExE-571XJxNenKgSrlaJe_Q';

// 供前端「檢查設定」按鈕使用
function checkConfig() {
  var cfg = loadConfig_();
  var health = healthCheck_(cfg);
  return {
    ok: cfg.errors.length === 0,
    errors: cfg.errors,
    warnings: cfg.warnings.concat(health.warnings),
    counts: {
      指標對應: cfg.ind.length, 評量重點別名: cfg.alias.length,
      已確認別名: Object.keys(cfg.aliasIndex).length,
      比對規則: cfg.rules.length, 字詞主題: cfg.words.length, 主題別名: cfg.themes.length,
      資源: cfg.resourceCount
    },
    fetchedAt: cfg.fetchedAt
  };
}

// ---------- 資料健康檢查（規格 9）----------
function healthCheck_(cfg) {
  var warnings = [], missingUnits = [], uncovered = [];
  var covered = {};
  for (var i = 0; i < cfg.ind.length; i++) {
    var it = cfg.ind[i];
    var units = splitList_(it['對應單元']);
    for (var j = 0; j < units.length; j++) {
      var key = it['年級'] + '' + it['試算表領域'] + '' + units[j];
      covered[key] = true;
      if (!cfg.unitIndex[key]) missingUnits.push(it['細項編號'] + '：' + it['年級'] + '／' + it['試算表領域'] + '／' + units[j]);
    }
  }
  for (var k in cfg.unitIndex) {
    if (!covered[k]) {
      var p = k.split('');
      uncovered.push(p[0] + '／' + p[1] + '／' + p[2] + '（' + cfg.unitIndex[k].length + ' 筆資源）');
    }
  }
  // 重複資源名稱
  var dup = {};
  for (var u in cfg.unitIndex) {
    var names = {};
    var list = cfg.unitIndex[u];
    for (var m = 0; m < list.length; m++) {
      var n = canon_(list[m].name);
      if (names[n]) dup[u.split('').join('／') + '：' + list[m].name] = true;
      names[n] = true;
    }
  }
  return {
    warnings: warnings,
    missingUnits: missingUnits,
    uncoveredUnits: uncovered,
    duplicateNames: Object.keys(dup)
  };
}

// ---------- 比對（規格 5）----------
function matchRow_(cfg, grade, category, focus) {
  var key = gradeCN_(grade) + '' + category + '' + canon_(focus);
  var ruleResult = matchByRules_(cfg, grade, category, focus);

  var al = cfg.aliasIndex[key];
  if (al) {
    var codes = splitList_(al['對應細項']);
    var shadow = null;
    if (!ruleResult.conflict) {
      var rc = ruleResult.codes.slice().sort().join(',');
      if (rc && rc !== codes.slice().sort().join(',')) shadow = ruleResult.codes;
    }
    return { codes: codes, source: '已驗證', shadowMismatch: shadow, needReview: false };
  }
  if (ruleResult.conflict) {
    return { codes: [], source: '衝突', needReview: true, reason: '互斥規則命中多條：' + ruleResult.hits.join('、') };
  }
  if (!ruleResult.codes.length) {
    return { codes: [], source: '未命中', needReview: true, reason: ruleResult.reason || '沒有規則命中' };
  }
  return { codes: ruleResult.codes, source: '規則推得', needReview: false };
}

function matchByRules_(cfg, grade, category, focus) {
  var text = canon_(focus);
  var codes = [], hits = [], exclusiveHits = [], reason = '';
  for (var i = 0; i < cfg.rules.length; i++) {
    var ru = cfg.rules[i];
    if (ru['啟用'] !== '是') continue;
    if (ru['適用年級'] && !sameGrade_(ru['適用年級'], grade)) continue;
    if (ru['報表類別'] && canon_(ru['報表類別']) !== canon_(category)) continue;

    var matched = false, outs = splitList_(ru['輸出細項']);
    var pat = ru['比對方式'];
    if (pat === '正規表示式') {
      var re = new RegExp(ru['比對內容']);
      var m = re.exec(String(focus));
      if (m) {
        // 字詞主題：抽出主題 → 主題別名 → 字詞主題
        var theme = m[1] ? m[1].trim() : '';
        var mapped = cfg.themeIndex[gradeCN_(grade) + '' + canon_(theme)];
        if (!mapped) {
          // 直接當成標籤試一次
          if (cfg.wordThemes[gradeCN_(grade) + '' + theme]) mapped = theme;
        }
        if (mapped && cfg.wordThemes[gradeCN_(grade) + '' + mapped]) {
          matched = true;
          outs = [gradeNum_(grade) + '-字詞-' + mapped];
        } else {
          reason = '報表主題「' + theme + '」在主題別名與字詞主題都查不到';
        }
      }
    } else if (pat === '精確') {
      matched = (text === canon_(ru['比對內容']));
    } else {
      matched = (text.indexOf(canon_(ru['比對內容'])) >= 0);
    }
    if (!matched) continue;

    hits.push(ru['規則ID']);
    if (ru['規則型態'] === '互斥') exclusiveHits.push(ru['規則ID']);
    for (var j = 0; j < outs.length; j++) if (codes.indexOf(outs[j]) < 0) codes.push(outs[j]);
  }

  // 字詞類別沒有主題字樣 → N-字詞-全部
  if (!codes.length && canon_(category).indexOf('字詞') >= 0 && canon_(category).indexOf('句構') < 0) {
    if (!/跟(.+?)(相關|有關)/.test(String(focus))) {
      var all = gradeNum_(grade) + '-字詞-全部';
      if (cfg.indIndex[all]) return { codes: [all], hits: ['fallback-全部'], conflict: false };
    }
  }
  return { codes: codes, hits: hits, conflict: exclusiveHits.length > 1, reason: reason };
}

// ---------- 主流程 ----------
/**
 * payload = {
 *   grade: '4年級',
 *   students: ['學生1','學生2',...],        // 已代號化，伺服器不會收到姓名
 *   items: [{no, category, performance, focus, marks:['Ｏ','Ｘ',...]}]
 * }
 */
function analyzeReport(payload) {
  var cfg = loadConfig_();
  if (cfg.errors.length) {
    return { ok: false, errors: cfg.errors };
  }
  var grade = String(payload.grade || '').trim();
  var students = payload.students || [];
  var items = payload.items || [];

  var ALLOWED = ['4'];
  if (ALLOWED.indexOf(gradeNum_(grade)) < 0) {
    return { ok: false, notVerifiedGrade: true, grade: grade,
      errors: ['第一階段只開放 4 年級。' + grade + ' 的比對規則尚未用真實報表驗證過，為避免給出未驗證的建議，這個年級不予處理。'] };
  }

  var health = healthCheck_(cfg);
  var review = [], shadow = [], byCode = {};

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var correct = 0, wrongIdx = [];
    for (var s = 0; s < it.marks.length; s++) {
      if (it.marks[s] === 'Ｏ' || it.marks[s] === 'O') correct++;
      else wrongIdx.push(s);
    }
    var skills = [];
    var perf = String(it.performance || '');
    if (/(^|[^0-9])1-/.test(perf)) skills.push('聽');
    if (/(^|[^0-9])3-/.test(perf)) skills.push('讀');

    var m = matchRow_(cfg, grade, it.category, it.focus);
    if (m.needReview) {
      review.push({ no: it.no, focus: it.focus, category: it.category, reason: m.reason });
      continue;
    }
    if (m.shadowMismatch) {
      shadow.push({ no: it.no, focus: it.focus, alias: m.codes.join('、'), rules: m.shadowMismatch.join('、') });
    }
    for (var c = 0; c < m.codes.length; c++) {
      var code = m.codes[c];
      var b = byCode[code] = byCode[code] || { code: code, items: [], composite: 0 };
      b.items.push({
        no: it.no, focus: it.focus, correct: correct, total: it.marks.length,
        skills: skills, wrongIdx: wrongIdx, source: m.source, composite: m.codes.length > 1
      });
      if (m.codes.length > 1) b.composite++;
    }
  }

  // 彙總
  var details = [];
  for (var code2 in byCode) {
    var b2 = byCode[code2];
    var ind = cfg.indIndex[code2] || {};
    var sumC = 0, sumT = 0, rates = [];
    for (var x = 0; x < b2.items.length; x++) {
      sumC += b2.items[x].correct; sumT += b2.items[x].total;
      rates.push(b2.items[x].correct / b2.items[x].total);
    }
    var spread = rates.length > 1 ? (Math.max.apply(null, rates) - Math.min.apply(null, rates)) : 0;
    details.push({
      code: code2,
      source: ind['來源'] || '',
      content: ind['內容'] || '',
      plain: ind['白話標題'] || ind['內容'] || '',
      coverage: ind['內容涵蓋度'] || '',
      note: ind['備註'] || '',
      items: b2.items,
      itemCount: b2.items.length,
      correct: sumC, total: sumT,
      rate: sumT ? sumC / sumT : 0,
      singleItem: b2.items.length === 1,
      heterogeneous: spread >= 0.3,
      compositeCount: b2.composite,
      resources: resourcesFor_(cfg, ind)
    });
  }
  details.sort(function(a, b) { return a.rate - b.rate; });

  // 個別學生
  var perStudent = [];
  for (var si = 0; si < students.length; si++) {
    var wrongItems = [], codeSet = {};
    for (var di = 0; di < details.length; di++) {
      for (var ii = 0; ii < details[di].items.length; ii++) {
        var itm = details[di].items[ii];
        if (itm.wrongIdx.indexOf(si) >= 0) {
          codeSet[details[di].code] = true;
          if (wrongItems.indexOf(itm.no) < 0) wrongItems.push(itm.no);
        }
      }
    }
    wrongItems.sort(function(a, b) { return a - b; });
    perStudent.push({ code: students[si], wrongItems: wrongItems, codes: Object.keys(codeSet) });
  }

  // 相同弱項分組
  var groups = {};
  for (var p = 0; p < perStudent.length; p++) {
    for (var q = 0; q < perStudent[p].codes.length; q++) {
      (groups[perStudent[p].codes[q]] = groups[perStudent[p].codes[q]] || []).push(perStudent[p].code);
    }
  }

  return {
    ok: true,
    grade: grade,
    studentCount: students.length,
    itemCount: items.length,
    details: details,
    perStudent: perStudent,
    groups: groups,
    review: review,
    shadow: shadow,
    health: health,
    common: resourcesForUnits_(cfg, '歷屆考古題及重點整理', '整合資源', ['考古題', '重點整理']),
    meta: {
      fetchedAt: cfg.fetchedAt,
      resourceCount: cfg.resourceCount,
      confirmedAlias: Object.keys(cfg.aliasIndex).length,
      appVersion: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '')
    }
  };
}

function resourcesFor_(cfg, ind) {
  if (!ind || !ind['細項編號']) return { links: [], hints: [], missing: [] };
  var out = resourcesForUnits_(cfg, ind['年級'], ind['試算表領域'], splitList_(ind['對應單元']));
  var pick = splitList_(ind['指定資源']);
  if (pick.length) {
    var picked = {};
    for (var i = 0; i < pick.length; i++) picked[canon_(pick[i])] = true;
    for (var j = 0; j < out.links.length; j++) {
      if (picked[canon_(out.links[j].name)]) out.links[j].designated = true;
    }
    // 指定資源可能在別的單元（例如繪本資源）
    for (var k = 0; k < cfg.resources.length; k++) {
      var r = cfg.resources[k];
      if (!picked[canon_(r.name)] || r.grade !== ind['年級']) continue;
      var dupe = false;
      for (var m = 0; m < out.links.length; m++) if (out.links[m].url === r.url && out.links[m].name === r.name) dupe = true;
      if (dupe) continue;
      var entry = { name: r.name, form: r.form, url: r.url, unit: r.unit, designated: true };
      if (r.url && /^https?:\/\//i.test(r.url)) out.links.unshift(entry); else out.hints.push(entry);
    }
  }
  // 指定資源排前面
  out.links.sort(function(a, b) { return (b.designated ? 1 : 0) - (a.designated ? 1 : 0); });
  return out;
}

function resourcesForUnits_(cfg, grade, area, units) {
  var links = [], hints = [], missing = [];
  for (var i = 0; i < units.length; i++) {
    var key = grade + '' + area + '' + units[i];
    var list = cfg.unitIndex[key];
    if (!list) { missing.push(grade + '／' + area + '／' + units[i]); continue; }
    for (var j = 0; j < list.length; j++) {
      var r = list[j];
      var entry = { name: r.name, form: r.form, url: r.url, unit: r.unit, type: r.type };
      if (r.url && /^https?:\/\//i.test(r.url)) links.push(entry);
      else hints.push(entry);   // 無連結＝迷思概念提示，不能充當教學資源
    }
  }
  return { links: links, hints: hints, missing: missing };
}
