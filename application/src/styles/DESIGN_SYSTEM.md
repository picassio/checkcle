# CheckCle Design System

## Design Language: Modern Professional

A refined, professional interface aesthetic that emphasizes clarity, hierarchy, and subtle depth. Suitable for admin dashboards, security contexts, and enterprise applications.

---

## Core Principles

1. **Clarity Over Decoration** - Every element serves a purpose
2. **Subtle Depth** - Light shadows and borders create hierarchy without distraction
3. **Responsive First** - Mobile-optimized with progressive enhancement
4. **Theme Agnostic** - Equal consideration for light and dark modes

---

## Color System

### Priority/Status Colors

Use semantic colors with proper light/dark variants:

```tsx
// High priority (critical, admin-level)
className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800"

// Medium-high priority (important)
className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"

// Medium priority (standard)
className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"

// Low priority (default)
className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
```

### Action Colors (Permission Chips, Buttons)

Each action type has a distinct color for quick visual identification:

```tsx
const ACTION_COLORS = {
  view: {
    selected: 'bg-blue-600 text-white border-blue-600',
    unselected: 'text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950',
  },
  create: {
    selected: 'bg-emerald-600 text-white border-emerald-600',
    unselected: 'text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950',
  },
  update: {
    selected: 'bg-amber-600 text-white border-amber-600',
    unselected: 'text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950',
  },
  delete: {
    selected: 'bg-rose-600 text-white border-rose-600',
    unselected: 'text-rose-600 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-700 dark:hover:bg-rose-950',
  },
  manage: {
    selected: 'bg-violet-600 text-white border-violet-600',
    unselected: 'text-violet-600 border-violet-300 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-700 dark:hover:bg-violet-950',
  },
};
```

### Background Patterns

```tsx
// Card backgrounds
className="bg-card"  // Uses theme variable

// Muted/secondary backgrounds
className="bg-muted/30"  // 30% opacity muted

// System/locked items (grayed out)
className="bg-slate-50 dark:bg-slate-900/50"

// Hover states
className="hover:bg-muted/50"
```

---

## Typography

### Hierarchy

```tsx
// Page title
className="text-2xl md:text-3xl font-bold"

// Section title
className="text-lg font-semibold"

// Card title
className="font-medium text-foreground"

// Subtitle/meta
className="text-sm text-muted-foreground"

// Mono text (IDs, code)
className="text-xs text-muted-foreground font-mono"
```

### Text Truncation

```tsx
// Single line truncate
className="truncate"

// Multi-line clamp
className="line-clamp-2"
```

---

## Spacing & Layout

### Responsive Grid

```tsx
// Card grid (1 → 2 → 3 columns)
className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"

// List with gaps
className="space-y-3"

// Flex with responsive direction
className="flex flex-col sm:flex-row sm:items-center gap-3"
```

### Card Padding

```tsx
// Standard card content
className="p-4"

// Compact card
className="p-3"

// Dialog/sheet content
className="p-4 md:p-6"
```

### Touch Targets

```tsx
// Minimum touch target (44px)
className="min-h-[44px] min-w-[44px]"

// Icon button
className="h-8 w-8"  // 32px, acceptable for desktop
className="h-10 w-10"  // 40px, better for touch
```

---

## Component Patterns

### Cards

```tsx
// Standard card with hover
<div className="
  rounded-lg border bg-card p-4
  transition-all duration-200
  hover:shadow-md hover:border-border
">

// System/locked card variant
<div className="
  rounded-lg border bg-card p-4
  border-slate-200 dark:border-slate-700
  bg-slate-50 dark:bg-slate-900/50
">

// Interactive card
<div className="
  rounded-lg border bg-card p-4
  cursor-pointer transition-all duration-200
  hover:shadow-md hover:border-primary/30
">
```

### Clickable Cards with Nested Actions

When a card is clickable but contains interactive elements (dropdowns, buttons), use event propagation control:

