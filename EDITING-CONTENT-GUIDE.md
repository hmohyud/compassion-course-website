# Editing Website Content - Visual Guide

> **No coding experience needed!** This guide walks you through editing the text on the Compassion Course website using only your web browser.

---

## How It Works (The Big Picture)

```
You edit text on GitHub  -->  GitHub auto-builds the site  -->  Site updates in ~2 minutes
```

All the website text lives in **one single file**. You edit it through GitHub's website, and the site automatically updates. That's it!

---

## Step 1: Open the Content File

Click this link (you must be logged into GitHub):

### [Click here to open siteContent.ts](https://github.com/hmohyud/compassion-course-website/blob/main/src/data/siteContent.ts)

You'll see a page that looks like this:

```
+------------------------------------------------------------------------+
|  hmohyud / compassion-course-website                                   |
|  Code   Issues   Pull requests   Actions   ...   Settings              |
+------------------------------------------------------------------------+
|                                                                        |
|  compassion-course-website / src / data / siteContent.ts               |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  | Code | Blame    1025 lines    Raw  ...  PENCIL ICON  ...         |  |
|  |                                         ^^^^^^^^^^^^              |  |
|  |                                         CLICK THIS!               |  |
|  +------------------------------------------------------------------+  |
|  |  1  //                                                            |  |
|  |  2  // siteContent.ts - Centralized text content                  |  |
|  |  3  // Organized by page > section > field                        |  |
|  |  ...                                                              |  |
+------------------------------------------------------------------------+
```

---

## Step 2: Click the Pencil Icon to Edit

> **Where is it?** Look at the **top-right area** of the file content, in the toolbar row that shows `Raw`, copy icons, etc. The **pencil icon** is near the right end of that row.

```
                                                    This one!
                                                       |
                                                       v
    Raw    [icon] [icon] [download] [pencil] [dropdown] [icon]
                                     ^^^^^^
                                   CLICK ME
```

After clicking the pencil, the page changes to an **editor** where you can type directly.

---

## Step 3: Find the Text You Want to Change

Once you're in the editor:

1. Press **Ctrl + F** on your keyboard (or **Cmd + F** on Mac)
2. A search box appears
3. Type the **exact text** you see on the website that you want to change

> **Tip:** Search for a unique phrase. For example, if the website says "Changing Lives for 15 years", search for exactly that.

```
+------------------------------------------------------------------------+
|  Edit | Preview                           Cancel changes | Commit...   |
+------------------------------------------------------------------------+
|                           +-------------------+                        |
|                           | Find: [your text] |  <-- Search box        |
|                           +-------------------+                        |
|                                                                        |
|  10    home: {                                                         |
|  11      hero: {                                                       |
|  12        eyebrowDefault: 'A Guided Global Journey...',               |
|  13        logoAlt: 'The Compassion Course',                           |
|  14  >>>   heading: 'The Compassion Course',   <<<  FOUND IT!         |
|  15        subtitlePrefix: 'with',                                     |
|  16        subtitleName: 'Thom Bond',                                  |
|  ...                                                                   |
+------------------------------------------------------------------------+
```

---

## Step 4: Edit the Text

> **GOLDEN RULE:** Only change the text **between the quote marks**. Don't touch anything else!

### What to change vs. what to leave alone:

```
        LEAVE          CHANGE THIS PART          LEAVE
       ALONE!        (text inside quotes)        ALONE!
         |                  |                      |
         v                  v                      v
    heading: 'The Compassion Course',
    ^^^^^^^   ^                    ^^
    keyword    opening quote        closing quote + comma

    DON'T      DON'T               DON'T
    TOUCH      REMOVE              REMOVE
```

### Example - Before:
```
heading: 'The Compassion Course',
```

### Example - After:
```
heading: 'The Compassion Course - Transform Your Life',
```

> **Important:** Keep the quote marks `' '` and the comma `,` at the end!

---

## Step 5: Save Your Changes

When you're done editing, look at the **top-right corner** for the green button:

```
+------------------------------------------------------------------------+
|                                                                        |
|                              [Cancel changes]  [Commit changes...]     |
|                                                  ^^^^^^^^^^^^^^^^^     |
|                                                  CLICK THIS GREEN      |
|                                                  BUTTON                |
+------------------------------------------------------------------------+
```

After clicking, a popup appears:

