# BeCreator Learn — Visual Course Publisher Guide

Welcome! This guide explains how to use the built-in visual **Course Builder** to add new courses, lessons, and quizzes to the BeCreator Learn application without writing any code.

---

## 🚀 Quick Start in 4 Steps

### Step 1: Connect your Google Account
1. Open the BeCreator app.
2. Go to **Google Drive** in the app and click **Connect Google Drive**.
3. Sign in to your Google Account.
4. *Once verified*, the **Add Course (🎓➕)** button will instantly appear in the **Platforms** section of your dashboard!
   > ⚠️ **Note**: Access is restricted to approved emails. If the button does not appear after logging in, please contact the repository administrator to add your email to the approved creators list.

---

### Step 2: Set Up GitHub Sync (First Time Only)
To automatically submit your courses, you need to link your GitHub profile using a **Personal Access Token (PAT)**:
1. Sign in to [GitHub](https://github.com).
2. Go to **Settings** → **Developer settings** (at the bottom of the left sidebar) → **Personal access tokens** → **Tokens (classic)**.
3. Click **Generate new token (classic)**.
4. Name it `BeCreator Course Builder` and select the **`public_repo`** scope checkbox.
5. Click **Generate token** and copy the code (it starts with `ghp_`).
6. Paste this code into the **GitHub PAT** field under **Git Sync Settings** inside the BeCreator Course Builder.
   > 🔒 **Security Note**: Your token is stored only in your local browser storage (`localStorage`) and is never sent to any third-party servers.

---

### Step 3: Build Your Course Visually
Open the Course Builder in the app and fill out the simple visual forms:
- **Metadata**: Add a Course Title, unique lowercase Course ID (e.g. `javascript`), and Description.
- **Publisher Attribution**: Enter your name, email, and GitHub username so that you get visible credits on the course and permanent history logs in the repository.
- **Adding Content**:
  - Click **Add Section** to create a module.
  - Click **Add Lesson** to create a text/video lesson. For video, just paste the 11-character YouTube video ID (e.g., if link is `youtube.com/watch?v=eIrMbAQSU34`, copy `eIrMbAQSU34`).
  - Click **Add Quiz** to add questions, options, correct answers, and explanations.

---

### Step 4: Submit a Pull Request
1. Enter your GitHub owner name (e.g. `Rakshitranjansingh`) and repository name (`becreator`) under Git Sync Settings.
2. Click **Submit Pull Request**.
3. The app will automatically create a branch and open a **Pull Request (PR)** on GitHub.
4. Once the repository owner approves and merges the Pull Request, your new course will go live automatically!
