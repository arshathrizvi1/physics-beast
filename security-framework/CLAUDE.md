# Project Context & Coding Standards (CLAUDE.md)

## Build, Test & Lint Commands
- Dev Server: `npm run dev`
- Production Build: `npm run build`
- Unit Tests: `npm test`
- Code Coverage: `npm run test:coverage`
- Security Audit: `npm run security:check`
- Merge Gate: `npm run gate:all`

## Architecture & Code Standards
1. **Absolute File Paths**: Always require and provide absolute file paths when referencing project assets or tools.
2. **Database Queries**: Never concatenate SQL strings. Always use parameterized queries (`.prepare().bind()`).
3. **Price Authority**: Prices are never computed on the frontend; always resolved from the server database.
4. **Sessions & Auth**: 5-minute CSPRNG OTPs; PBKDF2 (100k iterations); HttpOnly Strict cookies.
5. **Code Style**:
   - React 18 / Next.js App Router.
   - Clean, modular ES modules with strict error handling.
   - Zero unhandled promises; return `void` from event handlers.
   - Preserve 100% test line coverage on all edge worker and security modules.
