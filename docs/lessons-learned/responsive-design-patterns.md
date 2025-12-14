# Responsive Design Patterns - Lessons Learned

## Overview

This document captures the lessons learned from implementing responsive/mobile support across the CheckCle application. These patterns should be followed for all future UI development to ensure consistent mobile experience.

## Key Breakpoints

The application uses Tailwind CSS breakpoints:
- `sm`: 640px (small tablets)
- `md`: 768px (tablets/small laptops)
- `lg`: 1024px (laptops/desktops)
- `xl`: 1280px (large screens)

**Primary breakpoint for mobile vs desktop: `md` (768px)**

---

## Pattern 1: Responsive Grids for Stat Cards

### Problem
Stat cards using `grid-cols-4` overflow on mobile screens, making content unreadable.

### Solution
Use 2-column grid on mobile, expanding to 4 columns on larger screens.

```tsx
// BAD
<div className="grid grid-cols-4 gap-6">

// GOOD
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
```

### Additional Considerations
- Reduce gap on mobile: `gap-3 md:gap-6`
- Reduce padding inside cards: `p-3 md:p-6`
- Reduce font sizes: `text-xl md:text-2xl` or `text-3xl md:text-5xl`

---

## Pattern 2: Mobile Card View for Tables

### Problem
Data tables with many columns become unusable on mobile - horizontal scrolling is a poor UX.

### Solution
Create a separate mobile card view that shows the same data in a stacked card format.

```tsx
// Mobile Card View
<div className="md:hidden space-y-3">
  {data.map((item) => (
    <Card key={item.id} className="p-3">
      <div className="font-medium truncate">{item.name}</div>
      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
        <div>Label: <Badge>{item.value}</Badge></div>
        {/* ... more fields */}
      </div>
    </Card>
  ))}
</div>

// Desktop Table View
<div className="hidden md:block">
  <Table>
    {/* ... table content */}
  </Table>
</div>
```

### Key Points
- Use `md:hidden` for mobile-only content
- Use `hidden md:block` for desktop-only content
- Mobile cards should show the most important information first
- Use 2-column grid inside cards for key-value pairs
- Truncate long text with `truncate` class

---

## Pattern 3: Responsive Headers and Toolbars

### Problem
Headers with multiple elements (title, buttons, filters) overflow on mobile.

### Solution
Stack elements vertically on mobile, horizontal on desktop.

```tsx
// BAD
<div className="flex justify-between items-center">

// GOOD
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
```

### For Filter/Action Bars
```tsx
<div className="flex flex-col sm:flex-row gap-3">
  <Select>
    <SelectTrigger className="w-full sm:w-[180px]">
      {/* ... */}
    </SelectTrigger>
  </Select>

  <div className="flex gap-2">
    <Button className="flex-1 sm:flex-none">Action</Button>
  </div>
</div>
```

---

## Pattern 4: Responsive Text and Labels

### Problem
Long labels and descriptions don't fit on mobile screens.

### Solution
1. Use shorter text on mobile
2. Hide non-essential text
3. Truncate with ellipsis

```tsx
// Show short version on mobile, full on desktop
<p className="hidden sm:block">Largest Contentful Paint</p>
<p className="sm:hidden">LCP</p>

// Or use responsive text sizes
<h1 className="text-xl md:text-2xl font-bold truncate">
  {title}
</h1>

// Hide non-essential elements on mobile
<span className="hidden md:inline">Last checked: {time}</span>
```

---

## Pattern 5: Responsive Tabs

### Problem
Tab labels overflow when there are many tabs.

### Solution
Show icons only on mobile, icons + text on desktop.

```tsx
<TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
  <TabsTrigger className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
    <Icon className="h-4 w-4" />
    <span className="hidden sm:inline">{label}</span>
  </TabsTrigger>
</TabsList>
```

---

## Pattern 6: Prevent Flex Overflow

### Problem
Flex containers with long content cause horizontal overflow.

### Solution
Add `min-w-0` to flex children that contain text.

```tsx
<div className="flex items-center gap-4">
  <div className="min-w-0 flex-1">
    <h2 className="truncate">{longTitle}</h2>
    <p className="text-sm text-muted-foreground truncate">{longUrl}</p>
  </div>
  <Button className="flex-shrink-0">Action</Button>
</div>
```

### Key Classes
- `min-w-0`: Allows flex child to shrink below content size
- `flex-1`: Takes remaining space
- `flex-shrink-0`: Prevents element from shrinking
- `truncate`: Adds ellipsis for overflow text

