# TeamPlus project account

Use the GitHub account **yazhsab** for this project. The user explicitly selected this account; do not substitute another authenticated account.

For GitHub CLI/API operations, obtain the existing `yazhsab` credential with `gh auth token --hostname github.com --user yazhsab` and pass it only through the child process's `GH_TOKEN` environment. Never print or persist that token. Keep the global active GitHub account unchanged. Repository-local Git credentials are configured to retrieve the same account from the keychain.

The selected deployment target is Netlify with managed Supabase. Follow `docs/DEPLOYMENT.md` and preserve the independent Sites preview.
