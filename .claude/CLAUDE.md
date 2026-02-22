# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build

This is a browser-based app. JavaScript is written in CommonJS modules and bundled with [browserify](https://browserify.org/).

```bash
# Install dependencies
npm install

# Bundle for production (requires browserify installed globally or via npx)
browserify js/m32main.js -o js/bundle.js

# Bundle during development (auto-rebuilds on file change; requires watchify globally or via npx)
watchify js/m32main.js -o js/bundle.js

# Bundle the serial test page
browserify js/serialtest.js -o js/bundle-serialtest.js
```

`js/bundle.js` is the compiled output loaded by `index.html`. **Edit source files in `js/`, not `bundle.js`.**

There are no automated tests configured.

## Architecture

**Single-page web app** served from `index.html`, using Bootstrap 5 for layout and the [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/serial) to communicate with a Morserino32 hardware device over USB. Only Chrome, Edge, and Opera are supported.

### Module overview (`js/`)

| File | Role |
|---|---|
| `m32main.js` | Entry point. Instantiates all UI and service classes, wires up tab events and the shared EventEmitter. |
| `m32-communication-service.js` | Core service. Opens/closes the Web Serial port, runs the async read loop, and emits events (`event-m32-connected`, `event-m32-disconnected`, `event-m32-text-received`, etc.). Contains `M32StreamParser` which separates interleaved plain-text and JSON frames from the serial stream. |
| `m32-connect-ui.js` | Connect/disconnect button and status badge. |
| `m32-cw-generator-ui.js` | CW Generator / CW Keyer tab: receives text from Morserino, compares with user input, shows diff, saves results to storage. |
| `m32-echo-trainer-ui.js` | Echo Trainer tab: displays received abbreviations and their meanings. |
| `m32-qso-trainer.js` | QSO Trainer tab: drives a CW QSO bot that responds to keyed messages, using `jscwlib` for audio playback. |
| `m32-configuration-ui.js` | M32 Config tab: reads/writes Morserino configuration over the serial protocol. |
| `m32-file-upload-ui.js` | M32 File Upload tab: download/upload text files to/from Morserino. |
| `m32-cw-memory-ui.js` | M32 CW Memory tab: read/write the 8 CW memories on the device. |
| `m32-storage.js` | Wraps `localStorage` for persisting saved results and settings. |
| `m32protocol-state-handler.js` | Tracks Morserino state (menu, speed, Koch lesson) from JSON protocol frames. |
| `m32protocol-speech-handler.js` | Voices Morserino actions via the Web Speech API. |
| `m32protocol-ui-handler.js` | Updates the UI state badge from protocol frames. |
| `m32protocol-i18n.js` | German/English translations for protocol messages. |

### Data flow

1. `M32CommunicationService.connect()` opens the serial port and starts `readLoop()`.
2. Raw serial data is fed into `M32StreamParser`, which splits it into text segments and JSON objects.
3. JSON frames are dispatched to `protocolHandlers` (state, UI, speech).
4. Plain-text frames are emitted as `event-m32-text-received` and consumed by whichever UI tab is active.
5. Commands are sent back to the device via `sendM32Command()`, which serializes access using a simple `Lock`.

### URL parameters

- `?mode=cw-generator|echo-trainer|qso-trainer|m32-config|file-upload|cw-memory` — open a specific tab on load
- `?debug` — enable debug mode (editable receive fields, extra logging)
- `?language=en|de` — set the M32 protocol language

### Serial protocol details

The Morserino serial stream mixes plain text and JSON frames. `M32StreamParser` in `m32-communication-service.js` detects JSON by looking for `{` / `}` boundaries. A session is delimited by `MORSERINO_START = 'vvv<ka> '` and `MORSERINO_END = ' +'`.

Key event names emitted by `M32CommunicationService`:
- `event-m32-connected` / `event-m32-disconnected` / `event-m32-connection-error`
- `event-m32-text-received` — plain-text CW characters forwarded to active tab
- `event-m32-json-error-received` — malformed JSON frames

`sendM32Command()` serializes all outbound writes using a `Lock` (defined at the bottom of `m32-communication-service.js`) to prevent interleaved writes.

Logging uses `loglevel`; the default level is `DEBUG` in all modules.

### Other files

- `bin/` — Morserino32 firmware `.bin` files (used with the external Morserino flash tool, not built here).
- `libs/jscwlib-0.2.2.js` — CW audio playback library (vendored).
- `configs.json` — Morserino configuration schema used by `ConfigurationUI`.
- `wordlist_*.txt` / `wordlist_*_random.txt` — Word lists uploadable to the Morserino for file-player mode.