---

## Pattern 7: Responsive Padding and Spacing

### Problem
Desktop padding looks excessive on mobile.

### Solution
Use responsive padding throughout.

```tsx
// Page containers
<div className="p-4 md:p-6 space-y-4 md:space-y-6">

// Card content
<CardHeader className="p-3 md:p-6">
<CardContent className="p-3 pt-0 md:p-6 md:pt-0">

// Gaps
<div className="gap-3 md:gap-6">
```

---

## Pattern 8: Responsive Badges and Status Indicators

### Problem
Multiple badges in a row overflow on mobile.

### Solution
Stack badges or limit the number shown.

```tsx
// Stack on mobile
<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
  <span className="text-xl font-bold">{value}</span>
  <Badge className="w-fit">{status}</Badge>
</div>

// Limit items shown
<div className="flex flex-wrap gap-1">
  {items.slice(0, 3).map((item) => (
    <Badge key={item}>{item}</Badge>
  ))}
  {items.length > 3 && (
    <Badge>+{items.length - 3}</Badge>
  )}
</div>
```

---

## Checklist for New Components

Before submitting any new UI component, verify:

- [ ] Stat card grids use `grid-cols-2 lg:grid-cols-4`
- [ ] Tables have mobile card alternatives
- [ ] Headers/toolbars stack on mobile (`flex-col sm:flex-row`)
- [ ] Long text uses `truncate` class
- [ ] Flex containers use `min-w-0` on text children
- [ ] Padding is responsive (`p-3 md:p-6`)
- [ ] Font sizes are responsive (`text-xl md:text-2xl`)
- [ ] Non-essential content hidden on mobile (`hidden md:block`)
- [ ] Tested on 375px width (iPhone SE) viewport

---

## Components Fixed in This Update

### Dashboard/Overview
- `StatusCards.tsx` - 2-column grid on mobile
- `ServicesTableView.tsx` - Mobile card view
- `ServiceFilters.tsx` - Stacking filters
- `ServicesPagination.tsx` - Responsive layout
- `Header.tsx` - Hidden buttons, truncated greeting

### Performance Pages
- `PerformanceContent.tsx` - Responsive tabs
- `PerformanceDashboard.tsx` - Cards + mobile table view
- `PerformanceTestList.tsx` - Responsive test cards
- `PerformanceDetailView.tsx` - Responsive header, tabs
- `CoreWebVitalsCard.tsx` - 2-column grid, smaller text
- `BudgetList.tsx` - Responsive header and grid
- `PerformanceReports.tsx` - Responsive filters and summary
- `CoachScoreCard.tsx` - Responsive sub-scores grid
- `DetailedMetricsCard.tsx` - Responsive category grid

### Other Pages
- `DockerStatsCards.tsx` - 2-column grid
- `SSLCertificateStatusCards.tsx` - Responsive grid and text
- `ServerStatsCards.tsx` - 2-column grid
- `ServerMetricsOverview.tsx` - Responsive grid
- `MaintenanceTable.tsx` - Mobile card view
- `IncidentTable.tsx` - Mobile card view
- `UserTable.tsx` - Mobile card view
- `UptimeReports.tsx` - Responsive controls and table
- `IncidentReports.tsx` - Responsive controls and grid
- `StatusPageHeader.tsx` - Responsive header
- `ComponentsStatusSection.tsx` - Responsive component cards
- `PublicStatusPage.tsx` - Responsive padding

---

## Pattern 9: Mobile Sidebar with Sheet/Drawer

### Problem
Desktop sidebars don't work well on mobile - they either take up too much space or collapse to just icons, hiding important navigation options.

### Solution
Hide the desktop sidebar completely on mobile and use a slide-out Sheet/Drawer component that opens from a hamburger menu button.

```tsx
// Sidebar.tsx
import { Sheet, SheetContent } from "@/components/ui/sheet";

export const Sidebar = ({ mobileOpen, onMobileClose }) => {
  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:flex flex-col h-full w-64">
        <SidebarHeader />
        <MainNavigation />
        <SettingsPanel />
      </div>

      {/* Mobile Sidebar - Sheet/Drawer */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="p-0 w-64 flex flex-col overflow-hidden">
          <div className="flex flex-col h-full overflow-hidden">
            <SidebarHeader />
            <div className="flex-1 overflow-y-auto">
              <MainNavigation onItemClick={onMobileClose} />
              <SettingsPanel onItemClick={onMobileClose} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
```

