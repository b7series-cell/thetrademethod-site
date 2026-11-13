# DESIGN.md — placeholder

Replace this file with your existing DESIGN.md.

It is kept in `_docs/` so it ships with the folder (Claude and any
future collaborator can read it) but never reaches the server.

If yours doesn't exist in written form yet, it should cover at minimum:

- the palette, with hex values and what each color means
- typography: which face for prose, which for numbers and times
- the required section order on a setup page
- chart conventions: inline SVG, no external chart library
- the print target (A3 landscape)

`css/directory.css` currently hardcodes hex values rather than using
your variables, so it drops in without knowing your naming. Swap them
for your variables whenever you like.
