# Accessibility

The site targets WCAG 2.2 AA. Current foundations include landmarks, one main heading per route, a skip link, semantic sections, labelled navigation/forms, visible focus states, minimum 44px interactive targets, meaningful empty states and reduced-motion CSS.

Product imagery has source-aware alternative text. Color is not the only state signal. Mobile menu, filters and cart drawer use native dialogs for Escape handling and focus containment. Cart changes are announced through polite live regions; touch targets and sticky actions remain keyboard reachable.

Future motion must preserve DOM reading order, never trap scroll or keyboard focus, and provide a static poster/content path for reduced motion, script failure and constrained devices. Canvas is decorative; it cannot contain the only version of meaningful copy.

Before production, perform keyboard, VoiceOver/TalkBack, zoom/reflow, contrast, validation/error and dynamic announcement testing with real content. Confirm language changes if Kyrgyz or English copy is added.
