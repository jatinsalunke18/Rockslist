# Deployment Guide

## Deploying to Vercel

This project is configured for easy deployment on [Vercel](https://vercel.com).

### Prerequisites

1.  A [Vercel Account](https://vercel.com/signup).
2.  Your project pushed to GitHub.

### Steps

1.  **Login to Vercel** and go to your dashboard.
2.  Click **"Add New..."** -> **"Project"**.
3.  **Import** your GitHub repository (`Rockslist`).
4.  **Configure Project**:
    *   **Framework Preset**: Vite (should be detected automatically).
    *   **Root Directory**: `./` (default).
    *   **Build Command**: `npm run build` (or `vite build`).
    *   **Output Directory**: `dist` (default).
5.  **Environment Variables** (CRITICAL):
    You must add the environment variables from your local `.env` file to Vercel.
    
    *   `VITE_FIREBASE_API_KEY`
    *   `VITE_FIREBASE_AUTH_DOMAIN`
    *   `VITE_FIREBASE_PROJECT_ID`
    *   `VITE_FIREBASE_STORAGE_BUCKET`
    *   `VITE_FIREBASE_MESSAGING_SENDER_ID`
    *   `VITE_FIREBASE_APP_ID`
    *   `VITE_CLOUDINARY_CLOUD_NAME`
    *   `VITE_CLOUDINARY_UPLOAD_PRESET`
    *   `VITE_EMAILJS_SERVICE_ID`
    *   `VITE_EMAILJS_TEMPLATE_ID`
    *   `VITE_EMAILJS_PUBLIC_KEY`

6.  Click **"Deploy"**.

### Troubleshooting

-   **404 on Refresh**: If you see 404 errors when refreshing pages, ensure `vercel.json` exists in your root directory with the specialized rewrite rules. (This has already been created for you).
