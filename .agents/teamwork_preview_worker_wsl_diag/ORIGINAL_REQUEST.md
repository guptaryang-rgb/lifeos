## 2026-06-17T00:08:13Z
Please inspect if WSL (Windows Subsystem for Linux) is active and check if a PostgreSQL server is running inside it:
1. Run `wsl -l -v` to list all installed WSL distributions.
2. If there are distributions, run commands inside the default or running distribution to check if PostgreSQL is installed and running:
   - `wsl pg_isready`
   - `wsl systemctl status postgresql`
   - `wsl service postgresql status`
3. Check if you can connect to PostgreSQL on port 5432 from Windows (e.g. using `Get-NetTCPConnection` or testing connection).
4. Write your findings to `handoff.md` in your working directory and report back.
