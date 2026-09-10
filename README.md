# Niimbot Unlocked

A desktop label editor for Niimbot thermal printers. Runs on Windows as an Electron app and talks to the printer over a serial port, so no phone and no cloud account are needed.

This is a rebuild of the [niimblue](https://github.com/MultiMote/niimblue) web app. The serial protocol and print pipeline come from [NiimBlueLib](https://github.com/MultiMote/niimbluelib); the editor and the rest of the UI are new.

## What it does

- Connect to a Niimbot printer over serial and read live status: model, battery, paper and ribbon RFID, density range, printhead width.
- Design labels in a canvas editor: text, shapes, images, QR codes, barcodes, ArUco markers. Snapping, guides, zoom, layers, alignment, undo and redo.
- Save labels as files on disk and browse them in an in-app library, with thumbnails.
- Print with a preview that shows the post-processed output. Set density, speed, quantity, label type, print task and offset, then watch progress and cancel if needed.
- Batch printing from CSV data, with per-row preview and serial numbering.
- Printer tools: read and write RFID, toggle sound, set auto-shutdown, factory reset, flash firmware, and watch a raw packet log.
- Paper stock templates keyed to the rolls Niimbot actually sells, grouped by printer family and paper type. The connected printer's reported paper types and printhead width filter the list to what it can actually print, and continuous rolls take a user-settable length.

## Supported printers

There is no fixed list. The aim is to support as many models as the protocol allows. Tested models are tracked in the [NiimBlueLib issue tracker](https://github.com/MultiMote/niimbluelib/issues/1). If your model does not print, capture a packet dump from the official app so the protocol can be checked.

## Requirements

- Windows 10 or 11.
- A serial connection to the printer (USB, or Bluetooth mapped to a COM port).
- Node.js 20+ if you build from source.

## Building from source

```bash
npm install
npm run dev        # dev server with hot reload
npm run package    # builds a Windows installer under release/
```

For just the renderer, run `npm run build:renderer`. For the Electron main process, run `npm run build:main`.

## Project layout

- `electron/` - main process, preload, file IPC for the label library.
- `src/renderer/` - the Svelte app: editor engine, components, comms and print logic.
- `src/renderer/lib/engine/` - the canvas scene graph, renderers and hit testing.
- `src/renderer/lib/paper.ts` - paper stock templates.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the style rules the code follows.

## Credits

Built on [NiimBlueLib](https://github.com/MultiMote/niimbluelib) by MultiMote, which does the actual work of talking to the printers. The original [niimblue](https://github.com/MultiMote/niimblue) web app is the starting point for this project.
