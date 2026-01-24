# IFC Email Preference Center

A unified email preference center for Impact Finance Center, integrated with **HubSpot** and **ReachInbox**.

## 🎯 Features

- **Subscribe** - Re-subscribe to email communications
- **Unsubscribe from Campaign** - Stop receiving emails from a specific campaign
- **Unsubscribe from All** - Opt out of all marketing communications
- **Privacy Policy** - In-page privacy information

## 🔗 URL Parameters

The preference center reads from URL parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `email` | Contact's email address | `user@example.com` |
| `campaign` | Campaign name (display) | `Newsletter%20Q1` |
| `campaignId` | ReachInbox campaign ID | `8417` |
| `source` | Email source for tracking | `hubspot`, `reachinbox` |

**Example URL:**

```
https://your-site.netlify.app/?email=user@example.com&campaign=January%20Newsletter&campaignId=8417&source=hubspot
```

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS
- **Backend**: Netlify Functions (serverless)
- **Integrations**: HubSpot API, ReachInbox API

## 📦 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.netlify/functions/subscribe` | POST | Re-subscribe contact to HubSpot |
| `/.netlify/functions/unsubscribe-campaign` | POST | Unsubscribe from specific campaign |
| `/.netlify/functions/unsubscribe-all` | POST | Unsubscribe from all + blocklist |

## ⚙️ Setup

### 1. Clone and Configure

```bash
# Clone the repo
git clone <repo-url>
cd IFC

# Create environment file
cp .env.example .env
```

### 2. Get API Keys

#### HubSpot

1. Go to HubSpot > Settings > Integrations > Private Apps
2. Create a new private app
3. Add scopes: `communication_preferences.read`, `communication_preferences.write`
4. Copy the access token

#### ReachInbox

1. Go to ReachInbox Dashboard > Settings > Integrations > API
2. Copy your API key

### 3. Add Environment Variables to Netlify

In your Netlify dashboard:

1. Go to Site Settings > Environment Variables
2. Add:
   - `HUBSPOT_API_KEY` - Your HubSpot private app access token
   - `REACHINBOX_API_KEY` - Your ReachInbox API key
   - `HUBSPOT_SUBSCRIPTION_ID` - (Optional) Specific subscription type ID

### 4. Deploy

```bash
# Install Netlify CLI (if needed)
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

## 📧 Email Template Links

Add these links to your email footers:

### HubSpot Emails

```html
<a href="https://your-site.netlify.app/?email={{contact.email}}&campaign=Newsletter&source=hubspot">
  Manage Preferences
</a>
```

### ReachInbox Emails

```html
<a href="https://your-site.netlify.app/?email={{email}}&campaign={{campaign_name}}&campaignId={{campaign_id}}&source=reachinbox">
  Manage Preferences
</a>
```

## 🔒 Security

- API keys are stored as environment variables (never in git)
- CORS headers configured
- Content Security Policy enabled
- No client-side API key exposure

## 📁 Project Structure

```
IFC/
├── index.html              # Main HTML page
├── styles.css              # All styling
├── script.js               # Frontend logic
├── netlify.toml            # Netlify configuration
├── .env.example            # Environment template
└── netlify/
    └── functions/
        ├── subscribe.js            # Subscribe function
        ├── unsubscribe-campaign.js # Campaign unsubscribe
        └── unsubscribe-all.js      # Full unsubscribe
```

## 📜 License

© 2026 Impact Finance Center. All rights reserved.
