---
version: alpha
name: COMANDOS AI Workspace
description: Premium command-center interface for the COMANDOS AI club.
colors:
  primary: "#D9FC67"
  lime: "#D9FC67"
  lime-hover: "#B8DA45"
  ink: "#0B0B0C"
  ink-light: "#1F1B16"
  graphite: "#131313"
  graphite-2: "#1A1A1A"
  milk: "#F4EFE3"
  milk-card: "#FBF7EC"
  milk-nested: "#EDE6D4"
  steel-blue: "#2F4954"
  deep-blue: "#0E2A44"
  plum: "#5B3A6E"
  wine: "#972E2E"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: Raleway
    fontSize: 56px
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  heading:
    fontFamily: Raleway
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: Raleway
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0.02em"
rounded:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary-dark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-dark-hover:
    backgroundColor: "{colors.lime-hover}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-light:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.lime}"
    rounded: "{rounded.md}"
    padding: 12px
  card-dark:
    backgroundColor: "{colors.graphite-2}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: 16px
  card-light:
    backgroundColor: "{colors.milk-card}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.lg}"
    padding: 16px
  light-focus-state:
    backgroundColor: "{colors.milk}"
    textColor: "{colors.plum}"
    rounded: "{rounded.sm}"
    padding: 8px
  nested-light-panel:
    backgroundColor: "{colors.milk-nested}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.md}"
    padding: 16px
  dark-subtle-panel:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: 16px
  status-critical:
    backgroundColor: "{colors.wine}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: 8px
  telemetry-panel:
    backgroundColor: "{colors.deep-blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: 16px
  telemetry-muted-panel:
    backgroundColor: "{colors.steel-blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: 16px
---

## Overview

COMANDOS AI Workspace is a premium command center for operating an AI team. It should feel calm, precise, and powerful: closer to Linear and Apple than to a decorative sci-fi cockpit. The interface is for daily work, so density, scanning, contrast, and predictable navigation matter more than spectacle.

## Colors

- **Lime (#D9FC67):** the single brand accent. Use it for one primary action or status anchor per surface.
- **Ink (#0B0B0C / #1F1B16):** the controlling surface color. In light mode, lime must sit on an ink plate, never directly on milk backgrounds.
- **Milk (#F4EFE3):** the light canvas. It is warm and calm, not white.
- **Plum (#5B3A6E):** secondary accent for light mode links, focus, and selected states.
- **Wine (#972E2E):** destructive and critical states only.

## Typography

Use Raleway for all product UI. Headings use 700-800 weight with tight tracking. Body copy stays simple and readable. JetBrains Mono is reserved for model ids, logs, paths, tokens, and numeric telemetry.

## Layout

Use a 4px grid. Prefer compact operational layouts: persistent sidebar, dense cards, clear section labels, and stable controls. Cards are repeated items or framed tools, not nested decorative containers.

## Elevation & Depth

Dark mode can use restrained shadows. Light mode should rely on borders, subtle inner highlights, and warm surface contrast instead of heavy elevation.

## Shapes

Default radius is 8-12px for controls and 16px for larger panels. Avoid pill overload except for badges, chips, and compact status markers.

## Components

Primary buttons:
- Dark mode: lime background with ink text.
- Light mode: ink background with lime text.

Cards:
- Use thin borders and clear spacing.
- Hover lift is allowed only for interactive repeated items.

Inputs:
- Focus ring is lime in dark mode and plum/ink in light mode.
- Minimum touch target is 44px on mobile.

## Do's and Don'ts

Do:
- Keep lime under 10% of the screen.
- Use Russian as the primary UI language with English fallback.
- Keep telemetry and model ids monospaced.
- Preserve upstream license attribution.

Don’t:
- Reintroduce Hermes Workspace as visible product branding.
- Use blue/purple upstream accents in COMANDOS themes except plum in light mode.
- Put lime text directly on milk backgrounds.
- Add generated imagery in the first fork pass.
