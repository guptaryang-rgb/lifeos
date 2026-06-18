## 2026-06-16T22:52:23Z
You are Environment Diagnostics Worker. Your working directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_worker_env_diag. Your workspace directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos.

Please diagnose the host environment to see if any PostgreSQL database server, command-line utilities, or environment variables are available:
1. Print all system and user environment variables (e.g., using `Get-ChildItem Env:` in PowerShell). Specifically check if there is a pre-configured `DATABASE_URL` or similar environment variable.
2. Check if commands like `postgres`, `pg_ctl`, `psql`, `initdb`, `docker`, `docker-compose`, `scoop`, `winget`, `choco` are available in the PATH. Use `Get-Command` or `where.exe`.
3. Search for any folders containing "PostgreSQL", "pgSQL", "postgres" in `C:\Program Files`, `C:\Program Files (x86)`, `C:\ProgramData`, `C:\Users\gupta_ikq631n\AppData\Local`, or `C:\Users\gupta_ikq631n\AppData\Roaming`.
4. If a postgres binary is found, print its location and version.
5. Write your findings to `handoff.md` in your working directory and report back.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
