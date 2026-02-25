---

description: 'Generate new components or update existing ones based on the current stack and design guidelines.'
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'agent', 'todo']
---

# 🧠 Agent Development Guidelines

## 1. Core Stack (Do Not Deviate)

You are building using:

* **Svelte 5.43.14**
* **tRPC**
* **Prisma ORM**
* **SQLite**
* **TailwindCSS**
* **shadcn-svelte components**

Do not introduce alternative frameworks unless explicitly requested.

No React.
No Drizzle.
No other ORMs.
No REST when tRPC is available.
No CSS frameworks other than Tailwind.

---

## 2. UI & Styling Rules

### 🎨 Color System (Critical Rule)

Always use the colors defined in:

```
src/app.css
```

When generating or updating components:

* Never hardcode random Tailwind colors like `bg-blue-500`
* Always use design tokens / CSS variables defined in `app.css`
* Respect:

  * `--background`
  * `--foreground`
  * `--primary`
  * `--secondary`
  * `--muted`
  * `--accent`
  * `--destructive`
  * etc.

Example:

```html
<div class="bg-background text-foreground">
```

Not:

```html
<div class="bg-gray-900 text-white">
```

If unsure about a color → inspect `src/app.css` first.

---

## 3. Icons (Lucide Only)

### ✅ Icon Source Rule (Strict)

**Only use Lucide icons** (via `lucide-svelte`).
Do not use any other icon libraries (Heroicons, Phosphor, FontAwesome, Remix, Radix icons, custom SVG packs) unless explicitly requested.

### 📦 Installation

If icons are needed and the package is missing:

```bash
bun add lucide-svelte
```

### 🧩 Usage Rules

* Import icons only from `lucide-svelte`
* Use consistent sizing (default **16–20px** for UI icons)
* Prefer `class="h-4 w-4"` or `class="h-5 w-5"` for sizing
* Icons must inherit color (don’t hardcode colors); rely on semantic text classes like `text-muted-foreground`

Example:

```svelte
<script lang="ts">
  import { Search, Plus, Trash2 } from "lucide-svelte";
</script>

<button class="inline-flex items-center gap-2">
  <Plus class="h-4 w-4" />
  Create
</button>
```

### ❌ Not Allowed

* Inline SVG blobs pasted directly (unless explicitly required)
* Any icon component not coming from `lucide-svelte`

---

## 4. Component System (shadcn-svelte Only)

We use **shadcn-svelte** components.

If a needed component is not installed:

```bash
bun x shadcn-svelte@latest add <component-name>
```

Only create custom components when:

* The component does not exist in shadcn
* It must be heavily customized

Otherwise, always prefer the official component.

### Available Components

You may use:

Accordion
Alert Dialog
Alert
Aspect Ratio
Avatar
Badge
Breadcrumb
Button Group
Button
Calendar
Card
Carousel
Chart
Checkbox
Collapsible
Combobox
Command
Context Menu
Data Table
Date Picker
Dialog
Drawer
Dropdown Menu
Empty
Field
Form
Hover Card
Input Group
Input OTP
Input
Item
Kbd
Label
Menubar
Native Select
Navigation Menu
Pagination
Popover
Progress
Radio Group
Range Calendar
Resizable
Scroll Area
Select
Separator
Sheet
Sidebar
Skeleton
Slider
Sonner
Spinner
Switch
Table
Tabs
Textarea
Toggle Group
Toggle
Tooltip
Typography

---

## 5. Svelte 5 Rules

Use **Svelte 5 syntax** properly:

* Use runes correctly
* Avoid legacy patterns
* Keep components reactive
* Use `$state`, `$derived`, `$effect` when appropriate

Do not write Svelte 3-style code.

---

## 6. tRPC Rules

* All server communication must go through **tRPC**
* No direct fetch calls to backend routes
* Validate inputs
* Keep routers modular
* Use proper procedure types (`publicProcedure`, `protectedProcedure`)

---

## 7. Prisma + SQLite Rules

* Use Prisma schema definitions in `prisma/schema.prisma`
* Keep schema centralized
* Use migrations with `prisma migrate dev`
* Never write raw SQL unless absolutely required
* Always type queries properly with Prisma Client

Bad:

```ts
db.$queryRaw`SELECT * FROM users`
```

Good:

```ts
db.user.findMany()
```

### Account Model Architecture

The database uses a **unified Account model** with platform-specific data stored in `jsonData`:

```prisma
model Account {
  id        Int      @id @default(autoincrement())
  name      String
  platform  String   // "instagram" or "youtube"
  jsonData  String   // JSON string with platform-specific fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Instagram jsonData structure:**
```json
{
  "instagramBusinessId": "string",
  "accessToken": "string",
  "expiresAt": "ISO date string"
}
```

**YouTube jsonData structure:**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiryDate": number,
  "clientId": "string"
}
```

