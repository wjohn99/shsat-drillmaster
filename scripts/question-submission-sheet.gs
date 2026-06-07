/**
 * SHSAT Question Bank Tracker — Google Apps Script webhook
 *
 * SETUP (important):
 * 1. Open your Google Sheet → Extensions → Apps Script (creates a container-bound project).
 * 2. Paste this file → set SPREADSHEET_ID below → Save.
 * 3. Deploy → New deployment → Web app
 *      Execute as: Me | Who has access: Anyone
 * 4. Copy the /exec URL into VITE_QUESTION_SUBMISSION_SHEET_URL in DrillMaster .env
 * 5. After any code change: Deploy → Manage deployments → Edit → New version → Deploy
 *
 * SPREADSHEET_ID: from the sheet URL
 *   https://docs.google.com/spreadsheets/d/PASTE_THIS_PART/edit
 *
 * DEBUG: Run testWrite() from the Apps Script editor to verify sheet access.
 */

const SPREADSHEET_ID = ""; // Required — paste your spreadsheet ID here
const SHEET_NAME = "SHSAT Question Bank Tracker";
const DATA_START_ROW = 2; // Row 1 is the header

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const sheet = getSheet_();
    const questionId = allocateQuestionId_(sheet, payload.section, payload.type);

    writeSubmissionRow_(sheet, [
      questionId,
      payload.passageId || "",
      payload.author || "",
      payload.section || "",
      payload.module || "",
      payload.skillTag || "",
      payload.format || "",
      payload.question || "",
      payload.choiceA || "",
      payload.choiceB || "",
      payload.choiceC || "",
      payload.choiceD || "",
      payload.correctAnswer || "",
      payload.explanation || "",
      payload.commonTrap || "",
      "",
      payload.status || "In Review",
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, questionId: questionId }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(error) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function parsePayload_(e) {
  if (!e) {
    throw new Error("No request event received.");
  }

  // Form-urlencoded posts from DrillMaster (e.parameter.payload)
  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  // text/plain posts (raw JSON body)
  if (e.postData && e.postData.contents) {
    var contents = e.postData.contents;
    if (contents.charAt(0) === "{") {
      return JSON.parse(contents);
    }
  }

  throw new Error("No submission payload received.");
}

function normalizeIdSection_(section) {
  var s = String(section || "").toUpperCase();
  if (s === "MATH") return "MATH";
  if (s === "ELA") return "ELA";
  return s || "UNK";
}

/** First row with a blank Question ID (column A), scanning from the top down. */
function getNextEmptyRow_(sheet) {
  var row = DATA_START_ROW;
  var maxScan = Math.max(sheet.getLastRow() + 20, DATA_START_ROW + 100);

  while (row <= maxScan) {
    var questionId = String(sheet.getRange(row, 1).getValue() || "").trim();
    if (questionId === "") {
      return row;
    }
    row++;
  }

  return row;
}

function writeSubmissionRow_(sheet, values) {
  var targetRow = getNextEmptyRow_(sheet);
  sheet.getRange(targetRow, 1, 1, values.length).setValues([values]);
  return targetRow;
}

function allocateQuestionId_(sheet, section, type) {
  const idSection = normalizeIdSection_(section);
  const prefix = idSection + "-" + (type || "UNK") + "-";
  const data = sheet.getDataRange().getValues();
  var max = 0;

  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][0] || "");
    if (id.indexOf(prefix) === 0) {
      var num = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(num) && num > max) {
        max = num;
      }
    }
  }

  var next = max + 1;
  return prefix + ("000" + next).slice(-3);
}

function doGet() {
  try {
    getSheet_();
    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        message: "Question submission webhook is running.",
        sheet: SHEET_NAME,
        spreadsheetId: openSpreadsheet_().getId(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(error) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet_() {
  const ss = openSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Tab "' + SHEET_NAME + '" not found in this spreadsheet.');
  }
  return sheet;
}

function openSpreadsheet_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    return active;
  }

  throw new Error(
    "Set SPREADSHEET_ID at the top of the script (between /d/ and /edit in the sheet URL).",
  );
}

/** Run manually from Apps Script editor: Run → testWrite */
function testWrite() {
  const sheet = getSheet_();
  const questionId = allocateQuestionId_(sheet, "ELA", "RC");
  var row = writeSubmissionRow_(sheet, [
    questionId,
    "",
    "Apps Script test",
    "ELA",
    "Module 1",
    "Test tag",
    "Multiple Choice Question",
    "If you see this row, sheet access works.",
    "A",
    "B",
    "C",
    "D",
    "A",
    "Test explanation",
    "Test trap",
    "",
    "In Review",
  ]);
  Logger.log("Wrote test row " + questionId + " at row " + row);
}
