# Quick Setup Guide - Redis/KV Storage

## Step 1: Create Redis Database

1. On the Vercel Storage page, scroll down to **"Marketplace Database Providers"**
2. Click **"Create"** on either:
   - **Upstash** (recommended - "Serverless DB (Redis, Vector, Queue, Search)")
   - OR **Redis** ("Serverless Redis")

## Step 2: Configure the Database

1. Choose a name (e.g., `sandro-sandri-kv`)
2. Select a region (choose closest to your users)
3. Click **Create** or **Continue**

## Step 3: Get Connection Details

After creating, Vercel will automatically:
- Create environment variables
- Connect them to your project

You should see something like:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

These are automatically added to your project!

## Step 4: Verify Environment Variables

1. Go to your Vercel project **Settings** → **Environment Variables**
2. You should see the KV/Redis connection variables
3. Make sure they're enabled for **Production**, **Preview**, and **Development**

## Step 5: Redeploy

1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

OR simply push a new commit to trigger automatic deployment.

## Step 6: Test Sync

1. Open your website on two different devices
2. Log in with the same account on both
3. Add something to cart on device 1
4. Wait a few seconds or refresh device 2
5. The cart should sync! 🎉

## Troubleshooting

If sync doesn't work:
- Check Vercel function logs for errors
- Verify environment variables are set
- Make sure you redeployed after adding the database
- Check browser console for sync errors