When working with accounts:
- Always filter by `platform` when querying
- Parse `jsonData` with `JSON.parse()` to access platform-specific fields
- Stringify data with `JSON.stringify()` when updating
- Use TypeScript interfaces for type safety when parsing jsonData

---

## 8. Component Architecture

When generating new UI:

* Prefer composition over large monolithic components
* Extract reusable components
* Keep logic separated from layout
* Avoid deeply nested markup

---

## 9. Forms

* Use shadcn `Form` components
* Validate inputs
* Show proper error states
* Follow consistent spacing
* Use Tailwind utility classes properly

---

## 10. Layout Principles

* Use Tailwind spacing scale consistently
* Respect dark mode
* Use responsive design
* Keep padding consistent (`p-4`, `p-6`, `gap-4`, etc.)
* Avoid arbitrary values unless necessary

---

## 11. Dark Mode

* All components must support dark mode
* Never hardcode light-only colors
* Use semantic classes (`bg-card`, `text-muted-foreground`, etc.)

---

## 12. Data Tables

When generating tables:

* Prefer `Data Table` component
* Add loading states
* Add empty states
* Add pagination if dataset can grow

---

## 13. Loading States

Always include:

* Skeletons for content loading
* Spinner for actions
* Disabled states for buttons

---

## 14. UX Consistency

* Use **Dialog** for all prompts, forms, and destructive confirmations
* Use **svelte-sonner** for all toast notifications:
  * Success messages: `toast.success('Item created successfully!')`
  * Error messages: `toast.error('Failed to delete item')`
  * Info messages: `toast.info('Processing...')`
  * Warning messages: `toast.warning('Are you sure?')`
* Use consistent icon sizing (see Lucide rules)
* Use consistent border radius
* Use `Card` for content grouping

### 📢 Notification Pattern (Required)

Always import and use toast notifications:

```svelte
<script lang="ts">
  import { toast } from 'svelte-sonner';
  
  async function createItem() {
    try {
      await trpc.items.create.mutate(data);
      toast.success('Item created successfully!');
    } catch (error) {
      toast.error('Failed to create item');
    }
  }
  
  async function deleteItem(id: number) {
    try {
      await trpc.items.delete.mutate({ id });
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  }
</script>
```

### 📝 Form/Prompt Pattern (Required)

Always use Dialog for forms and user inputs:

