# Firebase Service Account Setup Guide

This guide will help you set up Firebase service account credentials for CI/CD deployment.

## Step 1: Create Service Account in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **compassion-course-websit-937d6**
3. Click the gear icon ⚙️ next to "Project Overview"
4. Select **Project Settings**
5. Go to the **Service Accounts** tab
6. Click **Generate New Private Key**
7. Click **Generate Key** in the confirmation dialog
8. A JSON file will be downloaded - **save this file securely**

## Step 2: Add Service Account to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/ccfoundation-admin/compassion-course-website`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FIREBASE_SERVICE_ACCOUNT`
5. Value: Paste the **entire contents** of the JSON file you downloaded
6. Click **Add secret**

## Step 3: Verify the Setup

The workflow will now:
- Use the service account JSON from GitHub secrets
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Authenticate Firebase CLI using the service account (no token needed)

## Important Notes

- **Never commit the service account JSON file to the repository**
- The JSON file contains sensitive credentials - keep it secure
- The service account needs the following IAM roles:
  - **Firebase Admin** (for project access)
  - **Firebase Hosting Admin** (for hosting deployment)
  - **Firebase Storage Admin** (for storage rules deployment)
  - **Service Usage Admin** (to enable required APIs like Firebase Storage)
  - **Editor** or **Owner** (for full project access, recommended for CI/CD)

## Troubleshooting

If deployment fails:
1. Verify the service account JSON is correctly pasted in GitHub secrets
2. Check that the service account has the correct permissions
3. Ensure the project ID matches: `compassion-course-websit-937d6`

## Alternative: Check Service Account Permissions

If you need to verify or update permissions:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **compassion-course-websit-937d6**
3. Go to **IAM & Admin** → **Service Accounts**
4. Find your service account and click on it
5. Go to the **Permissions** tab
6. Click **Grant Access** or **Edit** to add the following roles:
   - **Firebase Admin** (`roles/firebase.admin`)
   - **Firebase Hosting Admin** (`roles/firebasehosting.admin`)
   - **Firebase Storage Admin** (`roles/firebasestorage.admin`)
   - **Service Usage Admin** (`roles/serviceusage.serviceUsageAdmin`) - **Required to enable APIs**
   - **Editor** (`roles/editor`) - Recommended for full access

**Quick Fix:** Grant the service account the **Editor** role, which includes all necessary permissions.