```
+------------------------------------------+
|                                          |
|         Commit changes                   |
|                                          |
|  Commit message                          |
|  +------------------------------------+  |
|  | Updated hero heading               |  | <-- Write what you changed
|  +------------------------------------+  |
|                                          |
|  Extended description                    |
|  +------------------------------------+  |
|  |                                    |  | <-- Optional, can leave empty
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|  (o) Commit directly to the main branch  | <-- Make sure this is selected!
|  ( ) Create a new branch...              |
|                                          |
|           [Cancel]  [Commit changes]     |
|                       ^^^^^^^^^^^^^^^    |
|                       CLICK THIS!        |
+------------------------------------------+
```

### Fill it in like this:

1. **Commit message** - Write a short note about what you changed (e.g., "Updated homepage heading" or "Fixed typo in FAQ")
2. Make sure **"Commit directly to the main branch"** is selected (it should be by default)
3. Click the green **"Commit changes"** button

---

## Step 6: Verify the Site Updated

After committing, the site automatically rebuilds. To check:

### Go to the [Actions tab](https://github.com/hmohyud/compassion-course-website/actions)

```
+------------------------------------------------------------------------+
|  Code   Issues   Pull requests   [Actions]   Projects   ...            |
|                                   ^^^^^^^                              |
|                                  CLICK THIS                            |
+------------------------------------------------------------------------+
|                                                                        |
|  All workflows                                                         |
|                                                                        |
|  [green circle] Updated hero heading          main    2 min ago        |
|                 Deploy to Firebase Hosting             1m 36s           |
|                                                                        |
|  [green circle] previous change               main    yesterday        |
|                 Deploy to Firebase Hosting             1m 47s           |
|  ...                                                                   |
+------------------------------------------------------------------------+
```

| What you see | What it means |
|:---:|:---|
| Green circle | Success! Your change is live on the website |
| Yellow circle | Still building... wait a minute and refresh |
| Red circle | Something went wrong (see troubleshooting below) |

> **It usually takes about 2 minutes.** Refresh the page to see updates.

---

## Quick Reference: What's Where in the File

Use **Ctrl+F** to search for these keywords to find each section:

### Home Page

| What you want to change | Search for this |
|:---|:---|
| Big title at the top | `heading: 'The Compassion Course'` |
| Description below the title | `descriptionDefault:` |
| "Learn More" / "Register Now" buttons | `ctaPrimaryDefault:` and `ctaSecondaryDefault:` |
| Statistics (14 Years, 50,000+ etc.) | `stats:` |
| "What You'll Learn" outcomes | `whatYoullLearn:` |
| The 3 value prop cards | `valueProps:` |
| "Sample the Course" section | `sampleTheCourse:` |
| Testimonial quotes | `socialProof:` then `testimonials:` |
| "What the Course Includes" | `courseIncludes:` |
| Bottom call-to-action | Search for `cta:` under the `home` section |

### Learn More Page

| What you want to change | Search for this |
|:---|:---|
| Page title / banner | Search for `learnMore:` then `hero:` |
| Origin story timeline | `origin:` |
| How It Works steps | `howItWorks:` |
| Weekly topics list (10 weeks) | `weeklyTopics:` |
| Sample Week 1 (Empathy) | `sampleEmpathy:` |
| Sample Week 2 (Appreciation) | `sampleAppreciation:` |
| "What Makes This Different" cards | `whatMakesDifferent:` |
| Options and extras | `optionsExtras:` |
| Leadership Track details | `leadershipTrack:` |
| Thom Bond's bio | `founder:` |
| FAQ questions and answers | `faq:` then `items:` |

### About Page

| What you want to change | Search for this |
|:---|:---|
| Page title / banner | `aboutUs:` then `hero:` |
| Mission statement | `mission:` |
| Organization story | `story:` |
| Team members | `team:` then `members:` |

---

## Don't Worry About Spacing

> **Good news:** Indentation and spacing **don't matter** in this file. The site will work fine even if your lines aren't perfectly aligned. Unlike some programming languages, JavaScript ignores extra spaces. So if your edit looks a little messy compared to the rest of the file, that's totally okay — the site won't break because of spacing.

---

## The Rules (Read This!)

### Things you CAN safely change

