# Face classifier

## The problem
You're given a hollow sphere with an extrusion attached to the bottom of it , make 3-4 section planes that cut through the sphere and classify which faces of the object become visible , in a brep like fashion:

> *"Is the camera looking at this face's outer side, its inner side, or has the cut removed it entirely?"*

It sounds like this requires a pixel raycasting approach but it isn't. We can use a simple winding check to classify the faces of the object into front, back, and clipped.

## What you'll see in the demo

A live Three.js app:

- A default scene — a hollow sphere with a small box floating inside it.
- A panel of **section planes** — add up to six, each with X / Y / Z presets, free yaw and pitch sliders, and a position slider. Drag a plane through the model and the colours and counts update in real time.
- An **STL upload** so you can throw any model at it.
- A **minimap** in the corner showing where every plane sits in world space and where the camera is.

Every triangle ends up labelled **green** (you're looking at its outer side), **blue** (you're looking at its inner side, exposed by a cut), or removed by a clip plane.

## Current limitations
- This algorithm is susceptible to false positives because it doesn't account for occlusion.
- Uses non-indexed geometry which has a higher memory footprint.

