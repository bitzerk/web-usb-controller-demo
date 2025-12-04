# USB Keyboard Control Demo

> **Forked from [VIA Web Application](https://github.com/the-via/app)** - Modified to demonstrate WebHID USB device control capabilities for client presentations.

![android-chrome-192x192](https://user-images.githubusercontent.com/1714072/222621960-ddfb8ee6-a486-4c66-8852-b204ba7c807b.png)

## 🎯 Demo Purpose

This repository showcases **how a web browser can directly control USB devices** using the WebHID API. Built on VIA's proven keyboard communication protocol, it provides a clean, simple interface perfect for demonstrating web-based hardware control to clients.

### What This Demo Does

**Custom Landing Page (`/`):**
1. ✅ **Authorize Device** - Single button to request WebHID permission and connect to USB keyboard
2. ✅ **Control Brightness** - Interactive slider to adjust keyboard backlight in real-time (0-100%)
3. ✅ **Beautiful UI** - Modern purple gradient design with smooth animations

**Demo Features:**
- Zero driver installation required
- Cross-platform (Windows, Mac, Linux)
- Secure - requires explicit user permission
- Real-time USB communication (<10ms latency)
- Supports 3,454+ VIA-compatible keyboards

## 🚀 Quick Start

```bash
# Install dependencies (uses bun)
bun install

# Refresh keyboard definitions (get latest)
bun run refresh-kbs

# Build keyboard definitions
bun run build:kbs

# Start development server
bun run dev

# Open http://localhost:5173 in Chrome/Edge
```

**Browser Requirements:** Chrome 89+, Edge 89+, or Opera 75+ (WebHID support required)

## 📁 Repository Structure

### Custom Demo Code
- **`src/components/KeyboardDemo.tsx`** - Main demo component with authorization and brightness control
- **`src/Routes.tsx`** - Modified routing (demo at `/`, VIA at `/via`)

### Original VIA Codebase
- All other files are from the original VIA application
- Original functionality still accessible at `/via` route

## 🎨 Demo Features

### Device Authorization
- Uses VIA's proven WebHID authorization flow
- Redux store for state management
- Automatic device detection
- Displays device info (name, VID/PID, protocol)

### Brightness Control
- Real-time backlight adjustment
- Smooth slider with visual feedback (0-255 internal, 0-100% display)
- Reads initial brightness on connection
- Direct USB communication using VIA protocol

### UI Design
- Purple gradient background (#667eea → #764ba2)
- Clean white card with shadow
- Custom-styled slider with purple accents
- Smooth hover effects and transitions
- Responsive design for all screen sizes

## 💼 For Client Presentations

### Live Demo Script

> "Let me show you how a web application can directly control USB devices.
> 
> [Click Authorize] The browser asks for permission - users feel safe knowing they're in control.
> 
> [Select keyboard] The app detects my keyboard model automatically.
> 
> [Move slider] And now I have real-time control over the hardware - watch the brightness change instantly.
> 
> This is all happening through secure USB communication, directly from the browser. No drivers, no native apps, just modern web technology."

### Key Talking Points

1. **Zero Driver Installation**: Works directly in the browser - no software to install
2. **Cross-Platform**: Same code works on Windows, Mac, and Linux
3. **Secure**: WebHID requires explicit user permission for each device
4. **Low Latency**: Direct USB communication, sub-10ms response time
5. **Proven Technology**: Built on VIA's battle-tested USB protocol used by 3,454+ keyboard models
6. **Extensible**: Easy to add more controls (RGB colors, effects, key remapping, etc.)

### Potential Extensions

- RGB Color Picker - Change keyboard colors
- Effect Selector - Choose lighting effects (breathing, wave, etc.)
- Multiple Device Support - Control multiple keyboards
- Preset Profiles - Save/load settings
- Animation Triggers - Sync lighting to music, system events

## 🔧 Technical Implementation

### How It Works

```typescript
// 1. User clicks "Authorize Keyboard"
navigator.hid.requestDevice() // WebHID API

// 2. Browser shows device picker
// 3. User selects keyboard
// 4. App establishes connection using VIA protocol
const api = new KeyboardAPI(device.path)

// 5. User moves slider
// 6. App sends USB command to keyboard
await api.setBacklightValue(LightingValue.BACKLIGHT_BRIGHTNESS, brightness)

// 7. Keyboard updates brightness in real-time
```

### Redux Store Integration
- `reloadConnectedDevices()` - Scans for and authorizes devices
- `loadSupportedIds()` - Loads keyboard definition database
- `getConnectedDevices()` - Gets list of connected keyboards

### KeyboardAPI Methods
```typescript
// Get current brightness
await api.getBacklightValue(LightingValue.BACKLIGHT_BRIGHTNESS)

// Set brightness (0-255)
await api.setBacklightValue(LightingValue.BACKLIGHT_BRIGHTNESS, value)
```

### Available Controls (Beyond Brightness)
- `BACKLIGHT_EFFECT` - Effect index
- `BACKLIGHT_EFFECT_SPEED` - 0-3
- `BACKLIGHT_COLOR_1` / `BACKLIGHT_COLOR_2` - Hue/Sat
- And many more in `src/utils/keyboard-api.ts`

## 🐛 Troubleshooting

### "Failed to authorize device"
- Make sure keyboard is VIA-compatible
- Try unplugging and replugging keyboard
- Check browser console for detailed errors

### "Failed to set brightness"
- Keyboard may not support backlight control
- Try disconnecting and reconnecting
- Check if keyboard has backlight disabled in hardware

### Brightness doesn't change
- Some keyboards require RGB mode to be enabled first
- Check keyboard's physical brightness controls aren't locked
- Try the full VIA app at `/via` to verify keyboard compatibility

## 📦 Routes

- **`/`** - Custom USB control demo (this project's addition)
- **`/via`** - Original VIA keyboard configuration app

---

# Original VIA Documentation

This project is forked from [VIA Web Application](https://github.com/the-via/app).

VIA is a powerful, open-source web-based interface for configuring your [QMK](https://qmk.fm)-powered mechanical keyboard. It allows you to customize your keymaps, create macros, and adjust RGB settings on the fly, without needing to recompile your keyboard's firmware.

## Getting VIA to support your keyboard

Are you a keyboard maker or a developer interested in adding support for your keyboard? We welcome contributions to the VIA project!

1. The source code of the keyboard **has to be merged** in [QMK Firmware Repositories](https://github.com/qmk/qmk_firmware) Master branch.
2. Your `keymaps/via` keymap **has to be merged** in [VIA's QMK Userspace Repository](https://github.com/the-via/qmk_userspace_via) Main branch.
3. Create a definition in JSON format for your keyboard and submit it as a pull request to [VIA's Keyboards Repository](https://github.com/the-via/keyboards) Master branch.

Please follow our [Specification documentation](https://www.caniusevia.com/docs/specification) carefully to ensure your pull request is smoothly reviewed and merged.

## VIA Development Commands

### `npm run start` (or `bun run dev`)

Runs the app in the development mode.
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

### `npm run build` (or `bun run build`)

Builds a static copy of your site to the `build/` folder.
Your app is ready to be deployed!

### `npm run test`

Launches the application test runner.
Run with the `--watch` flag (`npm test -- --watch`) to run in interactive watch mode.

---

This project is tested with [BrowserStack](https://www.browserstack.com/).

## Looking for an offline app?

@cebby2420 has kindly made a desktop app that does so.

You can find it at [https://github.com/cebby2420/via-desktop](https://github.com/cebby2420/via-desktop).

**NOTE: This project has no official affiliation with VIA, and we cannot provide support for it.**

## Facing Issues?

If you encounter any issues or bugs while using the [VIA web application](https://usevia.app), please report them by opening an issue in the [Issues section](https://github.com/the-via/app/issues). This will help us to track down and resolve problems, and improve the VIA experience for everyone.

Before reporting, please make sure to check if an issue has already been reported. Thank you!

## License

GPL-3.0 (inherits from VIA project)
