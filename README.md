# Perudo Mobile Game Helper 🎲🦙

An elegant, native-wrapping mobile application built for **Android** and **iOS** that acts as a digital dice cup helper for physical Perudo (Liar's Dice) sessions. 

The application replicates a player's dice cup, allowing them to roll, hide, and manage their dice count in real-time, preventing opponents from peeking. The user interface is built to look **identical** to the physical reference design screenshots, featuring a retro flat style with thick black borders, glossy white cards, and custom llama wildcard icons.

---

## 🚀 Key Features
- **3D Glossy Cards**: Dice cards featuring realistic 3D highlights and drop shadows, which dynamically render red dot configurations.
- **Llama Wildcard**: The wildcard face (number **1** or **Paco**) renders as a custom-traced red llama outline.
- **Responsive Layout**: Adjusts seamlessly between portrait and landscape orientations.
- **Interactive Shaker**:
  - `ROLL DICE`: Generates new random combinations (1-6) for all active dice.
  - `HIDE DICE`: Covers the screen with a giant `SHOW DICE` block to keep dice values private.
  - `LOSE A DIE`: Permanently reduces the player's active dice count. Lost dice slots are blacked out. When all dice are lost, the app automatically resets back to the Home Screen.
- **Hardware Back Button Integration**: Android hardware back button handler exits the app from the home screen, returns to home from the board, and reveals hidden dice if covered.

---

## 🛠️ Tech Stack
- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- **Native Runtime**: [Capacitor 6](https://capacitorjs.com/) (translates the web build to iOS/Android native structures)
- **Asset Processing**: `@capacitor/assets` (compiles splash screen sizes and application launcher icons)
- **Style System**: Vanilla CSS (Flexbox & Grid layout) for maximum layout and pixel-perfect design alignment.

---

## 📂 Project Structure

```text
├── assets/                    # Base assets for logo/icons
│   └── icon.png               # Source icon (1024x1024) used for app generator
├── android/                   # Native Android Studio project structure (Capacitor)
├── ios/                       # Native Xcode project structure (Capacitor)
├── imgs/                      # Target UI design images (reference screenshots)
├── public/                    # Static assets
└── src/                       # Frontend source code
    ├── assets/
    │   └── llama.png          # Extracted transparent red llama outline (wildcard)
    ├── App.css                # CSS styles (dice cards, dot placements, gradients, borders)
    ├── App.tsx                # App views, game state logic, and button handlers
    ├── index.css              # Global styles and viewport safe-area resets
    └── main.tsx               # Entry point
```

---

## 💻 Local Development

### 1. Prerequisites
- **Node.js** (v20+ recommended)
- **npm** (v10+ recommended)

### 2. Setup Dependencies
```bash
npm install
```

### 3. Start Development Server (Web preview)
```bash
npm run dev
```

---

## 📦 Building and Syncing Platforms

To compile the application, you must first compile the web build and then sync it to the native project folders:

### 1. Compile Web Production Build
```bash
npm run build
```

### 2. Sync to Android and iOS Projects
```bash
npx cap sync
```

---

## 🎨 Asset Generation (App Icon & Splash Screens)

If you modify the source asset (`assets/icon.png`), you can regenerate all launcher dimensions and splash images across platforms using the command:

```bash
npx @capacitor/assets generate --iconBackgroundColor '#ffffff' --splashBackgroundColor '#000000'
```

---

## 🤖 Compiling Android Builds (.apk)

The Android environment can be compiled directly via the Gradle wrapper command:

```bash
# 1. Setup SDK environments
export ANDROID_HOME=/path/to/android-sdk

# 2. Configure full JDK path (Required compilation toolchain, e.g. OpenJDK 25 JDK)
export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64

# 3. Compile Android packages
cd android

# To compile a debug APK:
./gradlew assembleDebug
# Resulting file: android/app/build/outputs/apk/debug/app-debug.apk

# To compile an unsigned release APK (ready for signing and distribution):
./gradlew assembleRelease
# Resulting file: android/app/build/outputs/apk/release/app-release-unsigned.apk
```
