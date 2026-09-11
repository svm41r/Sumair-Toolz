# 🚀 SUMAIR TOOLS v6.5 — OFFICIAL DISCORD MASTER TUTORIAL

> **The Ultimate All-In-One AI Automation Suite for Adobe After Effects**  
> Engineered by **Sumair Ali Siddiqui**  
> 🌐 **Official Website:** [https://sumairtools.online/](https://sumairtools.online/)  
> 📦 **Latest Release:** Version 6.5 (Zero-Config Groq Cloud AI Engine)

---

## 📌 TABLE OF CONTENTS
1. [⚡ What is Sumair Tools v6.5?](#-what-is-sumair-tools-v65)
2. [📥 2-Minute Installation Guide](#-2-minute-installation-guide)
3. [🔑 Workstation Activation & Licensing](#-workstation-activation--licensing)
4. [🤖 Module 1: AI Agent Assistant (Groq Cloud AI)](#-module-1-ai-agent-assistant-groq-cloud-ai)
5. [📝 Module 2: Caption Pro (Quick Transcribe & Hormozi Subtitles)](#-module-2-caption-pro-quick-transcribe--hormozi-subtitles)
6. [✂️ Module 3: Auto Cut (Silence Removal & Beat-Sync)](#-module-3-auto-cut-silence-removal--beat-sync)
7. [📸 Module 4: SS to Anim (Screenshot to Animation)](#-module-4-ss-to-anim-screenshot-to-animation)
8. [🎬 Module 5: PF Presets & Comp Saver](#-module-5-pf-presets--comp-saver)
9. [🎯 Module 6: Master Tools (9-Point Anchor & FPS Converter)](#-module-6-master-tools-9-point-anchor--fps-converter)
10. [🛠️ Troubleshooting & FAQ](#-troubleshooting--faq)
11. [💬 Support & Community Links](#-support--community-links)

---

## ⚡ WHAT IS SUMAIR TOOLS v6.5?

**Sumair Tools v6.5** is the powerhouse cyber-extension designed to eliminate 90% of repetitive editing work inside Adobe After Effects:

- 🧠 **Native Groq Cloud AI (Zero Setup):** Natural-language prompt-to-JSX engine. Controls AE directly in plain English with ultra-fast latency.
- 🎙️ **Caption Pro 6.5 (Whisper AI):** Auto-transcribe video/audio cuts directly from your timeline into perfectly timed 2-word or 4-word viral Hormozi subtitles.
- 📸 **SS to Anim Pro:** Drag & drop any UI screenshot (Figma, Twitter, Web) and watch AE automatically rebuild it into staggered, animated layers with clean background inpainting!
- 🎬 **Preset Cinema & Comp Saver:** 40+ physics shakes, optical zooms, and 1-click comp dependency bundling.
- ✂️ **Timeline Auto Cut:** Automatically slice out pauses and dead silence with anti-click crossfades or mark high-energy musical beats.
- 🎯 **Master Tools Matrix:** 9-point zero-drift anchor point alignment, 60 FPS converter, batch sequencer, and nuclear cleaner.

---

## 📥 2-MINUTE INSTALLATION GUIDE

### Option A: 1-Click Automated Installer (Recommended for Windows)
1. Download `SumairTools_v6.5.zip` from [https://sumairtools.online/](https://sumairtools.online/) and extract the folder.
2. Right-click **`Fix_AfterEffects_Extension.bat`** and choose **"Run as Administrator"**.
3. The script will automatically:
   - Close any background AE processes.
   - Enable `PlayerDebugMode` across all CSXS registry keys.
   - Cleanly install the extension to both your user and system CEP folders.
4. Launch Adobe After Effects and open **Window > Extensions > Sumair Tools**.

---

### Option B: ZXP Installer (Universal)
1. Download **`SumairTools_v6.5.zxp`** from [https://sumairtools.online/](https://sumairtools.online/).
2. Download and open [ZXP Installer](https://zxpinstaller.com/) or the aescripts ZXP Manager.
3. Drag & drop `SumairTools_v6.5.zxp` into the window.
4. Once installation is confirmed, launch After Effects and go to **Window > Extensions > Sumair Tools**.

---

### Option C: Manual Zip Installation
1. Extract `SumairTools_v6.5.zip`.
2. Press `Win + R`, paste:
   ```text
   %APPDATA%\Adobe\CEP\extensions
   ```
   and hit Enter.
3. Paste the extracted `Sumair Tools Extension` folder here and rename it to `SumairTools`.
4. Enable `PlayerDebugMode` in Windows Registry (`HKCU\Software\Adobe\CSXS.10` / `11` / `12` -> String `PlayerDebugMode` = `1`).
5. Open After Effects -> **Window > Extensions > Sumair Tools**.

> 💡 **PRO TIP:** If you ever update files or want to reload the panel without restarting After Effects, simply click the **`v6.5 🔄`** badge at the top-right of the extension header!

---

## 🔑 WORKSTATION ACTIVATION & LICENSING

When launching for the first time, the cyberpunk **License Guard** modal will appear:

1. Head over to [https://sumairtools.online/](https://sumairtools.online/) and sign in to obtain your license key.
2. Enter your key in the format:
   ```text
   ST-XXXX-XXXX-XXXX-XXXX
   ```
3. Click **⚡ ACTIVATE WORKSTATION**.
4. The extension cryptographically binds your machine hardware (HWID) to your account via Supabase. Once activated, your vault is saved locally and unlocks permanently on that machine.

---

## 🤖 MODULE 1: AI AGENT ASSISTANT (GROQ CLOUD AI)

The **AI Agent** tab connects After Effects directly to Groq's high-speed cloud LLMs with **zero API key configuration required** in v6.5!

### Available Models (Select via Dropdown):
- ⚡ **Groq Qwen 3.8 27B (Default & Recommended):** Blazing-fast inference, exceptional ExtendScript code generation, and zero syntax hallucinations.
- 🧠 **Groq GPT-OSS 120B:** High-level complex logic, multi-layer expression rigging, and advanced mathematical physics.
- 🚀 **Groq Compound AI:** Composite web & script generation.
- 💻 **Ollama Local (Offline):** 100% offline local inference (connects to `localhost:11434`).

### How to Use the AI Agent:
1. Open the **🤖 AI Agent** tab.
2. Type any request in plain English into the prompt bar.
3. *(Optional)* Click the **🖼️ Image** button to attach a visual reference or UI screenshot.
4. Hit **➤ Send**. The AI will generate ExtendScript, stream the code into the chat, and execute it live in your active comp!

### 🔥 Top Prompts to Try:
```text
• "Create a modern cinematic lower third with a crimson accent bar and slide-in animation"
• "Add a subtle floating wiggle expression to the position and rotation of the selected layer"
• "Create a 3D camera rig with an animated orbit around the selected layer"
• "Scan my active comp, remove all unused layers, and add a master control null"
• "Generate a 10-second neon glowing grid background with floating dust particles"
```

---

## 📝 MODULE 2: CAPTION PRO (WHISPER AI & HORMOZI SUBTITLES)

Caption Pro is the crown jewel of Sumair Tools, split into two dedicated workflows:

### ⚡ Sub-Tab 1: Quick Transcribe (Whisper AI Engine)
*Automate speech-to-text directly from your timeline cuts!*

1. **Step 1: Audio Extraction**
   - If you cut or trimmed your video on the timeline, click **🎙️ Comp to WAV**. This renders only your active timeline cuts into a pristine 16-bit WAV file so your subtitles match your cuts 100% with zero drift!
   - Alternatively, select an audio/video layer and click **🎯 Grab Layer**, or click **📁 Browse** to select a file from your hard drive.
2. **Step 2: Words Per Layer**
   - Choose **🔥 2x (Viral Reels / TikTok / Shorts)** or **⚡ 4x (Standard Short-Form)**.
3. **Step 3: Transcribe**
   - Click **⚡ Transcribe & Export SRT**. Whisper AI will transcribe the audio with millisecond-accurate timestamps and save `captions.srt` directly to your Downloads folder.
4. **Step 4: Build in After Effects**
   - Click **🎬 Build AE**. The extension creates individual typography layers synchronized to your timeline!

---

### 📝 Sub-Tab 2: Normal Captions (The Priority #1 Pipeline)
*The legendary 1-click automated subtitle styling pipeline.*

1. Click **⚡ AUTO PROCESS ALL CAPTIONS**:
   - Automatically executes: **1. SRT Import ➔ 2. Punctuation Clean ➔ 3. 2x/4x Line Break ➔ 4. Caption Split ➔ 5. Styling Presets**.
2. **🔗 Fix Merge Caption & Extend Rails:**
   - One click repairs any overlapping captions and stretches dual-rail adjustment layers to cover the entire comp.
3. **💥 Explode Caption Words:**
   - Explodes a single text block into individually animatable word layers horizontally (`↔️ x Hor`) or vertically (`↕️ x Ver`).
4. **⏶ Typography Shifter:**
   - Select layers and click **▲ Shift Word Up** or **▼ Shift Word Down** to move words between lines without retyping!
5. **✨ Text Animation Presets:**
   - Apply viral presets in 1-click: `✨ TextOpac`, `⬆️ TextUp`, `⬇️ TextDown`, `💫 Sweap`, `🎨 3 Words Red`, `🎨 4 Words Red`.
6. **🧹 Sanitize & Cleanup:**
   - `🔠 Capital` (Capitalize first letters), `🧹 Clean ! . , Punctuation`, and `🚫 Cuss Hide` (auto-censor profanity).

---

## ✂️ MODULE 3: AUTO CUT (SILENCE REMOVAL & BEAT-SYNC)

Save hours of manual trimming on podcasts, voiceovers, and talking-head videos!

### Mode 1: 🎙️ Silence Removal
1. Select your voiceover or talking-head layer in the timeline.
2. Adjust settings:
   - **Silence Threshold:** e.g., `-40 dB` (audio below this is treated as silence).
   - **Min Silence Duration:** e.g., `0.5 sec` (minimum pause duration to trigger a cut).
   - **Clip Padding:** e.g., `8 frames` (guard frames so words aren't abruptly cut off).
   - **Audio Crossfades:** Keep toggled **ON** with `2 frames` to eliminate pops and clicks.
3. Click **✂️ AUTO-CUT TIMELINE**. The extension slices the clip and removes dead pauses automatically!

### Mode 2: 🎵 Beat Markers
1. Select your music track layer.
2. Set **Peak Sensitivity (1-10)** and **Min Beat Gap (sec)**.
3. Click **✂️ MARK BEATS**. The extension places timeline markers on the highest dB peaks so you can snap transitions to the rhythm!

---

## 📸 MODULE 4: SS TO ANIM (SCREENSHOT TO ANIMATION)

Transform static UI screenshots into animated, staggered motion graphics!

1. Open the **📸 SS to Anim** tab.
2. Drag & drop any screenshot (PNG, JPG, WebP) from Figma, X (Twitter), Discord, or a website.
3. The computer vision engine scans the image and categorizes elements:
   - 🔴 **Text Blocks**
   - 🔵 **Vector Shapes & Buttons**
   - 🟢 **Icons & Badges**
   - 🟣 **Images & Avatars**
4. Configure your animation:
   - **Preset:** Slide Up (Fade + Lift), Slide Down, Pop Scale, Fade In, etc.
   - **Stagger:** e.g., `0.06s` between each element.
   - **Duration:** e.g., `20 frames`.
   - **Offset Distance:** e.g., `80px`.
   - **Clean Background Plate:** When checked, inpainting erases the foreground elements from the background plate automatically!
5. Click **🚀 Reconstruct in After Effects**. A new pre-comp is generated with all individual elements isolated and eased!

---

## 🎬 MODULE 5: PF PRESETS & COMP SAVER

### 🎯 Comp Saver (Comp Dependency Bundler)
Save your favorite compositions as reusable, modular presets for any future project!
1. Select the comp you want to save in the Project panel or timeline.
2. Open **🎬 PF Presets > COMP SAVER**.
3. Type a preset name (or leave blank to use the comp's current name).
4. Select or add a **Category** (e.g., *"Lower Thirds"*, *"Title Sequences"*, *"Social Hooks"*).
5. Toggle **SAVE PREVIEW AS GIF** (creates a live animated thumbnail).
6. Click **SAVE**. The comp and all its dependent assets are saved to your local library!
7. To reuse later: Click the preset card to instantly import it into any project!

### 🪄 FFX Preset Deck
1. Switch to the **FFX PRESETS** sub-tab.
2. Drag & drop any `.ffx` file directly into the drop zone.
3. Click any preset row or card to apply physics-based camera shakes, optical zooms, lens warps, or glitch transitions to your selected layer in 1 click!

---

## 🎯 MODULE 6: MASTER TOOLS (9-POINT ANCHOR & FPS CONVERTER)

Everyday editing essentials located on the main tab:

### 🎯 9-Point Zero-Drift Anchor Point Alignment
- Click any node on the 3x3 grid (`↖`, `⬆`, `↗`, `⬅`, `☉`, `➡`, `↙`, `⬇`, `↘`) to instantly snap the anchor point of all selected layers to that corner or edge **without moving the layer on screen**!

### 🔴 Layer Utilities & Shortcuts:
- **🔲 Null Add & Parent:** Creates a centered null controller and parents all selected layers to it.
- **📦 UnPrecomp Layer:** Extracts layers from a pre-comp back into the main timeline.
- **☢ Nuclear Cleaner:** Cleans unused assets, empty folders, and orphaned solids from the Project panel.
- **📌 Layer Marker:** Drops a marker at the current playhead on all selected layers.
- **⏱ Trim Comp to Playhead:** Trims comp work area to the current playhead.
- **🎬 Add to Render Queue:** Sends selected compositions to the Render Queue in 1-click.

### ⏱ Timeline & FPS Changer:
- **⚡ 30 ➔ 60 FPS / ⚡ 60 ➔ 30 FPS:** Converts composition framerate with automatic keyframe timing preservation.
- **⏱ Time Remap Keys:** Adds time remapping keys at in/out points.
- **🔢 Batch Sequence:** Staggers selected layers sequentially across the timeline.

---

## 🛠️ TROUBLESHOOTING & FAQ

### Q1: The extension panel is completely blank / white screen.
**Fix:**
1. Close After Effects.
2. Right-click **`Fix_AfterEffects_Extension.bat`** and run as Administrator.
3. This sets `PlayerDebugMode = 1` in the Windows registry, allowing unsigned CEP extensions to run smoothly.
4. Restart After Effects and reopen **Window > Extensions > Sumair Tools**.

### Q2: My subtitles are out of sync with my voice cuts.
**Fix:**
- Always click **`🎙️ Comp to WAV`** in **Quick Transcribe** before transcribing! If you sliced or rearranged clips on the timeline, raw source files won't match your edit. Comp to WAV renders your exact cuts for 100% transcript accuracy.

### Q3: How do I refresh the extension without closing After Effects?
**Fix:**
- Click the **`v6.5 🔄`** version tag located in the top-right corner of the extension header. It executes a full cache-busting reload of the panel.

### Q4: "Machine Mismatch" or license error.
**Fix:**
- Each license key is bound to one workstation HWID. If you got a new PC or reinstalled Windows, contact Sumair on Discord with your key to reset your machine binding.

---

## 💬 SUPPORT & COMMUNITY LINKS

- 🌐 **Official Website:** [https://sumairtools.online/](https://sumairtools.online/)
- 📦 **Download Mirror:** [https://github.com/svm41r/SumairTools](https://github.com/svm41r/SumairTools)
- 👤 **Creator:** Sumair Ali Siddiqui
- 💬 **Discord Help:** Post in our `#support` or `#ask-sumair` channels!

Enjoy creating with **Sumair Tools v6.5**! If you find this helpful, react with 🚀 and share your edits in `#showcase`!
