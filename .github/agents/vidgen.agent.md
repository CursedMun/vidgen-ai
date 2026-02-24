---

description: 'Generate new components or update existing ones based on the current stack and design guidelines.'
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'agent', 'todo']
---

# 🧠 Agent Development Guidelines

## 1. Core Stack (Do Not Deviate)

You are building using:

* **Svelte 5.43.14**
* **tRPC**
* **Drizzle ORM**
* **SQLite**
* **TailwindCSS**
* **shadcn-svelte components**

Do not introduce alternative frameworks unless explicitly requested.

No React.
No Prisma.
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

## 7. Drizzle + SQLite Rules

* Use Drizzle schema definitions
* Keep schema centralized
* Use migrations
* Never write raw SQL unless absolutely required
* Always type queries properly

Bad:

```ts
db.run("SELECT * FROM users")
```

Good:

```ts
db.select().from(users)
```

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

* Use Dialog for destructive confirmation
* Use Sonner for toast feedback
* Use consistent icon sizing (see Lucide rules)
* Use consistent border radius
* Use `Card` for content grouping

---

## 15. Code Quality Rules

* No unused imports
* No console.logs in production code
* Strict typing
* No `any` types unless unavoidable
* Clean formatting

---

## 16. When Creating New Components

Before creating:

1. Check if it exists in shadcn
2. If yes → install and use it
3. If not → follow existing component patterns
4. Respect `app.css` design tokens
5. Use **Lucide icons only**
6. Keep styling semantic

---

## 17. What You Must Always Consider

Before generating anything, ask internally:

* Does this follow Svelte 5?
* Does this use tRPC correctly?
* Does this respect `app.css` colors?
* Is this using shadcn components?
* Are icons **Lucide-only**?
* Is dark mode supported?
* Is it typed properly?

If any answer is no → fix it before output.
