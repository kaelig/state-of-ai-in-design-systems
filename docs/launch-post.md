# How design systems talk to machines

Draft announcement. Channel-agnostic on purpose: no thread numbering, no
hashtags, no platform-specific formatting. Trim from the bottom for a shorter
channel.

---

For three days at the end of July I read twenty open-source design systems the
way an agent would. Not their documentation sites. Their llms.txt files, their
MCP servers, their agent skills, their editor rules: the things a design system
ships so a coding assistant can build with it instead of inventing its own
buttons.

The result is a field survey. 187 affordances across those twenty systems and
the six platforms around them, plus 157 techniques teams use to keep a model on
real components and real tokens. Every claim links to a page that loads and
shows the thing. Where a system ships nothing, the record says so, because an
absence is a finding too.

Then there was the obvious problem. A study about machine legibility that you
can only read as HTML is an argument that undercuts itself.

So the report ships everything it catalogs. Every route has a markdown twin.
Every record has a JSON twin. An llms.txt indexes all of it with a measured
size on every entry, so an agent can budget its context before it fetches. Ask
for `text/markdown` in an Accept header and any page hands back its twin
instead of a page of markup. There is a SQLite export, so you can recount the
numbers rather than trust them. There is an MCP server. There are WebMCP tools
registered in the page itself, which almost nothing can call yet, and the
report says that plainly instead of listing it as a feature.

None of it is a demo. It is the same data the pages render, generated from the
same records at build time, which is the only reason it cannot drift from what
you read on screen.

There are two ways in, and the first costs nothing. Paste a link and a prompt
into whatever assistant you already have open, and the answers come back
grounded in the records, with the source link on each, instead of whatever a
model half-remembers about design systems.

The second is worth the extra step. Connect the server to your tool and run
`build-my-roadmap`. Tell it what your design system has and hasn't got, and it
hands back the gaps in the order worth closing them, each one carrying the
record it came from, so you can go and read what somebody else did before you
commit to it.

The data is a snapshot of 26–28 July 2026. The systems in it ship weekly, so
parts of it are wrong already. Corrections take a source URL and nothing else.
