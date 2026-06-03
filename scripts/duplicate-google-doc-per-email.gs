/**
 * Duplicate a template Google Doc once per email, give each copy a shareable
 * EDIT link, and record  email → link  back into the sheet.
 *
 * This is a GOOGLE APPS SCRIPT (not Node). It runs inside your Google account,
 * so there are no API keys to set up and you end up owning every copy.
 *
 * ── SETUP (one time) ─────────────────────────────────────────────────────────
 *  1. Make a new Google Sheet. Put your email list in column A, one per row.
 *     (Optional: a header like "Email" in row 1 — keep HAS_HEADER = true.)
 *  2. In that sheet: Extensions → Apps Script. Delete the sample code, paste
 *     THIS whole file, and Save.
 *  3. Fill in TEMPLATE_DOC_ID below (the Doc you want to copy — get it from the
 *     Doc's URL: docs.google.com/document/d/<THIS_PART>/edit).
 *  4. (Optional) set DEST_FOLDER_ID so all copies land in one Drive folder
 *     (folder ID is the last part of the folder's URL).
 *  5. Back in the editor, choose the function `duplicateForAllEmails` and click
 *     Run. The first run asks you to authorize Drive + Sheets access — approve.
 *
 * ── OUTPUT ───────────────────────────────────────────────────────────────────
 *  Column B fills in with each email's edit link (column C holds any error).
 *  That sheet IS your "emails + doc links" file — to get a literal file,
 *  File → Download → Comma-separated values (.csv).
 *
 * ── RESUMABLE ────────────────────────────────────────────────────────────────
 *  Apps Script caps a single run at ~6 minutes. This stops itself before that
 *  and skips any row that already has a link, so if you have a long list just
 *  click Run again and it continues where it left off.
 */

// ── config ───────────────────────────────────────────────────────────────────
const TEMPLATE_DOC_ID = 'PASTE_TEMPLATE_DOC_ID_HERE';   // the Doc to duplicate
const DEST_FOLDER_ID  = '';                              // optional Drive folder for copies ('' = My Drive)
const COPY_NAME       = 'The Compassion Course Workbook — '; // copy title; email is appended
const HAS_HEADER      = true;        // row 1 of column A is a header label
const LINK_ACCESS     = 'ANYONE_WITH_LINK'; // 'ANYONE_WITH_LINK' = anyone with the link can edit
                                            // 'INVITE'           = only that email's Google account can edit
const MAX_RUNTIME_MS  = 5 * 60 * 1000;      // stop before Apps Script's ~6-min limit

function duplicateForAllEmails() {
  const start = Date.now();
  const sheet = SpreadsheetApp.getActiveSheet();
  const firstRow = HAS_HEADER ? 2 : 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < firstRow) { Logger.log('No emails found in column A.'); return; }

  if (HAS_HEADER) {
    sheet.getRange(1, 2).setValue('Doc edit link');
    sheet.getRange(1, 3).setValue('Status');
  }

  const template = DriveApp.getFileById(TEMPLATE_DOC_ID);
  const folder = DEST_FOLDER_ID ? DriveApp.getFolderById(DEST_FOLDER_ID) : null;

  const n = lastRow - firstRow + 1;
  const emails = sheet.getRange(firstRow, 1, n, 1).getValues();
  const links  = sheet.getRange(firstRow, 2, n, 1).getValues();

  let created = 0, skipped = 0, errored = 0, stopped = false;
  for (let i = 0; i < n; i++) {
    const email = String(emails[i][0]).trim();
    if (!email) continue;
    if (links[i][0]) { skipped++; continue; }            // already done → resume-safe

    if (Date.now() - start > MAX_RUNTIME_MS) { stopped = true; break; }

    const row = firstRow + i;
    try {
      const copy = folder
        ? template.makeCopy(COPY_NAME + email, folder)
        : template.makeCopy(COPY_NAME + email);

      if (LINK_ACCESS === 'INVITE') {
        copy.addEditor(email);                            // restrict edit to that Google account
      } else {
        copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      }

      sheet.getRange(row, 2).setValue(copy.getUrl());     // .../document/d/<id>/edit
      sheet.getRange(row, 3).setValue('OK');
      SpreadsheetApp.flush();                             // persist each row (survives a timeout)
      created++;
    } catch (e) {
      sheet.getRange(row, 3).setValue('ERROR: ' + e.message);
      SpreadsheetApp.flush();
      errored++;
    }
  }

  const msg = 'Created ' + created + ' copies; skipped ' + skipped + ' already done; ' +
    errored + ' errors.' + (stopped ? '  Stopped before the time limit — run again to continue.' : '');
  Logger.log(msg);
  try { SpreadsheetApp.getActive().toast(msg, 'Done', 8); } catch (e) {}
}
