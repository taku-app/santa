# AR Camera Feature Documentation

## Overview

The AR (Augmented Reality) camera feature allows users to take photos with 3D character models overlaid on their real-world camera view. This feature is implemented using Google's model-viewer library with WebXR support.

## Features

### Real Camera Access
- Uses the device's camera (back camera on mobile by default)
- High-resolution video stream (1920x1080 ideal)
- Proper camera permission handling with user-friendly error messages

### 3D Model Display
- Supports GLB/GLTF 3D model formats
- Interactive model viewing with camera-controls
- Fallback to a simple 2D character if model file is not available
- WebXR AR modes support (webxr, scene-viewer, quick-look)

### Photo Capture
- Capture photos with AR character overlaid on camera view
- Full-resolution photo capture
- Photo preview before saving
- Download captured photos to device
- Retake functionality

## Usage

### Triggering AR Camera

The AR camera is automatically triggered when:
1. User unlocks their first achievement by checking in at a location
2. After a celebration modal (2.5 seconds), the camera opens
3. User can also manually trigger it by clicking "ARカメラを起動" button (shown after first achievement)

### Taking Photos

1. Point camera at the desired scene
2. Position the 3D character using touch controls (pinch to zoom, drag to rotate)
3. Tap the large camera button (📸) at the bottom
4. Review the captured photo
5. Choose to "もう一度撮る" (retake) or "📥 写真を保存" (save photo)

## Technical Implementation

### Components

- **ArCamera** (`src/components/ar-camera.tsx`)
  - Main AR camera component
  - Handles camera stream management
  - Captures photos from video stream
  - Displays model-viewer for AR

### Dependencies

- `@google/model-viewer` (v3.4.0) - WebXR AR support
- Browser APIs: MediaDevices, Canvas

### 3D Model Requirements

Models should be placed in `/public/models/` directory:

- **Format**: GLB (GLTF Binary)
- **Polygon count**: < 50,000 triangles recommended for mobile performance
- **Texture size**: Max 2048x2048 pixels
- **Default model path**: `/models/santa.glb`

See `/public/models/README.md` for detailed model specifications and sources.

### Browser Compatibility

- **Chrome/Edge**: Full WebXR AR support on Android
- **Safari**: AR Quick Look on iOS (requires USDZ models for native AR)
- **Firefox**: Basic model viewer support (no native AR)

For best AR experience:
- iOS: Safari with AR Quick Look
- Android: Chrome with ARCore support

## Integration with Game Flow

1. User checks location via geolocation API
2. If within 100m of a spot, achievement unlocks
3. First achievement triggers celebration modal
4. After 2.5s, AR camera opens automatically
5. User can take photos with the AR character
6. User can reopen camera anytime via button (once unlocked)

## Camera Permissions

The app requests camera permission when:
- AR camera component mounts and `open` prop is true
- Uses `navigator.mediaDevices.getUserMedia()` with environment camera preference

Error handling:
- Permission denied: Shows user-friendly message in Japanese
- Camera not available: Gracefully handles and shows error
- Stream cleanup: Properly stops camera tracks on component unmount

## Future Enhancements

Potential improvements for AR camera:

1. **Multiple Models**: Support for different characters (Santa, reindeer, etc.)
2. **Model Placement**: Better AR placement using hit-testing APIs
3. **Effects**: AR filters, snow effects, lighting adjustments
4. **Social Sharing**: Direct share to social media platforms
5. **Gallery**: In-app gallery to view saved AR photos
6. **Premium Models**: Exclusive 3D models for premium users

## Troubleshooting

### Camera not working
- Check browser permissions for camera access
- Ensure HTTPS connection (required for getUserMedia)
- Verify browser supports MediaDevices API

### Model not displaying
- Check model file exists at `/public/models/santa.glb`
- Verify model is valid GLB format
- Check browser console for loading errors
- Fallback character will display if model fails to load

### Poor performance
- Reduce model polygon count
- Compress textures
- Test on target devices
- Consider lazy loading model-viewer script

## Code Example

```typescript
import ArCamera from '@/components/ar-camera';

function MyComponent() {
  const [arOpen, setArOpen] = useState(false);

  return (
    <>
      <button onClick={() => setArOpen(true)}>
        Open AR Camera
      </button>
      
      <ArCamera 
        open={arOpen}
        onClose={() => setArOpen(false)}
        modelUrl="/models/santa.glb" // optional, defaults to santa.glb
      />
    </>
  );
}
```

## Security Considerations

- Camera access requires HTTPS in production
- Camera permissions are requested only when needed
- Camera stream is properly released on component unmount
- No camera data is sent to external servers
- Photos are saved locally to user's device