```tsx
<div
  onClick={() => onItemClick(item)}
  className="group rounded-lg border bg-card p-4 cursor-pointer
             transition-all duration-200 hover:shadow-md"
>
  {/* Card content */}
  <h3>{item.name}</h3>

  {/* Nested dropdown - stop propagation */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenuItem onClick={() => onEdit(item)}>
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDelete(item)}>
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**Key points:**
- Add `onClick={(e) => e.stopPropagation()}` to the trigger button
- Add `onClick={(e) => e.stopPropagation()}` to the dropdown content
- Use `group` class on card and `group-hover:opacity-100` for reveal-on-hover actions

### Badges

```tsx
// Priority badge
<Badge
  variant="outline"
  className="text-xs font-medium bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
>
  Priority: 50
</Badge>

// Type badge
<Badge variant="secondary" className="text-xs">System</Badge>
<Badge variant="default" className="text-xs">Custom</Badge>
```

### Action Chips (Toggleable)

```tsx
<button
  onClick={() => toggleAction(action)}
  className={`
    px-3 py-1.5 rounded-md text-xs font-medium border
    transition-all duration-150
    ${isSelected
      ? 'bg-blue-600 text-white border-blue-600'
      : 'text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950'
    }
  `}
>
  {actionLabel}
</button>
```

### Collapsible Sections

```tsx
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger className="
    flex items-center justify-between w-full p-3
    rounded-lg border bg-card
    hover:bg-muted/50 transition-colors
  ">
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{title}</span>
    </div>
    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
  </CollapsibleTrigger>
  <CollapsibleContent className="pt-3">
    {children}
  </CollapsibleContent>
</Collapsible>
```

### Empty States

```tsx
<div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 px-4">
  <div className="flex flex-col items-center justify-center text-center">
    <div className="p-3 rounded-full bg-muted mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-base font-medium text-foreground">No items found</h3>
    <p className="mt-1 text-sm text-muted-foreground max-w-sm">
      Description text explaining what to do next.
    </p>
  </div>
</div>
```

---

## Animation Guidelines

### Allowed Transitions

Keep animations subtle and functional:

```tsx
// Standard hover transition
className="transition-all duration-200"

// Color/background only
className="transition-colors duration-150"

// Transform (rotation, scale)
className="transition-transform duration-200"

// Opacity reveal
className="opacity-0 group-hover:opacity-100 transition-opacity"
```

### Avoid

- Complex keyframe animations on load
- Staggered reveal animations
- Large transform scales (keep under 1.02)
- Long durations (keep under 300ms)
- Animations that block interaction

### Loading States

```tsx
// Spinner
<div className="h-10 w-10 rounded-full border-2 border-muted border-t-primary animate-spin" />

// Skeleton
<Skeleton className="h-24 w-full" />

// Refresh icon
<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
```

---

## Mobile Patterns

### Scrollable Dialogs with Fixed Header/Footer

For dialogs with expandable content (like permission grids), use a flex column layout with proper scroll containment:

```tsx
// Desktop Dialog
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-2xl h-[85vh] p-0 flex flex-col gap-0">
    {dialogContent}
  </DialogContent>
</Dialog>

// Dialog content structure
const dialogContent = (
  <div className="flex flex-col h-full overflow-hidden">
    {/* Fixed Header */}
    <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b bg-muted/30">
      <h2 className="text-lg font-semibold">Dialog Title</h2>
    </div>

    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-6 space-y-4">
        {/* Expandable sections go here */}
      </div>
    </div>

    {/* Fixed Footer */}
    <div className="flex-shrink-0 px-6 py-4 border-t bg-muted/30">
      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </div>
    </div>
  </div>
);
```

**Key points:**
- Use `h-[85vh]` instead of `max-h-[85vh]` for reliable height
- Parent container: `flex flex-col h-full overflow-hidden`
- Header/Footer: `flex-shrink-0` to prevent shrinking
- Scrollable area: `flex-1 overflow-y-auto min-h-0`
- The `min-h-0` is crucial - it allows flex items to shrink below content size

### Bottom Sheet (Dialog on Mobile)

```tsx
// Use Sheet component on mobile, Dialog on desktop
const isMobile = useMediaQuery('(max-width: 640px)');

