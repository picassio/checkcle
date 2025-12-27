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

### User/Avatar Cards

Display user information with avatar in a clickable card:

```tsx
<div
  onClick={() => openDialog(user)}
  className="group rounded-lg border bg-card p-4 cursor-pointer
             transition-all duration-200 hover:shadow-md"
>
  <div className="flex items-center gap-3">
    <Avatar className="h-10 w-10 shrink-0">
      <AvatarImage src={user.avatar} />
      <AvatarFallback className="text-sm bg-primary/10 text-primary">
        {getInitials(user.name, user.email)}
      </AvatarFallback>
    </Avatar>
    <div className="min-w-0">
      <h3 className="font-medium text-foreground truncate">{user.name}</h3>
      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
    </div>
  </div>
</div>
```

### Badge Overflow Pattern

When displaying many badges, show first N and "+X more":

```tsx
<div className="flex flex-wrap gap-1.5">
  {items.slice(0, 3).map((item) => (
    <Badge key={item.id} variant="outline">{item.name}</Badge>
  ))}
  {items.length > 3 && (
    <Badge variant="outline" className="text-xs">
      +{items.length - 3} more
    </Badge>
  )}
</div>
```

### Conditional Card Borders

Use dashed borders for "empty" cards (no content/assignments):

```tsx
<div className={`
  rounded-lg border bg-card p-4 cursor-pointer
  transition-all duration-200 hover:shadow-md
  ${hasContent
    ? 'border-border hover:border-primary/30'
    : 'border-dashed border-muted-foreground/30'
  }
`}>
```

### Role/Permission Color Mapping

Semantic colors for different role types:

```tsx
const getRoleColor = (roleName: string) => {
  switch (roleName) {
    case 'superadmin':
      return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
    case 'admin':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    case 'service_manager':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'operator':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    case 'viewer':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    default:
      return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800';
  }
};
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

## Sidebar & Navigation Patterns

### Sidebar Background

Never use hardcoded colors. Use theme-aware classes:

```tsx
// ✅ Correct
className="bg-slate-50 dark:bg-slate-900/95"
className="border-slate-200 dark:border-slate-800"

// ❌ Avoid
className="bg-[#121212]"
className="border-[#1e1e1e]"
```

### Active State with Left Accent Border

The signature active state pattern - animated left border with background highlight:

```tsx
<div className="group relative flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg cursor-pointer">
  {/* Active Indicator - Left Border */}
  <div
    className={`
      absolute left-0 top-1/2 -translate-y-1/2
      w-[3px] rounded-r-full
      transition-all duration-150 ease-out
      ${isActive
        ? 'h-5 bg-primary'
        : 'h-0 bg-transparent group-hover:h-3 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
      }
    `}
  />

  {/* Icon with color change */}
  <Icon
    className={`
      h-[18px] w-[18px] transition-colors duration-150
      ${isActive
        ? 'text-primary'
        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
      }
    `}
    strokeWidth={isActive ? 2.5 : 2}
  />

  {/* Label */}
  <span className={`
    text-[13px] font-medium transition-colors duration-150
    ${isActive
      ? 'text-primary'
      : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100'
    }
  `}>
    {label}
  </span>
</div>
```

**Key elements:**
- Left border animates from `h-0` to `h-5` when active
- `rounded-r-full` for pill shape on right side
- Icon stroke weight increases when active (2 → 2.5)
- Background: `bg-primary/8 dark:bg-primary/10` when active

### Collapsed Mode with Tooltips

Wrap sidebar with `TooltipProvider` and show tooltips in collapsed mode:

```tsx
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Wrap sidebar
<TooltipProvider delayDuration={0}>
  <aside className={collapsed ? 'w-[68px]' : 'w-64'}>
    {/* Navigation items */}
  </aside>
</TooltipProvider>

// Menu item with tooltip
if (collapsed) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {menuItemContent}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
return menuItemContent;
```

### Navigation Section Labels

Use uppercase, wide-tracked labels for section headers:

```tsx
<div className="px-5 mb-2">
  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
    Navigation
  </span>
