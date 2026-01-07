# Vercel KV Setup for Persistent Storage

## Why Vercel KV?

Vercel serverless functions have an ephemeral file system. Data stored in `/tmp` or in-memory is lost when the function execution ends. **Vercel KV** (Redis-based) provides persistent storage that works across all serverless function invocations.

## Setup Instructions

### 1. Create Vercel KV Database

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Select your project: **sandro-sandri**
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **KV** (Redis)
6. Choose a name (e.g., `sandro-sandri-kv`)
7. Select a region (choose closest to your users)
8. Click **Create**

### 2. Get Connection Details

After creating the KV database:

1. Go to the **Storage** tab in your project
2. Click on your KV database
3. Go to the **.env.local** tab
4. Copy the environment variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN` (optional, for read-only operations)

### 3. Add Environment Variables to Vercel

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add the following variables:
   - `KV_REST_API_URL` = (from step 2)
   - `KV_REST_API_TOKEN` = (from step 2)
3. Make sure to add them for **Production**, **Preview**, and **Development** environments
4. Click **Save**

### 4. Redeploy

After adding the environment variables:

1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

Or simply push a new commit to trigger a new deployment.

## How It Works

Once configured:
- All user data (cart, profile, Atlas) will be stored in Vercel KV
- Data persists across all serverless function invocations
- Data syncs across all devices logged into the same account
- No data loss when functions restart

## Free Tier Limits

Vercel KV free tier includes:
- 256 MB storage
- 30,000 requests/day
- Perfect for small to medium e-commerce sites

## Troubleshooting

If sync still doesn't work:
1. Check that environment variables are set correctly
2. Check Vercel function logs for errors
3. Verify KV database is created and connected
4. Check browser console for sync errors

## Alternative: Without KV (Temporary)

If you don't set up KV, the system will use in-memory storage as a fallback. This means:
- ⚠️ Data will NOT persist across function invocations
- ⚠️ Sync will only work within the same execution context
- ⚠️ Data may be lost when functions restart

**For production, you MUST set up Vercel KV or another persistent database.**

