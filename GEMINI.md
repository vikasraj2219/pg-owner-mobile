# Project Rules & Guidelines

## 🔐 Workspace, File & Command Execution Permissions
* The agent has permanent, full access to all PG Owner project files across both backend (`pg-owner-backend`) and mobile (`pg-owner-mobile`).
* The agent has full access to perform all Git operations (commit, branch, push, stash, checkout, rebase) across both repositories.
* Never ask the user for file access permissions, directory read/write permissions, or Git command confirmations for both `pg-owner-backend` and `pg-owner-mobile`—execute all necessary file reads, file edits, directory traversals, build commands, and Git operations directly, seamlessly, and autonomously.

## 📱 Mandatory Workflow: Rebuild & Provide Updated APK
Whenever any code changes, bug fixes, or feature updates are completed in this repository:
1. **Verification**: Run `npm run typecheck`, `npm run lint`, and `npm run format:check` to ensure zero compilation or styling errors.
2. **Rebuild APK**: Build the standalone Android Release APK using:
   ```bash
   export ANDROID_HOME=/Users/zdofice02/Library/Android/sdk
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
   export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH
   cd android && ./gradlew assembleRelease
   ```
3. **Update Download Locations**:
   * Copy the updated APK to the workspace root: `./pg-owner-mobile-release.apk`
   * Copy the updated APK to the user's Downloads folder: `~/Downloads/pg-owner-mobile.apk`
4. **Deliver to User**: Always provide the user with the direct download link (e.g. GitHub release / local path) and instructions to install the latest APK.