return isMobile ? (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col rounded-t-xl">
      {/* Drag handle */}
      <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>
      {dialogContent}
    </SheetContent>
  </Sheet>
) : (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl h-[85vh] p-0 flex flex-col gap-0">
      {dialogContent}
    </DialogContent>
  </Dialog>
);
```

### Responsive Button Labels

```tsx
<Button>
  <Icon className="h-4 w-4 mr-2" />
  <span className="hidden sm:inline">Full Label</span>
  <span className="sm:hidden">Short</span>
</Button>
```

### Responsive Dialog Footer

```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
  <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
  <Button className="w-full sm:w-auto">Save</Button>
</div>
```

---

## Grouping & Categories

When displaying many items, group them logically:

```tsx
const CATEGORIES = {
  core: {
    label: 'Core System',
    icon: Settings,
    items: ['users', 'roles', 'settings']
  },
  monitoring: {
    label: 'Monitoring',
    icon: Globe,
    items: ['services', 'servers', 'ssl_certificates']
  },
  operations: {
    label: 'Operations',
    icon: Wrench,
    items: ['incidents', 'maintenance', 'alerts']
  },
  advanced: {
    label: 'Advanced',
    icon: Zap,
    items: ['security_scans', 'performance_tests', 'reports']
  },
};
```

---

## Icon Usage

### Semantic Icons

| Context | Icon | Import |
|---------|------|--------|
| System/locked | `Lock` | lucide-react |
| Custom/editable | `Shield` | lucide-react |
| Settings/config | `Settings` | lucide-react |
| Expand/collapse | `ChevronDown` | lucide-react |
| Actions menu | `MoreHorizontal` | lucide-react |
| Refresh | `RefreshCw` | lucide-react |
| Edit | `Edit` | lucide-react |
| Delete | `Trash2` | lucide-react |
| View | `Eye` | lucide-react |

### Icon Sizing

```tsx
// In buttons/inline
className="h-4 w-4"

// Feature icons
className="h-5 w-5"

// Empty state icons
className="h-8 w-8"
```

---

## Accessibility

### Focus States

```tsx
// Buttons inherit from shadcn/ui
// For custom interactive elements:
className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
```

### Screen Reader Text

```tsx
<span className="sr-only">Close dialog</span>
```

### ARIA Labels

```tsx
<Button aria-label="Edit role">
  <Edit className="h-4 w-4" />
</Button>
```

---

## UX Patterns

### Click Behavior Hierarchy

1. **Cards should be clickable** - Better UX than requiring dropdown menu interaction
2. **Nested actions need isolation** - Use `stopPropagation()` to prevent bubbling
3. **Reveal actions on hover** - Use `group` + `group-hover:opacity-100`

### Scroll Containment

When using expandable/collapsible sections inside dialogs:

| Element | Classes | Purpose |
|---------|---------|---------|
| Container | `flex flex-col h-full overflow-hidden` | Establishes flex context |
| Header | `flex-shrink-0` | Prevents shrinking |
| Content | `flex-1 overflow-y-auto min-h-0` | Takes remaining space, scrolls |
| Footer | `flex-shrink-0` | Prevents shrinking |

**Common mistake:** Using `max-h-[85vh]` with `overflow-hidden` breaks scroll. Use fixed `h-[85vh]` instead.

### Dialog vs Sheet

| Viewport | Component | Height |
|----------|-----------|--------|
| Desktop (>640px) | `Dialog` | `h-[85vh]` |
| Mobile (≤640px) | `Sheet` (bottom) | `h-[95vh]` |

---

## Reference Implementation

See these files for complete examples:

- `/src/components/settings/role-management/RoleList.tsx` - Clickable cards with dropdown actions
- `/src/components/settings/role-management/RoleDialog.tsx` - Scrollable dialog with expandable sections

---

## Quick Reference: Light/Dark Pattern

Always use this pattern for themed colors:

```
Light Mode Base → Dark Mode Override
bg-{color}-100   → dark:bg-{color}-900/30
text-{color}-700 → dark:text-{color}-400
border-{color}-200 → dark:border-{color}-800
hover:bg-{color}-50 → dark:hover:bg-{color}-950
```
