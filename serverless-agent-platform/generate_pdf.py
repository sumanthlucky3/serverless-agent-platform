import markdown
import sys
import os
import time

md_file = sys.argv[1]
pdf_file = sys.argv[2]
html_file = "temp.html"

with open(md_file, "r", encoding="utf-8") as f:
    text = f.read()

# Convert to HTML
html = markdown.markdown(text, extensions=['extra', 'codehilite'])

html_content = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{
    font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    line-height: 1.6;
    padding: 30px;
    max-width: 900px;
    margin: 0 auto;
    color: #24292e;
}}
h1, h2, h3 {{
    border-bottom: 1px solid #eaecef;
    padding-bottom: 0.3em;
    color: #111;
}}
code {{
    background-color: #f6f8fa;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: Consolas, monospace;
    font-size: 85%;
}}
pre code {{
    display: block;
    padding: 16px;
    overflow: auto;
    line-height: 1.45;
}}
ul, ol {{
    padding-left: 2em;
}}
li {{
    margin-bottom: 0.25em;
}}
</style>
</head>
<body>
{html}
</body>
</html>
"""

with open(html_file, "w", encoding="utf-8") as f:
    f.write(html_content)

# Use MS Edge to print to PDF
edge_cmd = f'Start-Process "msedge" -ArgumentList "--headless","--disable-gpu","--print-to-pdf={pdf_file}","{html_file}" -Wait'
os.system(f'powershell -Command "{edge_cmd}"')

# Wait for Edge to finish writing the file
time.sleep(2)
if os.path.exists(html_file):
    os.remove(html_file)
print(f"Generated {pdf_file}")
