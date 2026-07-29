---
name: Smart Cart Visual Framework
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#89ceff'
  on-secondary: '#00344d'
  secondary-container: '#00a2e6'
  on-secondary-container: '#00344e'
  tertiary: '#3cddc7'
  on-tertiary: '#003731'
  tertiary-container: '#00a392'
  on-tertiary-container: '#00302a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#62fae3'
  tertiary-fixed-dim: '#3cddc7'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005047'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
  price-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

The design system is engineered to evoke a sense of futuristic efficiency and premium reliability. It targets tech-literate consumers who value speed and a frictionless shopping experience. By blending **Glassmorphism** with **Modern Minimalist** structures, the interface feels lightweight yet deeply layered. 

The aesthetic is anchored in a high-tech "command center" vibe, utilizing deep backgrounds to make vibrant accent colors pop. The emotional response should be one of excitement and trust—positioning the platform as an advanced tool rather than just another storefront. Visuals are crisp, surfaces are translucent, and interactions should feel fluid and instantaneous.

## Colors

This design system utilizes a sophisticated dark mode palette to emphasize its high-tech nature. The primary **Electric Purple** serves as the main brand signal, used for primary actions and key highlights. **Tech Blue** acts as a supportive secondary color for secondary actions and information categorization.

The background is a deep, saturated navy rather than true black to maintain depth and allow for soft shadows. Accents of **Teal** are used sparingly for success states or "New" badges. 

**Color application rules:**
- Use gradients of Purple to Blue for primary CTA buttons to create a "glowing" effect.
- Text uses a high-contrast scale of whites and cool grays to ensure legibility against dark backgrounds.
- Borders on glass elements should use a low-opacity white (approx 10-15%) to simulate a light-catching edge.

## Typography

The typography strategy pairs the technical, geometric personality of **Space Grotesk** with the clean, systematic readability of **Inter**. 

Space Grotesk is reserved for headlines, labels, and price displays to reinforce the "Smart" aspect of the platform. Its unique terminals and proportions provide a futuristic edge. Inter handles all long-form text and UI metadata, ensuring that product descriptions and specifications remain highly legible even on smaller screens or within translucent containers.

Pricing is given its own weight and scale to ensure it is the most prominent element in a product card or checkout summary.

## Layout & Spacing

The design system employs a **Fixed Grid** model for desktop windows, centering the content within a 1440px maximum width container. This ensures that on ultra-wide monitors, the shopping experience remains focused and ergonomic.

A 12-column grid is used for the main content area, with 24px gutters. Spacing is based on an 8px rhythmic scale. Product grids should typically span 3 or 4 columns depending on the item's visual complexity. White space is used intentionally to separate categories and highlight featured products, preventing the "clutter" often associated with high-density e-commerce sites.

## Elevation & Depth

Depth in this design system is achieved through **Glassmorphism** rather than traditional drop shadows. Instead of simulating light sources from above, the UI treats elements as translucent layers floating in a dark 3D space.

**Key Depth Principles:**
- **Backdrop Blur:** Use a `20px` to `40px` blur on surfaces to create a sense of focus and separation.
- **Thin Borders:** Elements should have a `1px` solid border with a linear gradient (top-left to bottom-right) from `rgba(255, 255, 255, 0.2)` to `rgba(255, 255, 255, 0.05)`.
- **Z-Axis Tiers:** 
  - Base: Deep Slate (#0F172A).
  - Level 1 (Cards): Translucent fill `rgba(30, 41, 59, 0.7)`.
  - Level 2 (Modals/Popovers): Translucent fill `rgba(51, 65, 85, 0.8)` with a soft outer glow in the primary accent color.

## Shapes

The shape language balances the "high-tech" precision with "friendly" accessibility. This design system avoids sharp 90-degree corners to prevent the UI from feeling aggressive or overly corporate.

A `0.5rem` (8px) radius is the standard for cards and containers. Buttons and smaller interactive elements use more pronounced rounding to feel "touchable" and inviting. High-level containers, like the shopping cart side-panel or main navigation bars, should use the `rounded-xl` (1.5rem) setting to soften the overall desktop window presentation.

## Components

### Buttons
Primary buttons feature a vibrant gradient from Electric Purple to Tech Blue. They utilize a subtle outer glow (box-shadow with color) that intensifies on hover. Text within buttons should be uppercase Space Grotesk.

### Cards
Product cards are the primary glassmorphic elements. They feature a high-blur background, the thin "light-catching" border, and an image area that slightly overlaps the card boundary for a 3D effect.

### Input Fields
Inputs are dark with a very subtle border. Upon focus, the border transitions to a solid Tech Blue with a soft blue glow, and the placeholder text moves upward in a smaller label format.

### Chips & Tags
Used for categories (e.g., "Electronics," "Sale"). These are semi-transparent pills with a border matching their status color. They should have a slight "frosted" look.

### The Smart Bar
A unique component for this design system: a persistent, glassmorphic search and filter bar that floats at the top or bottom of the screen, acting as the central hub for user navigation.

### Progress Indicators
Steppers for the checkout process use glowing nodes and neon lines to represent the user's journey, reinforcing the high-tech narrative.