```svelte
<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  
  let isOpen = $state(false);
</script>

<Dialog.Root bind:open={isOpen}>
  <Dialog.Trigger asChild>
    <Button>Create Item</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Create New Item</Dialog.Title>
      <Dialog.Description>Enter item details</Dialog.Description>
    </Dialog.Header>
    <!-- Form fields here -->
    <Dialog.Footer>
      <Button variant="outline" onclick={() => isOpen = false}>Cancel</Button>
      <Button onclick={handleSubmit}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

**Never** use:
- Browser `alert()`, `confirm()`, or `prompt()`
- Inline forms without Dialog wrapper
- console.log for user feedback

---

## 15. Animations (Svelte Luxe)

### 🎬 Animation Library

Use **Svelte Luxe** components for polished, professional animations throughout the application.

**Browse components:** [https://animation-svelte.vercel.app/luxe](https://animation-svelte.vercel.app/luxe)
**Usage guide:** [https://animation-svelte.vercel.app/luxe/usage](https://animation-svelte.vercel.app/luxe/usage)

### 📦 Installation

Add required Tailwind config animations and keyframes to `tailwind.config.ts` (see usage guide).

### 🎨 Available Components

Use these copy-paste components where appropriate:

**Tabs & Navigation:**
- [Animated Tabs](https://animation-svelte.vercel.app/luxe/animated-tabs) - Use for tab interfaces
- [Dock Menu](https://animation-svelte.vercel.app/luxe/dock-menu) - macOS-style dock navigation
- [Dropdown Menu](https://animation-svelte.vercel.app/luxe/dropdown-menu) - Animated dropdowns

**Buttons:**
- [Button Loading](https://animation-svelte.vercel.app/luxe/button-loading) / [v2](https://animation-svelte.vercel.app/luxe/button-loading-v2) - Loading states
- [Button Success](https://animation-svelte.vercel.app/luxe/button-success) / [v2](https://animation-svelte.vercel.app/luxe/button-success-v2) - Success feedback
- [Button Destructive](https://animation-svelte.vercel.app/luxe/button-destructive) / [v2](https://animation-svelte.vercel.app/luxe/button-destructive-v2) - Delete actions
- [Button Animated Border](https://animation-svelte.vercel.app/luxe/button-animated-border) - Hover effects
- [Button Background Shine](https://animation-svelte.vercel.app/luxe/button-background-shine) - Shine effect
- [Button Rotate Border](https://animation-svelte.vercel.app/luxe/button-rotate-border) - Rotating border
- [Button Magnetic](https://animation-svelte.vercel.app/luxe/button-magnetic) - Magnetic hover
- [Button Glitch Brightness](https://animation-svelte.vercel.app/luxe/button-glitch-brightness) - Glitch effect

**Cards:**
- [Card Animated Border](https://animation-svelte.vercel.app/luxe/card-animated-border) - Border animations
- [Card Background Shine](https://animation-svelte.vercel.app/luxe/card-background-shine) - Shine effect
- [Card Revealed Pointer](https://animation-svelte.vercel.app/luxe/card-revealed-pointer) - Pointer reveal
- [Card Hover Effect](https://animation-svelte.vercel.app/luxe/card-hover-effect) - Hover interactions
- [Card Product](https://animation-svelte.vercel.app/luxe/card-product) - Product showcases
- [Card Comment](https://animation-svelte.vercel.app/luxe/card-comment) - Testimonials/comments

**Badges:**
- [Badge Animated Border](https://animation-svelte.vercel.app/luxe/badge-animated-border) - Animated borders
- [Badge Background Shine](https://animation-svelte.vercel.app/luxe/badge-background-shine) - Shine effect
- [Badge Rotate Shine](https://animation-svelte.vercel.app/luxe/badge-rotate-shine) - Rotating shine

**Inputs:**
- [Input Spotlight Border](https://animation-svelte.vercel.app/luxe/input-spotlight-border) - Spotlight effect
- [Input Gradient Border](https://animation-svelte.vercel.app/luxe/input-gradient-border) - Gradient borders
- [Input Pulse Border](https://animation-svelte.vercel.app/luxe/input-pulse-border) - Pulsing borders

**Text Effects:**
- [Text Generate Effect](https://animation-svelte.vercel.app/luxe/text-generate-effect) - Typewriter effect
- [Text Shine](https://animation-svelte.vercel.app/luxe/text-shine) - Shine animation
- [Text Gradient](https://animation-svelte.vercel.app/luxe/text-gradient) - Animated gradients
- [Text Animated Gradient](https://animation-svelte.vercel.app/luxe/text-animated-gradient) - Moving gradient
- [Text Hover Enter](https://animation-svelte.vercel.app/luxe/text-hover-enter) - Hover transitions
- [Text Animated Decoration](https://animation-svelte.vercel.app/luxe/text-animated-decoration) - Underline effects
- [Text Glitch](https://animation-svelte.vercel.app/luxe/text-glitch) - Glitch effects
- [Text Shake](https://animation-svelte.vercel.app/luxe/text-shake) - Shake animation

### ✨ When to Use

Apply Luxe animations to enhance UX:

- **Loading states** - Use Button Loading or spinners
- **Tab navigation** - Use Animated Tabs
- **Form submissions** - Use Button Success/Destructive for feedback
- **Card grids** - Add hover effects and shine
- **Important CTAs** - Add button animations for emphasis
- **Input focus** - Use animated input borders
- **Headers/titles** - Apply text effects for visual interest
- **Badges/labels** - Animate status indicators

### 🚫 Don't Overuse

- Keep animations subtle and purposeful
- Don't animate every element
- Respect user motion preferences
- Maintain performance

### 📋 Implementation Pattern

1. Visit [Luxe components](https://animation-svelte.vercel.app/luxe)
2. Find appropriate component
3. Copy the component code
4. Paste into your Svelte file
5. Ensure Tailwind animations are configured

Example:
```svelte
<script>
  // Copy component code from Luxe docs
</script>

<!-- Use the animated component -->
<ButtonLoading loading={isSubmitting}>
  Save Changes
</ButtonLoading>
```

---

## 16. Code Quality Rules

* No unused imports
* No console.logs in production code
* Strict typing
* No `any` types unless unavoidable
* Clean formatting

---

## 17. When Creating New Components

Before creating:

1. Check if it exists in shadcn
2. If yes → install and use it
3. If not → follow existing component patterns
4. Respect `app.css` design tokens
5. Use **Lucide icons only**
6. Keep styling semantic

---

## 18. What You Must Always Consider

Before generating anything, ask internally:

* Does this follow Svelte 5?
* Does this use tRPC correctly?
* Does this respect `app.css` colors?
* Is this using shadcn components?
* Are icons **Lucide-only**?
* Is dark mode supported?
* Is it typed properly?
* Are forms wrapped in **Dialog**?
* Are notifications using **svelte-sonner** (not alert/console)?
* Can animations from **Svelte Luxe** enhance the UX here?
* Are loading states using animated buttons/spinners?

If any answer is no → fix it before output.

---9

## 18. Toast Notifications Reference

Import and use throughout your app:

```typescript
import { toast } from 'svelte-sonner';

// Success states
toast.success('Workflow created successfully!');
toast.success('Video uploaded to Instagram');

// Error states
toast.error('Failed to save preset');
toast.error('Invalid credentials');

// Info states
toast.info('Processing video...');
toast.info('Workflow queued');

// Warning states
toast.warning('Low storage space');
```

**Toaster** is already added to `+layout.svelte` - just import `toast` and use it.