| Type | Example | What to do |
|:---|:---|:---|
| Regular text | `'The Compassion Course'` | Change the words between the quotes |
| Numbers/stats | `'14'` or `'50,000+'` | Change the number between the quotes |
| Descriptions | `'Changing Lives for 15 years...'` | Rewrite the text between the quotes |

### Things you should NOT touch

| Type | Example | Why |
|:---|:---|:---|
| Keywords before colons | `title:` `heading:` `description:` | These are code — the site needs them |
| Curly braces | `{` and `}` | These group things together |
| Square brackets | `[` and `]` | These hold lists |
| Commas at end of lines | `'some text',` <-- that comma | The code needs these |
| Icon codes | `fas fa-heart` | These display icons on the site |
| File paths | `/images/photo.jpg` | These point to images/videos |
| URLs | `https://...` | Only change if you know the new URL |

### Special Characters Cheat Sheet

If you need these characters inside **single quotes** `'...'`:

| Character | What to type instead | Example |
|:---:|:---|:---|
| ' (apostrophe) | `\u2019` | `'it\u2019s great'` |
| " (open quote) | `\u201C` | `'\u201CHello\u201D'` |
| " (close quote) | `\u201D` | `'\u201CHello\u201D'` |
| ... (ellipsis) | `\u2026` | `'Wait\u2026'` |
| -- (em dash) | `\u2014` | `'life\u2014and love'` |

> **Easier option:** Wrap the text in **double quotes** instead of single quotes if it contains an apostrophe:
> `"it's a wonderful course"` (this works fine!)

---

## Worked Example: Changing a Statistic

Let's say the site currently shows **"14 Years Running"** and you want to update it to **"15"**.

**Step 1:** Open the file and press Ctrl+F, search for `14`

**Step 2:** Find this line:
```
{ number: '14', label: 'Years Running' },
```

**Step 3:** Change `14` to `15`:
```
{ number: '15', label: 'Years Running' },
```

**Step 4:** Click "Commit changes...", write "Updated years running to 15", and commit.

**Step 5:** Wait ~2 minutes, then check the website!

---

## Worked Example: Adding a New FAQ

**Step 1:** Search for `faq:` then scroll down to see the list of questions.

**Step 2:** Each FAQ looks like this:
```
{
  question: 'How long is the course?',
  answer: 'The course runs for 52 weeks...',
},
```

**Step 3:** To add a new one, copy that pattern and paste it right after the last FAQ item. Make sure to include the comma at the end:
```
{
  question: 'Is the course available in Spanish?',
  answer: 'Yes! The course is available in 20 languages including Spanish.',
},
```

**Step 4:** Commit your changes.

---

## Troubleshooting

### The build failed (red X on Actions page)

You probably accidentally deleted a quote, comma, or bracket. Common mistakes:

| Mistake | What happened | How to fix |
|:---|:---|:---|
| Missing quote | `'The Compassion Course` | Add the closing quote: `'The Compassion Course'` |
| Missing comma | `'The Compassion Course'` (no comma at end) | Add comma: `'The Compassion Course',` |
| Deleted a bracket | Missing `}` or `]` somewhere | Find where you were editing and add it back |
| Used a plain apostrophe in single quotes | `'it's great'` | Use `"it's great"` or `'it\u2019s great'` |

### How to undo a bad change

1. Go to the [commit history](https://github.com/hmohyud/compassion-course-website/commits/main)
2. Find the commit **before** yours
3. Click on `siteContent.ts` in that commit
4. Click the pencil icon to edit
5. Select all the text (Ctrl+A), copy it (Ctrl+C)
6. Go back to the [current file](https://github.com/hmohyud/compassion-course-website/blob/main/src/data/siteContent.ts)
7. Click the pencil icon, select all (Ctrl+A), paste (Ctrl+V)
8. Commit the change with message "Reverted bad edit"

---

## Quick Links

| What | Link |
|:---|:---|
| Edit the content file | [siteContent.ts](https://github.com/hmohyud/compassion-course-website/edit/main/src/data/siteContent.ts) |
| View the content file | [siteContent.ts](https://github.com/hmohyud/compassion-course-website/blob/main/src/data/siteContent.ts) |
| Check deployment status | [Actions](https://github.com/hmohyud/compassion-course-website/actions) |
| View change history | [Commits](https://github.com/hmohyud/compassion-course-website/commits/main) |
| View the live website | [compassioncourse.org](https://compassioncourse.org) |
