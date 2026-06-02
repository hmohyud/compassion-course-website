#!/usr/bin/env python3
"""
Apply the same "retired interactive features" changes to the two
self-contained sample lessons (public/samples/week10.html, week22.html)
that were made to the shared bundle (cc-weekly-emails/script.js + styles.css):

  - Don't initialize journals, word-count, section-read, reflection-timer,
    or the progress ring.
  - Hide the static journal / read / widget / timer elements via CSS.
  - Replace the 3-option print dropdown with a single "Print Lesson" button
    that prints lesson content only, excluding the Compassion Course
    Information (#info) and Resources (#resources) sections.

Each replacement asserts an exact occurrence count so a structural drift
in either file fails loudly instead of silently doing nothing.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = [ROOT / "public" / "samples" / "week10.html",
           ROOT / "public" / "samples" / "week22.html"]


def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"  ! {label}: expected 1 occurrence, found {n} — aborting")
    return text.replace(old, new)


# 1. Remove the contiguous init calls (journals, word-count, section-read,
#    reflection-timer). initProgressRing is handled separately below.
INIT_OLD = (
    "    initDialogueReveal();\n"
    "    initJournals();\n"
    "    initWordCount();\n"
    "    initSectionRead();\n"
    "    initReflectionTimer();\n"
    "    initHighlights();\n"
)
INIT_NEW = (
    "    initDialogueReveal();\n"
    "    // Retired for the 2026 cohort: initJournals(), initWordCount(),\n"
    "    // initSectionRead(), initReflectionTimer(), initProgressRing().\n"
    "    initHighlights();\n"
)

# 2. Remove the progress ring init (separate location).
RING_OLD = (
    "    initBreathingWidget();\n"
    "    initProgressRing();\n"
    "    initTypewriterQuotes();\n"
)
RING_NEW = (
    "    initBreathingWidget();\n"
    "    initTypewriterQuotes();\n"
)

# 3. Single "Print Lesson" button text.
PRINT_LABEL_OLD = "    printBtn.textContent = 'Print \\u25BE';"
PRINT_LABEL_NEW = "    printBtn.textContent = 'Print Lesson';"

# 4. Print button click → run lesson print directly (skip the dropdown).
PRINT_CLICK_OLD = (
    "    printBtn.addEventListener('click', function (ev) {\n"
    "      ev.stopPropagation();\n"
    "      openPrintMenu();\n"
    "    });"
)
PRINT_CLICK_NEW = (
    "    printBtn.addEventListener('click', function (ev) {\n"
    "      ev.stopPropagation();\n"
    "      runPrint('lesson');\n"
    "    });"
)

# 5. Skip #info / #resources in the lesson print.
SECTION_OLD = (
    "      document.querySelectorAll('.section-card').forEach(function (card) {\n"
    "        var h2 = card.querySelector('.accordion-header h2');\n"
)
SECTION_NEW = (
    "      document.querySelectorAll('.section-card').forEach(function (card) {\n"
    "        if (lessonOnly && (card.id === 'info' || card.id === 'resources')) return;\n"
    "        var h2 = card.querySelector('.accordion-header h2');\n"
)

# 6. Add cc-widget / cc-done-row to the print removal pass.
REMOVE_OLD = (
    "          '.journal-area', '.journal-saved', '.journal-footer', '.copy-btn',\n"
    "          '.timer-container', '.calendar-buttons', '.progress-ring-container',\n"
)
REMOVE_NEW = (
    "          '.journal-area', '.journal-saved', '.journal-footer', '.copy-btn',\n"
    "          '.cc-widget', '.cc-done-row',\n"
    "          '.timer-container', '.calendar-buttons', '.progress-ring-container',\n"
)

# 7. CSS that hides the static elements. Injected before the FIRST </head>
#    (the real document head — the second </head> lives inside the JS
#    print-template string).
HIDE_CSS = (
    "<style>\n"
    "/* Retired interactive features (2026 cohort) — hidden so the static\n"
    "   markup that still ships in this sample doesn't render. */\n"
    ".journal-area,.journal-saved,.journal-footer,.cc-widget,.cc-done-row,\n"
    ".section-read-btn,.accordion-header .read-badge,.progress-ring-container,\n"
    ".timer-container{display:none !important;}\n"
    "</style>\n"
    "</head>"
)


def transform(text):
    text = replace_once(text, INIT_OLD, INIT_NEW, "init block")
    text = replace_once(text, RING_OLD, RING_NEW, "progress ring init")
    text = replace_once(text, PRINT_LABEL_OLD, PRINT_LABEL_NEW, "print button label")
    text = replace_once(text, PRINT_CLICK_OLD, PRINT_CLICK_NEW, "print click handler")
    text = replace_once(text, SECTION_OLD, SECTION_NEW, "section skip")
    text = replace_once(text, REMOVE_OLD, REMOVE_NEW, "remove selectors")
    # Inject the hide CSS before the first </head> only.
    idx = text.find("</head>")
    if idx < 0:
        raise SystemExit("  ! no </head> found — aborting")
    text = text[:idx] + HIDE_CSS + text[idx + len("</head>"):]
    return text


def main():
    for path in SAMPLES:
        print(f"{path.name}:")
        original = path.read_text(encoding="utf-8")
        updated = transform(original)
        path.write_text(updated, encoding="utf-8")
        print("  ok — all 7 transforms applied")


if __name__ == "__main__":
    main()
