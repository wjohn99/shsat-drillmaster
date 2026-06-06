/**
 * SHSAT Question Bank Tracker — Google Apps Script webhook
 *
 * Attach this script to the "SHSAT Question Bank Tracker" Google Sheet.
 * Column layout (A–Q) must match the tracker template exactly.
 *
 * Setup:
 * 1. Open the SHSAT Question Bank Tracker Google Sheet.
 * 2. Extensions → Apps Script → paste this file → Save.
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the /exec URL into VITE_QUESTION_SUBMISSION_SHEET_URL in DrillMaster .env
 *
 * Columns:
 * A Question ID | B Passage ID | C Author | D Section | E Module | F Skill Tag |
 * G Format | H Question / Passage | I Choice A | J Choice B | K Choice C |
 * L Choice D | M Correct Answer | N Explanation | O Common Trap | P Reviewer | Q Status
 */

const SHEET_NAME = "SHSAT Question Bank Tracker";

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || "{}";
    const payload = JSON.parse(raw);
    const sheet = getSheet_();
    const questionId = allocateQuestionId_(sheet, payload.section, payload.type);

    sheet.appendRow([
      questionId,                        // A Question ID
      payload.passageId || "",           // B Passage ID
      payload.author || "",              // C Author
      payload.section || "",             // D Section
      payload.module || "",              // E Module
      payload.skillTag || "",            // F Skill Tag
      payload.format || "",              // G Format
      payload.question || "",            // H Question / Passage
      payload.choiceA || "",             // I Choice A
      payload.choiceB || "",             // J Choice B
      payload.choiceC || "",             // K Choice C
      payload.choiceD || "",             // L Choice D
      payload.correctAnswer || "",       // M Correct Answer
      payload.explanation || "",         // N Explanation
      payload.commonTrap || "",          // O Common Trap
      "",                                // P Reviewer (left blank)
      payload.status || "In Review",     // Q Status
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

function normalizeIdSection_(section) {
  var s = String(section || "").toUpperCase();
  if (s === "MATH") return "MATH";
  if (s === "ELA") return "ELA";
  return s || "UNK";
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

/** Browser health-check — open the /exec URL in a tab to confirm deployment. */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, message: "Question submission webhook is running." }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet "' + SHEET_NAME + '" not found.');
  }
  return sheet;
}
