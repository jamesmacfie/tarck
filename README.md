# NZ Post Package Tracker

A simple Astro app that tracks NZ Post packages by scraping their public tracking page and sends browser notifications when the package status changes.

## Features

- Track NZ Post packages without requiring an API key
- Automatic polling every minute to check for status changes
- Browser notifications when package status changes
- Clean, modern UI
- Tracking ID stored in browser's local storage
- Server-side HTML scraping via Cloudflare Pages Functions to avoid CORS issues

## Prerequisites

- Node.js 18+ and npm
- No API key required!

## Getting Started

### Installation

```bash
npm install
```

### Development

For local development with Cloudflare Pages Functions support:

```bash
npm run dev:wrangler
```

This will:
1. Build the Astro site
2. Start a local Cloudflare Pages development server with Functions support
3. Visit the URL shown in the terminal (typically `http://localhost:8788`)

**Note:** The regular `npm run dev` command will start Astro's dev server, but the `/api/track` endpoint won't work since it requires Cloudflare Pages Functions runtime. Use `dev:wrangler` for full functionality.

Alternative - Basic Astro dev server (without scraping functionality):
```bash
npm run dev
```
Visit `http://localhost:4321` (tracking endpoint won't work)

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

1. Enter a tracking ID (e.g., `00894000221028022521`)
2. Click **Start Tracking**
3. Allow browser notifications when prompted
4. The app will check for updates every minute
5. You'll receive a notification when the package status changes

## Technical Details

- **Scraping Target**: `https://www.nzpost.co.nz/tools/tracking`
- **Scraping Method**: Cloudflare Pages Function (`/functions/api/track.ts`)
- **Polling Interval**: 60 seconds (1 minute)
- **Change Detection**: Compares full JSON response to detect any changes
- **Notification**: Browser Notification API

## Notes

- The tracking ID is stored in your browser's local storage
- Tracking runs in the active browser tab only
- Close the tab or click "Stop Tracking" to stop polling
- No API key required - the app scrapes the public tracking page

## How It Works

Since the NZ Post tracking page has CORS restrictions when accessed directly from a browser, this app uses a Cloudflare Pages Function to:

1. Fetch the HTML from the NZ Post tracking page server-side
2. Parse the HTML to extract tracking information
3. Return structured JSON data to the frontend

The scraping function is located at `/functions/api/track.ts` and is automatically deployed with your Cloudflare Pages site.

### HTML Scraping

The function uses regex patterns to extract:
- Package status (e.g., "Delivered", "In Transit")
- Detailed descriptions
- Event history with dates and times
- Location information

This approach doesn't require an API key and works with any valid NZ Post tracking number.

## License

MIT
