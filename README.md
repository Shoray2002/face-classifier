# Face classifier

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173/`).

## Build

```bash
npm run build
npm run preview
```

## What's in the browser

- **Upload STL** to replace the default sphere + box with any model.
- **Reset** to restore the default.
- **+ Add plane** to add a section plane (up to 6). Each row has:
  - X / Y / Z preset buttons
  - a position slider
  - yaw and pitch sliders for arbitrary orientation
  - an `×` button to remove it
- Drag the camera with the mouse (left-drag rotates, scroll zooms).

A minimap in the bottom-right shows where every plane sits in world space and where your camera is.
