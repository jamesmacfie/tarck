# NZ Post Package Tracker

A simple Astro app that tracks NZ Post packages and sends browser notifications when the package status changes.

## Features

- Track NZ Post packages using their tracking API
- Automatic polling every minute to check for status changes
- Browser notifications when package status changes
- Clean, modern UI
- API key stored securely in browser's local storage

## Prerequisites

- Node.js 18+ and npm
- NZ Post API key ([Get one here](https://www.nzpost.co.nz/business/developer-centre/nz-post-legacy-apis/tracking-api/get-a-tracking-api-key))

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:4321` to see the app.

### Build

```bash
npm run build
```

The static site will be generated in the `dist/` directory.

## Deploying to Cloudflare Pages

### Option 1: Using Cloudflare Dashboard

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Go to **Pages** and click **Create a project**
4. Connect your Git repository
5. Configure build settings:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Click **Save and Deploy**

### Option 2: Using Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Build the project
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist
```

## Usage

1. Enter your NZ Post API key (required)
2. Enter a tracking ID (e.g., `00894000221028022521`)
3. Click **Start Tracking**
4. Allow browser notifications when prompted
5. The app will check for updates every minute
6. You'll receive a notification when the package status changes

## Technical Details

- **API Endpoint**: `http://api.nzpost.co.nz/tracking/track`
- **Polling Interval**: 60 seconds (1 minute)
- **Change Detection**: Compares full JSON response to detect any changes
- **Notification**: Browser Notification API

## Notes

- The API key is stored in your browser's local storage
- Tracking runs in the active browser tab only
- Close the tab or click "Stop Tracking" to stop polling
- You need to obtain your own NZ Post API key to use this app

## CORS Solution

The NZ Post API has CORS restrictions when called directly from a browser. This app uses Cloudflare Pages Functions to proxy API requests, which solves CORS issues automatically when deployed to Cloudflare Pages.

The proxy function is located at `/functions/api/track.ts` and is automatically deployed with your Pages site.

## License

MIT