</div>
```

### Collapsible Navigation Sections

Use `ChevronRight` that rotates 90° when open:

```tsx
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger className="w-full group">
    <div className="flex items-center justify-between mx-2 px-3 py-2 rounded-lg
                    hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors duration-150">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
          {sectionLabel}
        </span>
      </div>
      <ChevronRight
        className={`
          h-4 w-4 text-slate-400 dark:text-slate-500
          transition-transform duration-200 ease-out
          ${isOpen ? 'rotate-90' : ''}
        `}
      />
    </div>
  </CollapsibleTrigger>

  <CollapsibleContent>
    {/* Sub-items with left indent */}
    <div className="mt-1 space-y-0.5">
      {items.map((item) => (
        <div className="mx-2 ml-5 px-3 py-2 rounded-lg">
          {/* Item content */}
        </div>
      ))}
    </div>
  </CollapsibleContent>
</Collapsible>
```

**Key elements:**
- `ChevronRight` with `rotate-90` when open (not `ChevronDown` with `rotate-180`)
- Sub-items indented with `ml-5`
- `transition-transform duration-200 ease-out` for smooth rotation

### Mobile Sidebar Drawer

Use Sheet component with drag handle and proper height:

```tsx
<Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
  <SheetContent
    side="left"
    className="p-0 w-[280px] border-r-0 bg-slate-50 dark:bg-slate-900/95"
  >
    {/* Drag Handle */}
    <div className="flex justify-center pt-3 pb-1">
      <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
    </div>

    <div className="flex flex-col h-[calc(100%-24px)] overflow-hidden">
      <SidebarHeader />

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <MainNavigation onItemClick={onMobileClose} />
        <SettingsPanel onItemClick={onMobileClose} />
      </div>

      {/* Safe area padding for mobile */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  </SheetContent>
</Sheet>
```

**Key elements:**
- Width: `w-[280px]` (wider than desktop collapsed)
- Drag handle: `w-10 h-1 rounded-full`
- `overscroll-contain` for native-feeling scroll
- Pass `onItemClick` to close drawer after navigation

### Sidebar Dimensions

| State | Width | Notes |
|-------|-------|-------|
| Expanded (desktop) | `w-64` (256px) | Full labels visible |
| Collapsed (desktop) | `w-[68px]` | Icons + padding |
| Mobile drawer | `w-[280px]` | Slightly wider for touch |

---

## Settings Page Patterns

### Responsive Card Container

Settings pages use a card that removes borders/shadow on mobile for edge-to-edge content:

```tsx
<Card className="border-0 shadow-none sm:border sm:shadow-sm">
  <CardHeader className="px-4 sm:px-6">
    {/* Header content */}
  </CardHeader>
  <CardContent className="px-4 sm:px-6">
    {/* Page content */}
  </CardContent>
</Card>
```

### Header with Icon Container

Page headers use a semantic colored icon container:

```tsx
<CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
  <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
    <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
  </div>
  {title}
</CardTitle>
```

**Semantic colors by section type:**
| Section | Background | Icon Color |
|---------|------------|------------|
| Branding/Appearance | `bg-purple-100 dark:bg-purple-900/30` | `text-purple-600 dark:text-purple-400` |
| Links/Connections | `bg-blue-100 dark:bg-blue-900/30` | `text-blue-600 dark:text-blue-400` |
| Email/Notifications | `bg-emerald-100 dark:bg-emerald-900/30` | `text-emerald-600 dark:text-emerald-400` |
| Security/Roles | `bg-rose-100 dark:bg-rose-900/30` | `text-rose-600 dark:text-rose-400` |

### Grid-Based Tab System

Replace horizontal scrolling tabs with a proper grid:

```tsx
<TabsList className="w-full h-auto p-1 grid grid-cols-3 gap-1 mb-6">
  <TabsTrigger
    value="tab1"
    className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3
               data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
  >
    <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/30">
      <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-600 dark:text-purple-400" />
    </div>
    <span className="text-xs sm:text-sm font-medium hidden xs:inline">{fullLabel}</span>
    <span className="text-xs font-medium xs:hidden">{shortLabel}</span>
  </TabsTrigger>
</TabsList>
```

**Key elements:**
- Grid with equal columns: `grid grid-cols-3 gap-1`
- Icon in colored container within each tab
- Responsive labels: full on `xs:` and up, short below

### Section Headers with Dividers

Use border-bottom section headers within tab content:

```tsx
<div className="space-y-4">
  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
      Section Title
    </h3>
  </div>
  {/* Section content */}
</div>
```

### Toggle Cards (Settings Fields)

Wrap form fields with toggles in rounded cards:

```tsx
<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
  <div className="flex items-center justify-between">
    <Label htmlFor="fieldId" className="text-sm font-medium">
      {fieldLabel}
    </Label>
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </span>
      <Switch checked={isVisible} onCheckedChange={setIsVisible} disabled={!isEditing} />
    </div>
  </div>
  <Input
    id="fieldId"
    value={value}
    onChange={onChange}
    disabled={!isEditing || !isVisible}
    className="bg-white dark:bg-slate-900"
  />
  <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
</div>
```

### Master Toggle Card

For feature-wide toggles, use an accent-colored card:

```tsx
<div className="flex items-center justify-between p-4 rounded-xl
                bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
      <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    </div>
    <div>
      <Label className="text-sm font-medium">{toggleLabel}</Label>
      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  </div>
  <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
</div>
```

### Platform/Brand Icons

Each platform gets a semantic color:

```tsx
const PLATFORM_ICONS = {
  github: {
    icon: Github,
    bg: 'bg-slate-200 dark:bg-slate-700',
    color: 'text-slate-700 dark:text-slate-300',
  },
  twitter: {
    icon: Twitter,
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    color: 'text-sky-600 dark:text-sky-400',
  },
  discord: {
    icon: MessageCircle,
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    color: 'text-indigo-600 dark:text-indigo-400',
  },
  docs: {
    icon: BookOpen,
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    color: 'text-amber-600 dark:text-amber-400',
  },
};

// Usage
<div className={`p-1.5 rounded-md ${platform.bg}`}>
  <platform.icon className={`h-4 w-4 ${platform.color}`} />
</div>
```

### Preview Cards with Header

For previews (logo, email, etc.), use a card with distinct header:

```tsx
<div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
  {/* Header */}
  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
      {previewTitle}
    </h4>
  </div>

  {/* Content */}
  <div className="p-4 bg-white dark:bg-slate-900">
    {previewContent}
  </div>
</div>
```

### Email Preview Pattern

Realistic email preview with gradient header and footer:

```tsx
<div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
  {/* Email Header - Gradient */}
  <div className="bg-gradient-to-r from-emerald-50 to-slate-50
                  dark:from-emerald-950/30 dark:to-slate-800
                  px-4 py-3 border-b border-slate-200 dark:border-slate-700">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
        <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">From</p>
        <p className="font-medium text-sm text-slate-800 dark:text-slate-200">
          {senderName}
        </p>
      </div>
    </div>
  </div>

  {/* Email Body */}
  <div className="p-5 bg-white dark:bg-slate-900">
    <div className="text-sm text-slate-500 dark:text-slate-400 italic py-8 text-center
                    border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
      [Email content will appear here...]
    </div>
  </div>

  {/* Email Footer */}
  <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50
                  border-t border-slate-200 dark:border-slate-700">
    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
      {footerText}
    </p>
  </div>
</div>
```

### Image Error Handling

Always handle broken image URLs gracefully:

```tsx
<img
  src={imageUrl}
  alt={altText}
  className="h-8 w-8 object-contain"
  onError={(e) => {
    (e.target as HTMLImageElement).style.display = 'none';
  }}
/>
```

---

## User Management Patterns

### Clickable User Cards with Reveal Actions

Mobile user cards should be fully tappable with a reveal-on-hover action menu:

```tsx
<div
  onClick={() => onUserUpdate(user)}
  className="group mb-3 rounded-lg border bg-card p-4 cursor-pointer
             transition-all duration-200 hover:shadow-md hover:border-primary/20
             active:scale-[0.99]"
>
  <div className="flex items-start justify-between gap-3">
    {/* User info */}
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <Avatar className="h-11 w-11 flex-shrink-0 ring-2 ring-background shadow-sm">
        <AvatarImage src={user.avatar} />
        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{user.full_name}</div>
        <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
      </div>
    </div>

    {/* Reveal-on-hover action menu */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(user); }}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); onDelete(user); }}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>
