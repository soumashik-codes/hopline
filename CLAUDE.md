@AGENTS.md

# Hopline project rules

- Accessibility first: aim for WCAG 2.2 AA. Use semantic HTML, label every control, support the keyboard, never use colour alone, and keep tap targets at least 44px.
- Security: TFL_APP_KEY is used on the server only. Never prefix it with NEXT_PUBLIC_ and never commit .env.local.
- Data: all transport code lives in src/lib/transport behind the provider functions. UI code never calls TfL directly.
- Accuracy: never show guessed information to users as fact. Clearly label sample data.
- Workflow: plan first, explain trade-offs, and run lint and type checks before saying a task is done. Don't commit unless asked.
- Writing: UK English and plain language in all text users see.