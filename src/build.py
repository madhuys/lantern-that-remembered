"""Build index.html from src/index.template.html and the story .docx.

The story text is taken run by run from the Word file and only HTML-escaped,
so the chapters on the page are the chapters in the document, unaltered.
Italic runs become <em>. Two figures are slotted between paragraphs (never
inside one): the map after the father's line, the peak plate before
"The beam struck the town."
"""
import html, pathlib, sys
import docx

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOC = ROOT / "assets/download/the-lantern-that-remembered.docx"
TPL = ROOT / "src/index.template.html"

d = docx.Document(str(DOC))
chapters, cur = [], None
for p in d.paragraphs:
    style = p.style.name
    if style == "Heading 1" or not p.text.strip():
        continue
    if style == "Heading 2":
        cur = {"title": p.text, "paras": []}
        chapters.append(cur)
        continue
    parts = []
    for r in p.runs:
        t = html.escape(r.text, quote=False)
        parts.append(f"<em>{t}</em>" if r.italic else t)
    cur["paras"].append(("".join(parts), p.text))

assert len(chapters) == 3, chapters

def render(ch, slots):
    out = []
    for inner, plain in ch["paras"]:
        before = slots.get(("before", plain))
        if before:
            out.append(before)
        out.append(f"<p>{inner}</p>")
        after = slots.get(("after", plain))
        if after:
            out.append(after)
    return "\n".join(out)

tpl = TPL.read_text()
parts = {}
for marker in ("MAP", "PEAK"):
    a = tpl.index(f"<!--{marker}:START-->")
    b = tpl.index(f"<!--{marker}:END-->") + len(f"<!--{marker}:END-->")
    parts[marker] = tpl[a:b]
    tpl = tpl[:a] + tpl[b:]

ch1 = render(chapters[0], {("after", "Her father’s handwriting followed that curve: Leave room for what you cannot see."): parts["MAP"]})
ch2 = render(chapters[1], {})
ch3 = render(chapters[2], {("before", "The beam struck the town."): parts["PEAK"]})
for i, body in enumerate((ch1, ch2, ch3), 1):
    tpl = tpl.replace(f"<!--CH{i}-->", body)
    tpl = tpl.replace(f"<!--T{i}-->", html.escape(chapters[i - 1]["title"].split(". ", 1)[1]))
assert ch1.count("data-map") and ch3.count("data-peak"), "figure slots missed"

words = sum(len(t.split()) for c in chapters for _, t in c["paras"]) + sum(len(c["title"].split()) for c in chapters) + 4
tpl = tpl.replace("<!--WORDS-->", f"{words:,}")
(ROOT / "index.html").write_text(tpl)
print("ok", [len(c["paras"]) for c in chapters], "words", words)
