# Figma Background Gradient Extraction

## Background Gradient (from 02_Login-A)

```css
background: linear-gradient(203.08deg, #100919 32.84%, #46B0E6 168.68%);
```

### Gradient Details:
- **Type**: Linear Gradient
- **Angle**: 203.08 degrees (diagonal from top-right to bottom-left)
- **Start Color**: `#100919` (dark blue/purple) at 32.84%
- **End Color**: `#46B0E6` (light blue/cyan) at 168.68%

### Color Values:
- **Start**: `#100919` - Very dark blue/purple (almost black with blue tint)
- **End**: `#46B0E6` - Bright light blue/cyan

### For React Native (LinearGradient):
```tsx
<LinearGradient
  colors={['#100919', '#46B0E6']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={StyleSheet.absoluteFill}
/>
```

### Angle Conversion:
The 203.08deg angle in CSS represents:
- CSS gradients: 0deg = top, 90deg = right, 180deg = bottom, 270deg = left
- 203.08deg ≈ top-left to bottom-right direction

For React Native LinearGradient, the equivalent would be approximately:
```tsx
// Start from top-right, end at bottom-left
start={{ x: 1, y: 0 }}
end={{ x: 0, y: 1 }}
```

Or using locations for exact positioning:
```tsx
<LinearGradient
  colors={['#100919', '#46B0E6']}
  locations={[0.3284, 1.6868]} // Note: React Native locations are 0-1, so 1.6868 would be clamped
  start={{ x: 0.8, y: 0.2 }}
  end={{ x: 0.2, y: 0.8 }}
  style={StyleSheet.absoluteFill}
/>
```

### Notes:
- The design uses a dark-to-light gradient (dark blue/purple → light blue)
- This creates a dramatic, modern look
- The colors are very different from GoFit's current green theme (#84c441)
- Consider if this should replace the current gradient or be adapted to match GoFit's brand colors