```

**Key elements:**
- Touch target `h-10 w-10` (40px) for mobile accessibility
- `active:scale-[0.99]` for tactile feedback on tap
- `ring-2 ring-background shadow-sm` on avatar for depth
- Both trigger and menu items need `stopPropagation()`

### Status Badge Helper Function

Extract status colors to a reusable helper:

```tsx
const getStatusBadgeClasses = (isActive: boolean): string => {
  return isActive
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
};

// Usage
<Badge variant="outline" className={getStatusBadgeClasses(user.isActive)}>
  {user.isActive ? "Active" : "Inactive"}
</Badge>
```

### Clickable Table Rows

Desktop tables can also be clickable with reveal-on-hover actions:

```tsx
<TableRow
  className="group cursor-pointer hover:bg-muted/30 transition-colors"
  onClick={() => onUserUpdate(user)}
>
  <TableCell>
    {/* Content */}
  </TableCell>
  <TableCell className="text-right">
    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={(e) => { e.stopPropagation(); onEdit(user); }}
      >
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  </TableCell>
</TableRow>
```

### Avatar Selection Grid

Responsive grid for selecting profile pictures:

```tsx
<RadioGroup
  value={selectedAvatar}
  onValueChange={setSelectedAvatar}
  className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3"
>
  {avatars.map((avatar) => {
    const isSelected = selectedAvatar === avatar.url;

    return (
      <FormItem key={avatar.url} className="flex flex-col items-center justify-center">
        <FormControl>
          <RadioGroupItem value={avatar.url} className="sr-only" />
        </FormControl>
        <label
          htmlFor={avatar.url}
          className={`
            relative cursor-pointer rounded-lg p-1 sm:p-1.5
            transition-all duration-200
            ${isSelected
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5"
              : "hover:bg-muted/50 hover:ring-2 hover:ring-muted"
            }
          `}
        >
          <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shadow-sm">
            <AvatarImage src={avatar.url} />
            <AvatarFallback>?</AvatarFallback>
          </Avatar>

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          )}
        </label>
      </FormItem>
    );
  })}
