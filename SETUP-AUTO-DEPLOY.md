# Step-by-step: Auto-deploy every commit to Vercel

Follow these steps once. After that, every `git commit` will automatically push to GitHub and Vercel will deploy.

---

## Step 1: Create a GitHub Personal Access Token

1. Open: **https://github.com/settings/tokens/new**
2. **Note:** e.g. `Vercel auto-deploy`
3. **Expiration:** 90 days (or “No expiration” if you prefer)
4. Under **Scopes**, tick: **repo** (full control of private repositories)
5. Click **Generate token**
6. **Copy the token** (it looks like `ghp_xxxxxxxxxxxx`) — you won’t see it again.

---

## Step 2: Save the token in your project

**Option A – File (recommended)**  
In your project folder (same folder as `push-to-vercel.sh`), create a file named exactly:

- **`.github-token`**

Put **only** the token inside (one line, no spaces or quotes).  
Example: open `.github-token` in a text editor and paste:

```
ghp_YourTokenHere123456789
```

Save and close.  
**Do not** commit this file (it should be in `.gitignore`; if not, add `.github-token` to `.gitignore`).

**Option B – Environment variable**  
Instead of a file, you can set:

- **`GITHUB_TOKEN`** = your token  

(e.g. in your shell profile or in your IDE’s run configuration). The script will use this if the file is not present.

---

## Step 3: Connect Vercel to your GitHub repo

1. Go to **https://vercel.com** and log in.
2. Open your **Sandro Sandri** project (or create one and import the repo).
3. Go to **Settings** → **Git**.
4. Under **Connected Git Repository**, connect **GitHub** and choose the repo:  
   **`PedroSousa008/sandro-sandri`** (or your actual repo name).
5. Set **Production Branch** to **`main`** (or the branch you push to).
6. Save.  
From now on, every push to that branch will trigger a deploy.

---

## Step 4: Check your local Git remote

In Terminal, in your project folder, run:

```bash
git remote -v
```

You should see something like:

```
origin  https://github.com/PedroSousa008/sandro-sandri.git (fetch)
origin  https://github.com/PedroSousa008/sandro-sandri.git (push)
```

If the repo URL or name is different, your `push-to-vercel.sh` must use that same repo (the script currently has `PedroSousa008/sandro-sandri` in the URL). If your repo is different, open `push-to-vercel.sh` and change the URL in the `git push` line to match your repo.

---

## Step 5: Make sure the post-commit hook is active

The hook is in `.git/hooks/post-commit`. It must be executable.

In Terminal, in your project folder:

```bash
chmod +x .git/hooks/post-commit
```

(If you or someone else ever runs `git init` again or re-clones the repo, you’ll need to add this hook again.)

---

## Step 6: Test the automatic push and deploy

1. Make a small change (e.g. add a space in a file or edit a comment).
2. Commit and push as you normally would:

   ```bash
   git add .
   git commit -m "Test auto-deploy"
   ```

   The **post-commit** hook will run and call `push-to-vercel.sh`, which pushes to GitHub. You might see push output in the terminal, or it may run in the background (depending on how the hook is set up).

3. If the script uses the token correctly:
   - The push to `main` (or your production branch) will succeed.
   - In the Vercel dashboard you should see a new deployment start within a short time.

4. If something fails:
   - Run the script manually: `./push-to-vercel.sh` (or `npm run deploy`).
   - Check the message (e.g. “invalid token” or “permission denied”).
   - Check the log: `cat /tmp/sandro-sandri-deploy.log` (if your hook writes there).

---

## Summary

| Step | What you do |
|------|------------------|
| 1 | Create a GitHub token with **repo** scope. |
| 2 | Put the token in `.github-token` (or in `GITHUB_TOKEN`). |
| 3 | In Vercel, connect the project to your GitHub repo and set the production branch (e.g. `main`). |
| 4 | Confirm `git remote` and, if needed, the repo URL in `push-to-vercel.sh`. |
| 5 | Run `chmod +x .git/hooks/post-commit`. |
| 6 | Do a test commit and confirm a new deploy appears on Vercel. |

After this, **every time you run `git commit`**, the hook will run and push to GitHub, and Vercel will deploy that push automatically.
