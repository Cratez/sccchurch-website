---
name: summarize-services
description: Give recent Sunday service videos on the Sermons page a title and short summary, written from YouTube's automatic captions. Downloads captions locally with yt-dlp, reads each transcript, and saves a title and summary to data/video-notes.json. Use when the user invokes /summarize-services or asks to title, summarize, or caption the recent services or sermon videos.
---

# Summarize recent services

The Sermons page shows the 6 most recent service recordings. Most have no title, because the YouTube streams are only named like `SCCC 10/18/2026`. This skill reads YouTube's automatic captions for those services and writes a sermon title and a short summary for each into `data/video-notes.json`. The daily "Update sermon data" job merges them into the page (see "Service titles from captions" in README.md).

Only about half of the services have automatic captions. Videos without them are left as they are ("Sunday service").

## Steps

1. **Get the transcripts.** From the repo root, run:

   ```
   node scripts/video-notes/transcripts.js --out <scratch folder>
   ```

   Use your scratchpad folder (or a temp folder) for `--out`, never a folder inside the repo. It prints a JSON report with one entry per recent service that has no saved notes yet:
   - `"ok"`: a transcript was written to `file`.
   - `"no-captions"`: YouTube has no automatic captions for it. Skip it.
   - `"error"`: show the error to the user. If yt-dlp is missing or out of date, suggest `winget install yt-dlp.yt-dlp` or `yt-dlp -U`. A "page needs to be reloaded" or bot-check error usually means yt-dlp needs updating.

   If the report is empty, every recent service already has notes. Tell the user and stop. To redo specific videos, pass `--video <videoId>` (repeatable).

2. **Read each transcript in full** and write a title and summary for it. The transcript covers the whole service (welcome, announcements, music, prayer, sermon), with speech-recognition errors and no punctuation in places. Focus on **the sermon**:
   - **Title:** the sermon's message as the preacher might title it, 3 to 8 words, in title case, like the church's own sermon titles ("You Can Have Joy No Matter What", "Patience is a Command", "Don't Be like the Wicked Wealthy"). Don't add quotation marks, the date, or the passage.
   - **Summary:** one or two plain sentences (under 300 characters) on what the sermon teaches. Mention the main passage if it's clear (e.g. "From James 2:14-26, ..."). No hype or invented details. Write as a description, not in the preacher's voice. Don't include names of church members or private details mentioned in announcements or prayer requests.
   - If there's no recognizable sermon (e.g. a special program), or the transcript is too garbled to tell, skip that video and say why.

3. **Save** each one to `data/video-notes.json`, keyed by video ID. Keep the existing entries, keep the file sorted by date (newest first), and use 2-space indentation:

   ```json
   {
     "bBLv6JDgdpo": {
       "date": "2026-10-04",
       "title": "Faith That Works",
       "summary": "From James 2:14-26, ...",
       "source": "youtube-auto-captions"
     }
   }
   ```

4. **Apply** them to the page data by running `node scripts/video-notes/apply.js`. It copies the titles and summaries into `data/sermons.json` (which is what the page reads) using the same rules as the daily job, and prints what changed. Also run it after any hand edit to `data/video-notes.json`.

5. **Check** by running `npm test`, which validates both files and fails if a saved note hasn't been applied. Fix anything it reports.

6. **Report** a short table to the user: date, title, and summary for each video saved, plus which videos had no captions or were skipped. Remind them:
   - The local page shows them now; the live site does once they commit and push.
   - On the page, a title from the sermon's notes PDF still takes priority; the caption-based title is used when there's no PDF title. The summary is shown either way.
   - They can edit or delete any entry in `data/video-notes.json` by hand, then run `node scripts/video-notes/apply.js` (or ask Claude to).

Don't commit unless the user asks.
