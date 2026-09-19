# Fix no-shop empty states

## Changes
- Separate “demo mode is enabled” from “no live shop is connected,” so the Demo Data badge only appears when the switch is on.
- Add one shared no-shop state with the requested message, a Settings link, and a button that enables Demo mode.
- Show that state instead of dashboard cards/charts, order controls/table, and listing controls/table when Demo mode is off and no connected shop data exists.
- Preserve all current sample data and reports when Demo mode is on.

## Technical details
- Expose a clear connection-state value from the shop context based on loaded shops with credentials.
- Reuse the same empty-state component across Dashboard, Orders & Revenue, and Listing Performance.
- Verify both states in the live preview: Demo off/no shop, then Demo on/sample data.
