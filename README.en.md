# Nikke CDK Tool

A modern web tool for managing CDK (redeem codes) for the game "GODDESS OF VICTORY: NIKKE", supporting multiple game servers including Global, CN, and TW regions.

![License](https://img.shields.io/badge/License-MIT-blue)

**[简体中文](README.md) | English**

## ✨ Features

### 🎯 Core Functions

- **CDK Announcement Display** - Smart display of individual CDKs and CDK groups with event images and reward information
- **Multi-Server Redemption** - Full support for Global, CN, and TW server regions
- **Official Proxy Login** - Secure and convenient one-click login (see [Security Notes](#-security-notes))
- **User Management** - Support for multiple accounts with automatic character info retrieval and server type detection
- **Redemption History** - Complete redemption record tracking with local and cloud synchronization
- **Smart Filtering** - Intelligently filter unredeemed CDKs based on account redemption records

### 🔧 Advanced Features

- **Batch Operations** - Support for batch selection and redemption of CDK groups
- **Theme System** - Three-state theme switching (Light/Dark/Auto) with system preference detection
- **Responsive Design** - Perfect adaptation for desktop and mobile with optimized touch experience
- **Masonry Layout** - Pseudo-masonry layout for optimized CDK card display
- **Animation Effects** - Rich transition animations and interactive feedback

### 🎨 Special Features

- **Doro Easter Egg** - Hidden Doro animation easter eggs and special effects
- **Image Optimization** - Automatic WebP format conversion and thumbnail generation

## 🏗️ Tech Stack

### Frontend Framework

- **Vue 3** - Progressive JavaScript framework (Composition API)
- **Vite** - Next generation frontend tooling
- **Element Plus** - Enterprise-class UI component library
- **Pinia** - Next generation state management library
- **Vue Router** - Official router for Vue.js
- **SCSS** - CSS preprocessor

### Backend Services

- **Cloudflare Workers** - Edge computing API proxy with triple-encrypted Cookie transmission
- **Cloudflare KV** - Temporary token storage (auto-expires in 5 minutes)
- **GitHub Pages** - Static website hosting
- **GitHub Actions** - CI/CD automation

### Development Tools

- **TypeScript** - Typed JavaScript at scale
- **ESLint** - Code quality checking
- **Sharp** - High-performance image processing

## 📁 Project Structure

```text
Nikke-CDK-Tool/
├── 📁 src/                          # Frontend source code
│   ├── 📁 components/               # Vue components
│   │   ├── CDKGroupCard.vue         # CDK group card
│   │   ├── AdCard.vue               # Advertisement card
│   │   ├── DoroSummonAnimation.vue  # Doro summon animation
│   │   ├── FloatingDoro.vue         # Floating Doro component
│   │   ├── CookieWarningAlert.vue   # Cookie warning alert
│   │   ├── TextDestructionEffect.vue # Text destruction effect
│   │   ├── MasonryLayout.vue        # Masonry layout
│   │   └── UserDialog.vue           # User management dialog
│   │
│   ├── 📁 views/                    # Page components
│   │   ├── About.vue                # About page
│   │   ├── CdkAnnouncement.vue      # CDK announcement page
│   │   ├── CdkExchange.vue          # CDK redemption page
│   │   ├── ExchangeHistory.vue      # Redemption history page
│   │   ├── UserManagement.vue       # User management page
│   │   ├── CallbackAuth.vue         # Proxy login callback page
│   │   └── RainbowDoro.vue          # Rainbow Doro easter egg page
│   │
│   ├── 📁 stores/                   # State management
│   │   ├── exchange.js              # CDK redemption state
│   │   ├── nav.ts                   # Navigation state
│   │   ├── theme.js                 # Theme state
│   │   ├── user.js                  # User state
│   │   └── doro.js                  # Doro easter egg state
│   │
│   ├── 📁 utils/                    # Utility functions
│   │   ├── api.js                   # API interface wrapper
│   │   ├── customMessage.ts         # Custom message component
│   │   ├── fetchCdk.ts              # CDK data fetching
│   │   ├── serverUtils.js           # Server utility functions
│   │   ├── storage.js               # Local storage management
│   │   ├── dateUtils.js             # Date utility functions
│   │   ├── cookieDecrypt.js         # Cookie triple encryption/decryption
│   │   └── logger.js                # Logger utility
│   │
│   ├── 📁 assets/                   # Static assets
│   │   ├── doro_icon.png            # Doro icon
│   │   └── theme.scss               # Theme styles
│   │
│   ├── 📁 router/                   # Router configuration
│   │   └── index.js                 # Route definitions
│   │
│   ├── App.vue                      # Root component
│   └── main.js                      # Application entry
│
├── 📁 public/                       # Public assets directory
│   ├── cdk-list.source.json         # [IMPORTANT] CDK data source
│   ├── cdk-list.json                # (Auto-generated) Built CDK list
│   ├── doro_icon.webp               # Doro icon WebP version
│   └── announcement-images/         # CDK announcement images
│       ├── *.webp                   # Announcement images
│       └── thumbs/                  # Thumbnail directory
│           ├── *_thumb.webp         # 320x180 thumbnails
│           └── *_thumb@2x.webp      # 640x360 HD thumbnails
│
├── 📁 tools/                        # Development tools (not deployed)
│   └── cdk-manager.html             # CDK data management tool
│
├── 📁 cloudflare-worker/            # Worker code (not deployed)
│   ├── Nikke-CDK-Combined.js        # Production unified Worker
│   ├── Nikke-CDK-Combined_Dev.js    # Development debug Worker
│   └── README.md                    # Worker documentation
│
├── 📁 scripts/                      # Build scripts (not deployed)
│   └── prebuild.mjs                 # Pre-build processing script
│
├── 📁 .github/                      # GitHub configuration (not deployed)
│   └── workflows/
│       └── deploy.yml               # Auto-deployment configuration
│
├── ENV_CONFIG.md                    # Environment variable configuration
├── CLAUDE.md                        # AI development guide
├── index.html                       # HTML template
├── package.json                     # Project configuration
├── vite.config.js                   # Vite configuration
├── tsconfig.json                    # TypeScript configuration
├── LICENSE                          # MIT License
└── README.md                        # Project documentation
```

## 🚀 Quick Start

### Requirements

- **Node.js 18+**
- **npm** or **yarn**

### Installation & Running

```bash
# Clone the project
git clone https://github.com/Small-tailqwq/Nikke-CDK-Tool.git
cd Nikke-CDK-Tool

# Install dependencies
npm install
```

### Development Environment Configuration

Create `.env.local` file (optional):

```env
# API server address (defaults to production)
VITE_API_BASE_URL=https://nikke-cdk.hayasa.org
```

### Common Commands

```bash
# Start development server
npm run dev

# Build for production (automatically runs prebuild)
npm run build

# Preview build result
npm run preview

# Process CDK data and optimize images
npm run prebuild
```

## 🛠️ CDK Management Tool

A visual CDK data management tool located at `tools/cdk-manager.html`:

**Features:**

- 📂 Direct file read/write support (Chrome/Edge 86+)
- ➕ Quick add normal CDK and CDK groups
- ✏️ Visual form editing
- 🗑️ Safe deletion with confirmation
- 💾 Real-time save to file

**Usage:**

1. Open `tools/cdk-manager.html` in browser
2. Load `public/cdk-list.source.json`
3. Edit and save with one click

## 📝 Contributing CDK Data

### Important Note

**Please modify the `public/cdk-list.source.json` file to contribute new CDKs**  
`public/cdk-list.json` is auto-generated during build, do not edit directly.

### Data Format

**Individual CDK:**

```json
{
  "code": "NIKKE2025NEW",
  "name": "2025 New Year Package",
  "reward": "Advanced Recruitment Voucher×5, Gems×300",
  "servers": ["global", "tw"],
  "status": "Available",
  "note": "New Year Event CDK",
  "author": "Contributor Name",
  "created": "2025-01-01"
}
```

**CDK Group:**

```json
{
  "type": "group",
  "groupId": "NIKKE_ANNIVERSARY_2025",
  "groupName": "2025 Anniversary Celebration",
  "note": "Anniversary celebration CDK collection",
  "author": "Contributor Name",
  "created": "2025-01-01",
  "cdks": [
    {
      "code": "NIKKE2025A",
      "name": "Anniversary Package A",
      "reward": "Advanced Recruitment Voucher×3",
      "servers": ["global"],
      "status": "Available",
      "note": "First anniversary wave"
    }
  ]
}
```

### Field Description

| Field     | Type   | Required | Description                              |
| --------- | ------ | -------- | ---------------------------------------- |
| `code`    | String | ✅       | CDK redemption code                      |
| `name`    | String | ✅       | CDK display name                         |
| `reward`  | String | ✅       | Reward description                       |
| `servers` | Array  | ✅       | Applicable servers: `global`, `cn`, `tw` |
| `status`  | String | ✅       | Status: `Available`, `Expired`           |
| `note`    | String | ❌       | Additional notes                         |
| `author`  | String | ❌       | Contributor name                         |
| `created` | String | ✅       | Creation date (YYYY-MM-DD)               |

### Submission Methods

1. **Recommended** - Submit via [Official Website](https://chalk-quotation-b2d.notion.site/Nikke-CDK-Tools-20f563f728f180e6ad58e9205a7fa271)
2. **Pull Request** - Directly edit `cdk-list.source.json` and submit PR
3. **Issue Report** - Submit CDK information using issue template

## 🤝 Contributing

All forms of contributions are welcome:

- 🐛 Bug fixes
- ✨ New feature development
- 📝 CDK data updates
- 📚 Documentation improvements

## 🔧 Deployment

### GitHub Pages Auto-Deployment

- Push to `masrer` branch triggers automatic deployment
- Build artifacts published to `gh-pages` branch
- CDK data updates trigger automatic rebuild
- Supports SPA routing with 404 fallback

### Cloudflare Workers

The project uses Cloudflare Workers to provide:

- CDK redemption API proxy
- BlaBlaLink proxy login
- BlaBlaLink Cookie forwarding
- Server captcha handling

Worker configuration details in `cloudflare-worker/README.md`

### CDN Acceleration

- Uses CDN for content acceleration
- Automatic static resource compression (gzip + brotli)
- WebP image format optimization

## 🔐 Security Notes

### Official Proxy Login Feature

> [!WARNING]  
> If you plan to use the "Official Proxy Login" feature, please read carefully to understand what you're doing.
> Avoid using this feature on public devices.

When using "Official Proxy Login":

**🔄 Workflow:**

1. **Access Proxy Page** - Visit Cloudflare Worker proxied official login mirror
2. **Complete Login** - Complete official login process on mirror page
3. **Cookie Capture** - Worker detects successful login and extracts game authentication cookies
4. **Temporary Storage** - Cookie data stored in Cloudflare KV, generates one-time token (5-minute expiry)
5. **Redirect Callback** - Auto-redirect to tool page with token parameter
6. **Encrypted Delivery** - Worker encrypts Cookie using triple encryption (SID + Token + Random Salt)
7. **Local Decryption** - Frontend decrypts Cookie using token, saves to local browser
8. **Token Destruction** - Token immediately deleted from KV after use

**🔒 What's Stored:**

- ✅ **Temporary Storage** (Cloudflare KV, auto-expires in 5 minutes):
  - Game authentication cookies (`game_token`, `game_openid`, `game_uid`, etc.)
  - Session identifier (SID)
  - Basic user info (game ID, username, etc.)

- ❌ **Not Stored**:
  - Passwords or any login credentials
  - Email, phone number, or personal information
  - Browser fingerprints or tracking data
  - Cookies auto-cleared after 5 minutes

**🛡️ Security Measures:**

1. **Triple Encryption Transmission**
   - PBKDF2 key derivation (100,000 iterations)
   - Key composition: SID + one-time token + random salt
   - AES-GCM-256 bit encryption
   - Different random salt and IV for each encryption

2. **One-Time Token**
   - 256-bit random number (`crypto.getRandomValues`)
   - Only transmitted in URL, not in response body
   - Destroyed immediately after use
   - 5-minute auto-expiry

3. **Principle of Least Privilege**
   - Worker only forwards necessary authentication data
   - No logging or analytics
   - Open-source code, fully transparent

**⚠️ Security Limitations:**

- Proxy login requires trust in Cloudflare Worker service
- Cookies stored in plain text in browser localStorage
- Malicious browser extensions may read local cookies
- Please manually clear data after using on public computers

### Local Storage Security

- Cookies only stored in user's browser localStorage
- Not uploaded to any server (except when calling official APIs)
- Users can delete all data anytime in "User Management" page

### Privacy Protection

- No collection of user personal information
- No user behavior tracking
- Open-source code, fully transparent
- Follows principle of least privilege

## 🛠️ Development Tools

### Contribution Types

- 🐛 **Bug Fixes** - Submit issues or direct PR
- ✨ **New Features** - Discuss first, implement later
- 📝 **CDK Data** - Follow data format for submission
- 📚 **Documentation** - Improve documentation
- 🎨 **UI Optimization** - Improve user experience

### Code Standards

- Use ESLint for code checking
- Follow Vue 3 Composition API best practices
- Use PascalCase for component naming
- Use SCSS for styles with dark mode support

### Development Environment Setup

1. Fork the project to your repository
2. Clone the project locally
3. Create feature branch: `git checkout -b feature/new-feature-name`
4. Commit changes: `git commit -m "Describe changes"`
5. Push branch: `git push origin feature/new-feature-name`
6. Create Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## ⚠️ Disclaimer

This tool is for educational and communication purposes only. The developer is not responsible for any issues arising from the use of this tool. Please follow game-related regulations and use CDK resources reasonably.

## 🔗 Links

- [🌐 Live Demo](https://small-tailqwq.github.io/Nikke-CDK-Tool/) - GitHub Pages
- [📦 Repository](https://github.com/Small-tailqwq/Nikke-CDK-Tool) - GitHub
- [🐛 Issue Tracker](https://github.com/Small-tailqwq/Nikke-CDK-Tool/issues) - Issues
- [📝 CDK Submission](https://chalk-quotation-b2d.notion.site/210563f728f1801ea74ec231b2359e79) - Notion Form
- [📖 User Manual](https://chalk-quotation-b2d.notion.site/Nikke-CDK-Tools-20f563f728f180e6ad58e9205a7fa271) - Detailed tutorials and feedback

## 💖 Acknowledgments

Thanks to all friends who contributed code, CDK data, and suggestions!

- Community contributors for server parameter debugging support
- Community members for feature requirement suggestions
- **AI Development Assistants** - GPT-4o, Claude, Cursor, GitHub Copilot

---

**❤️ If this project helps you, please give it a Star ⭐**

---

This project's conception, construction, code generation, and continuous debugging were all completed through collaborative multi-model generative AI; humans only undertake requirement translation and final compliance review, without directly writing core implementations. Please view it as an "Eden Sample" constructed through machine self-iteration — any shortcomings are attributed to algorithmic evolution not yet reaching its limit.
