# nine-patched

Pixel-perfect 9-patch images for Roku and Android, generated right in your browser.

nine-patched is a small, lightweight web app for creating valid `.9.png` (9-patch) assets. You set the shape, colors, and stretch regions, then it renders a live preview and exports a correctly framed 9-patch PNG.

## What is a 9-patch image?

A 9-patch is a normal PNG plus a 1px metadata border on all four sides. That border is not part of the picture. It tells the renderer how to scale the image:

* The top and left edges mark which columns and rows are allowed to stretch.
* The bottom and right edges mark the content (padding) box where inner text or icons should sit.

This lets a single small source image scale to any size while keeping rounded corners and borders crisp.

## Features

* Shapes: rounded rectangle, pill, ellipse or circle, and plain rectangle.
* Fill: solid color (with opacity), or a multi-stop linear gradient where every stop has its own position and opacity. Angles use the CSS and Figma convention, so values paste in directly.
* Background: transparent or solid color.
* Border: adjustable width and color, drawn inside the shape.
* 9-patch regions: separate stretch and content/padding boxes, each with an Auto mode that follows the corner radius and size automatically.
* Live preview on a transparency checkerboard, scaled up so small assets stay readable.
* One click export to `name.9.png`.
* Light and dark themes (your choice is remembered).

## Tech stack

* React 18 with TypeScript
* Vite 6
* Tailwind CSS v4
* lucide-react icons
* HTML5 Canvas for rendering (no native dependencies)

## Getting started

```bash
npm install
npm run dev        # start the dev server (http://localhost:3000)
npm run build      # production build into build/
npm run typecheck  # type-check without emitting
```

## How it works

All rendering logic lives in `src/App.tsx`. The app draws into an HTML5 canvas at the true output size (content size plus the 2px 9-patch frame), then exports the canvas as a PNG. The outer 1px frame only ever contains transparent or pure black pixels, which keeps the output a valid 9-patch.

## Tips for Roku assets

* Author at FHD (1920x1080). The Roku framework scales the whole UI down to HD for you.
* Keep the source small. Corners and borders are copied at their authored size and never stretched, so the source only needs the corners plus a 1px stretchable strip.
* For a rounded background, leave the stretch region on Auto. It insets by the corner radius so the corners never distort.