### Key Points
1. **Hide desktop sidebar on mobile**: Use `hidden md:flex`
2. **Use Sheet component**: Provides native-feeling slide-out drawer
3. **Make content scrollable**: Add `overflow-y-auto` to content area, `overflow-hidden` to container
4. **Auto-close on navigation**: Pass `onItemClick` callback through navigation hierarchy
5. **Separate toggle buttons**: Use hamburger menu on mobile, collapse/expand on desktop

```tsx
// Header.tsx
<Button onClick={toggleMobile} className="md:hidden">
  <Menu className="h-5 w-5" />
</Button>
<Button onClick={toggleSidebar} className="hidden md:flex">
  {collapsed ? <PanelLeft /> : <PanelLeftClose />}
</Button>
```

### Context State for Mobile Sidebar
```tsx
// SidebarContext.tsx
interface SidebarContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}
```

---

## Pattern 10: Horizontal Scrolling Tabs

### Problem
When there are many tabs (5+), they overflow or compress too much on mobile.

### Solution
Use horizontal scroll container on mobile, grid layout on desktop.

```tsx
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
  <TabsList className="inline-flex w-auto min-w-full md:w-full md:grid md:grid-cols-8">
    <TabsTrigger value="all" className="text-xs md:text-sm whitespace-nowrap">
      All
    </TabsTrigger>
    <TabsTrigger value="telegram" className="text-xs md:text-sm whitespace-nowrap">
      Telegram
    </TabsTrigger>
    {/* ... more tabs */}
  </TabsList>
</div>
```

### Key Classes
- `overflow-x-auto`: Enables horizontal scrolling
- `-mx-4 px-4`: Extends scroll area to screen edge on mobile
- `md:mx-0 md:px-0`: Removes extension on desktop
- `inline-flex w-auto min-w-full`: Allows tabs to expand naturally
- `md:grid md:grid-cols-N`: Grid layout on desktop
- `whitespace-nowrap`: Prevents text wrapping in tabs

---

## Pattern 11: Responsive List Items

### Problem
List items with title, metadata, and actions don't fit well on mobile.

### Solution
Stack content vertically and move actions to a separate row.

```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 gap-3 border rounded-lg">
  {/* Content */}
  <div className="space-y-1 min-w-0">
    <div className="flex items-center gap-2 flex-wrap">
      <h3 className="font-medium text-sm md:text-base truncate">{title}</h3>
      <Badge className="text-xs">{type}</Badge>
    </div>
    <p className="text-xs md:text-sm text-muted-foreground">
      Created: {date}
      <span className="hidden sm:inline"> - Updated: {updated}</span>
    </p>
  </div>

  {/* Actions - align to end on mobile */}
  <div className="flex items-center space-x-2 self-end sm:self-auto">
    <Button size="sm" className="h-8 text-xs md:text-sm">
      <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
      Edit
    </Button>
  </div>
</div>
```

---

## Settings Pages Fixed

### Components Updated
- `GeneralSettingsPanel.tsx` - Responsive tabs and buttons
- `UserManagement.tsx` - Responsive accordion and header
- `NotificationSettings.tsx` - Horizontal scrolling tabs, responsive header
- `AlertsTemplates.tsx` - Horizontal scrolling tabs, responsive buttons
- `DataRetentionSettings.tsx` - Responsive grid inputs
- `AboutSystem.tsx` - Responsive grid and card padding
- `NotificationChannelList.tsx` - Mobile card view for channels
- `TemplateList.tsx` - Responsive list items

### Sidebar Components Updated
- `Sidebar.tsx` - Desktop/mobile split with Sheet drawer
- `MainNavigation.tsx` - Pass through onItemClick callback
- `MenuItem.tsx` - Trigger close on navigation
- `SettingsPanel.tsx` - Trigger close on navigation, always expanded

---

## Testing Recommendations

1. **Browser DevTools**: Test at 375px width (iPhone SE) as minimum
2. **Real Devices**: Test on actual mobile devices when possible
3. **Orientation**: Test both portrait and landscape modes
4. **Touch Targets**: Ensure buttons are at least 44x44px for touch
5. **Navigation Flow**: Test that mobile sidebar closes after clicking menu items
6. **Scroll Behavior**: Test that long content is scrollable in mobile drawers

---

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [MDN Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Radix UI Sheet/Drawer](https://www.radix-ui.com/docs/primitives/components/dialog)
