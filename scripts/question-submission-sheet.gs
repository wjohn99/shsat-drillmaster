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
 *
 * Column layout (must match tracker template v4):
 * A Question ID      — auto
 * B Passage ID       — form
 * C Author           — form
 * D Type             — form (RC, RE, REB, ALG, etc.)
 * E Module           — form
 * F Skill Tag        — form (canonical codes, e.g. RC-INF; RE-SEN)
 * G Format           — form
 * H Passage          — form (RC / RE Part A only)
 * I Question         — form
 * J Choice A         — form
 * K Choice B         — form
 * L Choice C         — form
 * M Choice D         — form
 * N Correct Answer   — form
 * O Explanation      — form
 * P Common Trap      — form
 * Q Reviewer         — manual (left blank)
 * R Status           — form (default "In Review")
 * S Error            — manual
 * T Suggested Change — manual
 */

const SPREADSHEET_ID = ""; // Required — paste your spreadsheet ID here
const SHEET_NAME = "SHSAT Question Bank Tracker";
const DATA_START_ROW = 2; // Row 1 is the header
const SUBMISSION_COLUMN_COUNT = 18; // A through R — do not include manual S/T columns

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const sheet = getSheet_();
    const questionId = allocateQuestionId_(sheet, payload.type);

    writeSubmissionRow_(sheet, [
      questionId,                        // A Question ID
      payload.passageId || "",           // B Passage ID
      payload.author || "",              // C Author
      payload.type || "",                // D Type
      payload.module || "",              // E Module
      payload.skillTag || "",            // F Skill Tag
      payload.format || "",              // G Format
      payload.passage || "",             // H Passage
      payload.question || "",            // I Question
      payload.choiceA || "",             // J Choice A
      payload.choiceB || "",             // K Choice B
      payload.choiceC || "",             // L Choice C
      payload.choiceD || "",             // M Choice D
      payload.correctAnswer || "",       // N Correct Answer
      payload.explanation || "",         // O Explanation
      payload.commonTrap || "",          // P Common Trap
      "",                                // Q Reviewer
      payload.status || "In Review",     // R Status
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

function sectionForQuestionType_(questionType) {
  var t = String(questionType || "").toUpperCase();
  if (t === "RC" || t === "RE" || t === "REB") return "ELA";
  if (t === "ALG" || t === "GEO" || t === "NUM" || t === "APP" || t === "DAT") return "MATH";
  return "UNK";
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
  if (values.length !== SUBMISSION_COLUMN_COUNT) {
    throw new Error(
      "Expected " + SUBMISSION_COLUMN_COUNT + " columns (A–R), got " + values.length,
    );
  }
  var targetRow = getNextEmptyRow_(sheet);
  sheet.getRange(targetRow, 1, 1, values.length).setValues([values]);
  return targetRow;
}

function allocateQuestionId_(sheet, questionType) {
  const idSection = sectionForQuestionType_(questionType);
  const prefix = idSection + "-" + (questionType || "UNK") + "-";
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
    "TEST-PASS-001",
    "Apps Script test",
    "ELA",
    "Module 1",
    "Test tag",
    "Multiple Choice Question",
    "Sample passage text for testing.",
    "What is the main idea?",
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