</RadioGroup>
```

**Key elements:**
- Grid: `grid-cols-4 lg:grid-cols-8` for 4 per row mobile, 8 desktop
- Avatar sizing: `h-12 w-12 sm:h-14 sm:w-14`
- Selection ring: `ring-2 ring-primary ring-offset-2`
- Checkmark badge: absolute positioned circle with `Check` icon

### Dialog with Semantic Header Icons

Each dialog type gets a semantic colored icon:

```tsx
// Add User Dialog - Emerald (create action)
<DialogTitle className="flex items-center gap-2 text-lg">
  <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
    <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
  </div>
  Add New User
</DialogTitle>

// Edit User Dialog - Blue (view/update action)
<DialogTitle className="flex items-center gap-2 text-lg">
  <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
    <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  </div>
  Edit User
</DialogTitle>

// Delete Dialog - Rose (destructive action)
<DialogTitle className="flex items-center gap-2 text-lg">
  <div className="p-1.5 rounded-md bg-rose-100 dark:bg-rose-900/30">
    <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
  </div>
  Delete User
</DialogTitle>
```

### Dialog Footer with Background

Footer should have subtle background for visual separation:

```tsx
<div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t bg-muted/30">
  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
    <Button variant="outline" className="w-full sm:w-auto">
      Cancel
    </Button>
    <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
      Create User
    </Button>
  </div>
</div>
```

**Key elements:**
- `bg-muted/30` for subtle background
- `border-t` for separation
- Buttons: `w-full sm:w-auto` for full-width on mobile
- `flex-col-reverse` so primary action is first on mobile

---

## Reference Implementation

See these files for complete examples:

- `/src/components/settings/role-management/RoleList.tsx` - Clickable cards with dropdown actions
- `/src/components/settings/role-management/RoleDialog.tsx` - Scrollable dialog with expandable sections
- `/src/components/settings/role-management/UserRoleAssignment.tsx` - User cards with avatar, badge overflow, conditional borders
- `/src/components/settings/branding/BrandingSettings.tsx` - Settings page with tabs, toggle cards, platform icons, email preview
- `/src/components/settings/user-management/UserTable.tsx` - Clickable cards/rows with reveal-on-hover actions
- `/src/components/settings/user-management/UserProfilePictureField.tsx` - Avatar selection grid with checkmark indicator
- `/src/components/settings/user-management/EditUserDialog.tsx` - Dialog with semantic header icon and footer background
- `/src/components/dashboard/Sidebar.tsx` - Desktop/mobile sidebar with proper theming
- `/src/components/dashboard/sidebar/MenuItem.tsx` - Active state with left accent border, tooltips
- `/src/components/dashboard/sidebar/SettingsPanel.tsx` - Collapsible navigation section

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
