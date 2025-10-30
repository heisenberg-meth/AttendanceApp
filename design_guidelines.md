# Employee Attendance & Leave Management PWA - Design Guidelines

## Design Principles & System
**Approach**: Material Design with custom palette for data-dense business application
**Core Values**: Clarity over decoration, instant feedback, consistent hierarchy, mobile-first

---

## Visual Foundation

### Color Palette
```css
--bg-primary: #FFFFFF;
--text-primary: #000000;
--text-secondary: #666666;
--text-caption: #999999;
--accent: #B39DDB;           /* Interactive elements */
--success: #66BB6A;          /* Approvals, check-ins */
--warning: #FFA726;          /* Pending states */
--error: #EF5350;            /* Rejections, check-outs */
--border: #E0E0E0;
--bg-subtle: #FAFAFA;
--accent-light: #E8DFF5;     /* Backgrounds, empty states */
```

### Typography (Inter font)
```css
H1: 28px/Bold(700)/-0.5px    /* Page titles */
H2: 22px/Semibold(600)       /* Section headers */
H3: 18px/Semibold(600)       /* Card headers */
Body: 16px/Regular(400)/1.5  /* Primary text */
Secondary: 14px/Regular(400) /* Metadata, labels */
Caption: 12px/Regular(400)   /* Timestamps */
Button: 15px/Medium(500)/uppercase/0.5px
```

### Spacing Scale (Tailwind units)
- Component padding: **16px mobile, 24px desktop**
- Section spacing: **24px** between sections
- Form fields: **12px** between inputs
- Icon-text gap: **12px**

### Container Widths
- Superadmin: `max-w-7xl` (1280px)
- Employee views: `max-w-4xl` (896px)
- Mobile padding: **16px**, Desktop: **32px**

---

## Component Specifications

### Navigation
**Bottom Tab Bar** (Mobile, 64px height)
- 4 tabs: Attendance, Leaves, Chat, Profile
- Active: Purple icon/text + 3px top border
- Inactive: Gray (#999)

**Top App Bar** (56px height)
- Logo left, notification bell right
- White bg, 1px bottom border (#E0E0E0)
- Notification: 8px red dot

### Cards
**Standard Card**
```css
background: white;
border-radius: 12px;
padding: 16px;
box-shadow: 0 2px 8px rgba(0,0,0,0.08);
```

**Attendance Card**: Add 4px left border (green=in, red=out), 48px circular photo, status badge

**Leave Card**: Type badge top-left, status badge top-right (amber/green/red), date range, reason

**Dashboard Stats**: 32px bold number, 12px gray label, 24px purple icon top-right, hover lift (-2px)

### Forms & Inputs
**Text Input** (48px height)
```css
border: 1px solid #E0E0E0;
border-radius: 8px;
focus: 2px solid #B39DDB + purple glow;
error: red border + 12px error text below;
label: 12px gray above field;
```

**Buttons**
- **Primary**: Purple bg (#B39DDB), white text, 48px height, 8px radius, shadow `0 2px 4px rgba(179,157,219,0.3)`, hover darken 10%
- **Secondary**: Transparent bg, 1px purple border, purple text
- **FAB**: 56px circle, purple bg, bottom-right 16px, shadow `0 4px 12px rgba(179,157,219,0.4)`

**Camera Button** (Attendance): 72px purple circle, white icon (32px), bottom-center, scale 0.95 on press

### Chat Interface
**Message Bubbles** (max-width 80%)
- Employee: Purple bg, white text, right-aligned, 16px radius (sharp top-left)
- Admin: Light gray bg (#F5F5F5), black text, left-aligned, 16px radius (sharp top-right)
- Timestamp: 10px gray italic below

**Input Bar**: 56px fixed bottom, white bg, top border, text field + 40px purple send button

### Data Displays
**Table** (Superadmin)
- Alternating rows: white/#FAFAFA
- Header: Purple bg, white text, sticky
- Cell padding: 12px
- Photos: 40px circular thumbnails

**Leave Balance Bar**: Horizontal progress (purple used/gray remaining)

### Overlays
**Modal**: Centered, `rgba(0,0,0,0.5)` backdrop, white 16px radius box, max-width 480px/600px, padding 24px

**Toast**: 56px from top, 3s auto-dismiss
- Success: Green bg, checkmark
- Error: Red bg, alert icon

**Loader**: Full-screen `rgba(255,255,255,0.9)`, purple spinner (1.5s pulse/rotate)

---

## Animations

**Timing**
- Page transitions: Fade + slide up 20px (300ms ease-out)
- Tab switches: Cross-fade (200ms)
- Button press: Scale 0.95 (100ms)
- Toggles: 200ms ease
- Success check: 400ms draw animation

**Loader**: Custom purple gradient geometric shape, pulsing/rotating (1.5s), used for auth/uploads/reports

**Constraint**: Animations only for meaningful feedback, no decorative effects

---

## Images & Assets

**Hero Image** (Login): Abstract office silhouettes with attendance icons, 300px mobile/400px desktop, 10% purple overlay

**Profile Photos**
- Card thumbnail: 48px circular
- Detail view: 200px square
- Table: 40px circular
- Treatment: Rounded, subtle shadow, grayscale in lists

**Empty States**: 120px line illustrations in light purple (#E8DFF5)
- No attendance: Calendar with checkmark
- No leaves: Vacation icon
- No messages: Speech bubbles

**Dashboard Background**: 5% opacity geometric pattern (hexagons/dots), fixed, non-interfering

---

## Key Screen Layouts

**Login**: Centered 400px max-width, hero (300px) → logo (80px) → ID field → button → signup link, 24px gaps

**Onboarding**: Step indicator (purple active), single field/step, bottom button, top-left back button

**Home**: 3-column stats → "Mark Attendance" button → recent list (pull-to-refresh)

**Leaves**: 2-column balance cards → FAB (request) → tabs (Upcoming/History) → status cards

**Superadmin**: 240px left sidebar (purple active accent) → 3-column stats grid → filterable table with row-hover actions

---

## Accessibility Standards

✓ **Touch targets**: Minimum 44x44px  
✓ **Contrast**: WCAG AA (4.5:1) for all text  
✓ **Focus**: 2px purple outline for keyboard nav  
✓ **Aria-labels**: All icons and interactive elements  
✓ **Form errors**: Clear messages associated with fields  
✓ **Live regions**: Announce loading/state changes  

---

## Implementation Checklist

**Colors**: Use CSS variables for all palette colors  
**Typography**: Load Inter from Google Fonts with fallback `system-ui, -apple-system, sans-serif`  
**Grids**: Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` patterns  
**Spacing**: Stick to 12/16/24px scale (Tailwind 3/4/6 units)  
**States**: Always show loading, success, error states with appropriate animations  
**Mobile**: Test all touch targets, ensure one-handed use  
**Performance**: Optimize animations for 60fps on mobile devices