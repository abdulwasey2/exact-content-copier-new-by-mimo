# Categorized Content Copier

Copy the contents of many project files at once — grouped by categories and
**byte-for-byte exact** — into the system clipboard as clean Markdown, ready to
paste into an AI chat.

## Setup

1. In your project root, create a folder named `categorization-of-content`.
2. Inside it, create one file per category, for example `frontend.txt`,
   `backend.txt`, `database.txt`.
3. In each category file, list one project-relative path per line:

```text
# frontend files
src/app.js
src/components
resources/views