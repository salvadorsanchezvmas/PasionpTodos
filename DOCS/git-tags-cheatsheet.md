# Git Tags Cheat Sheet

Here is your definitive cheat sheet for the most important Git commands used to manage tags locally and on GitHub.

## 1. Creating Tags

There are two types of tags: **Annotated** (which include metadata like the author, date, and a message) and **Lightweight** (just a pointer to a commit). You should almost always use annotated tags for releases.

* **Create an annotated tag (Recommended):**
    ```bash
    git tag -a v1.0.0 -m "Release version 1.0.0"
    ```
* **Create a lightweight tag:**
    ```bash
    git tag v1.0.0-beta
    ```
* **Tag an older, past commit:**
    If you forgot to tag a release, you can grab the commit hash (e.g., `9fceb02`) and tag it retroactively.
    ```bash
    git tag -a v1.2 -m "Late tag for v1.2" 9fceb02
    ```

## 2. Pushing Tags to GitHub

By default, running `git push` **does not** transfer your tags to GitHub. You have to push them explicitly.

* **Push a single, specific tag:**
    ```bash
    git push origin v1.0.0
    ```
* **Push all local tags at once:**
    ```bash
    git push origin --tags
    ```

## 3. Viewing and Searching Tags

* **List all tags:** (Displays in alphabetical order)
    ```bash
    git tag
    ```
* **Search for specific tags:** (Useful if you have hundreds of tags)
    ```bash
    git tag -l "v1.8*"
    ```
    *(This will list v1.8.0, v1.8.1, etc.)*
* **See the details of a tag:** (Shows the tagger, date, message, and the commit it points to)
    ```bash
    git show v1.0.0
    ```

## 4. Deleting Tags

Deleting a tag requires two steps if you have already pushed it to GitHub: you must delete it from your local machine, and then tell GitHub to delete it from the remote server.

* **Delete a tag locally:**
    ```bash
    git tag -d v1.0.0
    ```
* **Delete a tag from GitHub (Remote):**
    ```bash
    git push origin --delete v1.0.0
    ```

## 5. Checking Out a Tag (Time Travel)

If you want to look at the exact code from a previous release, you can check out that tag.

* **Look around (Detached HEAD):**
    ```bash
    git checkout v1.0.0
    ```
    *Warning: This puts you in a "detached HEAD" state. You can look around and compile the code, but if you make changes and commit them, they won't belong to any branch.*

* **Make changes to an old tag (Best Practice):**
    If you need to fix a bug in `v1.0.0`, create a brand new branch based on that exact tag.
    ```bash
    git checkout -b hotfix-v1.0.0-bug v1.0.0
    ```