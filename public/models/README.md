# 3D Models for AR

This directory contains 3D models used in the AR camera feature.

## Required Models

- `santa.glb` - Main Santa character model for AR experience
- `reindeer.glb` - Premium reindeer character (optional)

## Model Specifications

- Format: GLB (GLTF Binary)
- Recommended polygon count: < 50,000 triangles for mobile performance
- Texture size: Max 2048x2048 pixels
- Animations: Optional, but supported

## Where to Get Free Models

1. **Sketchfab** (https://sketchfab.com/) - Search for "santa claus" with "Downloadable" filter
2. **Google Poly** Archive (https://poly.pizza/)
3. **Free3D** (https://free3d.com/)
4. **Mixamo** (https://www.mixamo.com/) - Rigged characters with animations

## How to Add Models

1. Download a GLB or GLTF file
2. If GLTF (not binary), convert to GLB using:
   - Online: https://glb-packer.glitch.me/
   - CLI: `gltf-pipeline -i model.gltf -o model.glb`
3. Place the GLB file in this directory
4. Update the model path in the AR camera component if needed

## Testing Models

You can preview GLB files before using them:
- https://gltf-viewer.donmccurdy.com/
- https://modelviewer.dev/editor/

## License Notes

Make sure any downloaded models have appropriate licenses for commercial use if needed.
