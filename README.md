# BeatForge Studio

A free, browser-based mini recording studio designed for GitHub Pages.

## Features
- Record vocals using the device microphone.
- Make a beat with a 16-step kick/snare/hi-hat/clap sequencer.
- Preview the vocal and generated beat together.
- Export a combined WAV mix locally in the browser.
- Save a beat pattern as JSON.
- No login, database, analytics, or upload server.

## Publish on GitHub Pages
1. Sign in to GitHub and create a **new public repository** named `beatforge-studio`.
2. Upload `index.html`, `style.css`, `app.js`, and `README.md` into the repository's root (not inside another folder).
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/(root)**, then click **Save**.
6. Wait a minute or two. GitHub will show the website URL in Settings → Pages.

## Important browser notes
- Use the published HTTPS GitHub Pages URL for microphone access. Most browsers block microphone access on ordinary insecure HTTP pages.
- Press the browser's Allow button when asked for microphone permission.
- This first version keeps recordings temporarily in memory. Download anything you want to keep before refreshing or closing the tab.
- The beat is synthesized from simple browser-generated drum sounds; it does not upload or fetch copyrighted music.
- Mix export creates a WAV file locally. Long recordings can take a little time and memory to render.
- For best vocal quality, use headphones while recording. This version records the microphone first and mixes the beat afterward; it does not overdub the beat into the mic recording.
- Browser support for microphone recording and audio formats varies. Current desktop Chrome or Edge is recommended.

## Credits
Made by Ayush Savita.

## Files
- `index.html` — page structure
- `style.css` — responsive styling
- `app.js` — recording, beat sequencing, and mixing
