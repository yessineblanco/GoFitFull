# Alternative Gradient Options for Auth Screens

Based on the Figma design but adapted to GoFit green theme. Choose your favorite!

## Option 1: Subtle Green Gradient (Soft & Elegant)
```tsx
<LinearGradient
  colors={['#030303', '#0a1a0a', '#1a3a1a']}
  start={{ x: 0.5, y: 0 }}
  end={{ x: 0.5, y: 1 }}
  style={StyleSheet.absoluteFill}
/>
```
**Style**: Vertical, dark to subtle green. Very elegant and professional.

---

## Option 2: Vibrant Green Diagonal (Energetic)
```tsx
<LinearGradient
  colors={['#030303', '#84c441']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={StyleSheet.absoluteFill}
/>
```
**Style**: Diagonal dark to bright green. More energetic and fitness-focused.

---

## Option 3: Multi-Stop Green Gradient (Rich & Dynamic)
```tsx
<LinearGradient
  colors={['#030303', '#0d1d0d', '#1a3a1a', '#84c441']}
  locations={[0, 0.4, 0.7, 1]}
  start={{ x: 0.8, y: 0.2 }}
  end={{ x: 0.2, y: 0.8 }}
  style={StyleSheet.absoluteFill}
/>
```
**Style**: Multi-color diagonal gradient. Rich, dynamic, and modern.

---

## Option 4: Dark with Green Accent (Minimalist)
```tsx
<LinearGradient
  colors={['#030303', '#030303', '#0a1a0a']}
  locations={[0, 0.7, 1]}
  start={{ x: 0, y: 0 }}
  end={{ x: 0, y: 1 }}
  style={StyleSheet.absoluteFill}
/>
```
**Style**: Mostly black with subtle green at bottom. Minimalist and clean.

---

## Option 5: Radial Green Glow (Premium Feel)
```tsx
<LinearGradient
  colors={['#030303', '#0a1a0a', '#1a3a1a']}
  start={{ x: 0.5, y: 0.3 }}
  end={{ x: 0.5, y: 1 }}
  style={StyleSheet.absoluteFill}
/>
```
**Style**: Radial-style from center. Premium and sophisticated.

---

## Option 6: Exact Figma Style (Dark Green-Black to Bright Green)
```tsx
<LinearGradient
  colors={['#0a1a0a', '#84c441']}
  start={{ x: 0.8, y: 0.2 }}
  end={{ x: 0.2, y: 0.8 }}
  style={StyleSheet.absoluteFill}
/>
```
**Style**: Matches Figma diagonal exactly. Bold and modern.

---

## Option 7: Soft Warm Gradient (Friendly)
```tsx
<LinearGradient
  colors={['#1a1a1a', '#2a3a2a', '#84c441']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={StyleSheet.absoluteFill}
/>
```
**Style**: Warmer tones, less contrast. Friendlier and more approachable.

---

## Option 8: Deep Forest Gradient (Nature-Inspired)
```tsx
<LinearGradient
  colors={['#030303', '#0d200d', '#1a401a', '#5aa35a']}
  locations={[0, 0.3, 0.6, 1]}
  start={{ x: 0.8, y: 0 }}
  end={{ x: 0.2, y: 1 }}
  style={StyleSheet.absoluteFill}
/>
```
**Style**: Forest-inspired gradient. Natural and organic feel.

---

## Recommendation

**For Fitness App**: Option 2 or Option 3
- Option 2: Clean, bold, energetic
- Option 3: More sophisticated, premium feel

**For Modern/Minimalist**: Option 4
- Clean, professional, subtle

**For Premium/Premium Feel**: Option 5
- Sophisticated, elegant





