# 🧑‍💻 Frontend Specification: Super Admin Dashboard - "Antigravity" UI

**Project:** NewsFlux Super Admin Dashboard
**Aesthetic:** "Antigravity" (Floating/Glassmorphism) based on the Reference Dashboard Layout.
**Tech Stack:** React, CSS Modules / Styled Components, Recharts (for data visualization).

---

## 1. Global Aesthetic Rules ("Antigravity" Core)
The entire interface must feel like it is floating in zero gravity over a deep space background. 

### A. Background Container
- **Visuals:** A deep, dark, abstract cosmic gradient background (e.g., deep blues, purples, and pitch-black). 
- **Animation:** It should feature subtle, slow movement (a slow-panning nebula or shifting aurora) to emphasize infinite depth.

### B. Glassmorphism ("The Floating Slabs")
- **Rule:** ALL UI containers (Sidebar, Cards, Charts) must **NOT** be solid flat colors. They must be translucent glowing glass.
- **CSS Requirements:**
  ```css
  background: rgba(255, 255, 255, 0.03); /* Highly transparent layer */
  backdrop-filter: blur(20px); /* Heavy blur to simulate thick glass */
  -webkit-backdrop-filter: blur(20px);
  ```

### C. Borders
- **Rule:** A very thin, glowing 1px border with a gradient stroke to catch the ambient light.
- **CSS Example:** `border: 1px solid rgba(255, 255, 255, 0.1);`

### D. Depth & Shadows ("The Levitation")
- **Rule:** Elements must NOT look attached to the background. Use layered, colored shadows rather than standard black to create separation.
- **CSS Requirement:**
  ```css
  box-shadow: 
      0 20px 40px rgba(0,0,0,0.6), /* Standard deep shadow */
      0 0 30px rgba(102, 252, 241, 0.1); /* Colored ambient glow matching accent */
  ```

### E. Atmosphere
- Data visualizations, text, and icons should look like **glowing holograms** projected onto the glass surfaces. Use bright neon base colors against the dark glass.

---

## 2. React Component Structure & Layout (Reference Match)
The layout uses a left Sidebar and a flexible 3-row grid content area on the right logic.

### A. The Floating Sidebar Component (Left)
*Detached glass panel containing:*
1. **Header:** Brand Logo ("Quantico" style element) + ID (e.g., ID: CMP-1006).
2. **Navigation List:**
   - Home
   - Dashboard (Active with expanding tree):
     - Analytics (Selected)
     - Sales Overview
     - Top Products
     - Stock Status
   - Agencies
   - Workers
   - Customers
   - Billing
   - System Logs
   - Settings
3. **Bottom Widget:** A detached hover card for "Need setup help?". Include overlapping user avatars and a "Schedule a call" button.
*Interactivity:* List items glow on hover; the active state should project a brighter neon text shadow.

### B. The Main Content Area (Right Grid)
*Top navigation breadcrumbs:* `Home \ Dashboard \ Analytics` floating freely at the top.

#### Row 1: KPI Floating Cards (4 columns)
**Stats:**
1. **Total Agencies:** `45` | Sparkline: Blue wave | Status: `+ 2.5%` (Green glowing text/arrow).
2. **Daily Newspapers:** `1.2M` | Sparkline: Green wave | Status: `+ 0.9%` (Green).
3. **Monthly Revenue:** `$45,200` | Sparkline: Green wave | Status: `+ 1.1%` (Green).
4. **System Load:** `28% Stable` | Sparkline: Red wave | Status: `- 0.2%` (Red warning glow).

#### Row 2: Analytics Island (2 Columns: 2/3 ratio + 1/3 ratio)
**Left Col (Massive floating card): Agency Growth**
- A deep space transparent bar chart showing months (Apr 2025 -> Oct 2025).
- Bars must be semi-transparent with glowing borders. 
- Legend at the top right: "Paid product" vs "Checkout Product" (Or adapt to "Delivered" vs "Returned").
- **Hologram Tooltip:** Hovering over a bar reveals a floating tooltip showing specific metrics isolated from the chart plane.

**Right Col (Stacked Cards):**
1. **Top Stack (System Activity):** 
   - A glowing circular progress/doughnut chart showing `28% Stable`. 
   - The ring should have a bright cyan neon stroke thickness.
2. **Bottom Stack (Top Performing):**
   - A list of entities (e.g., Countries/Agencies).
   - Each item has a circular flag/avatar icon and an illuminated horizontal progress bar in distinct neon colors (Red, Blue, Orange, Purple).

#### Row 3: Data Log List (Bottom)
**System Activity Log**
- Search and Filter icons floating on the right side.
- Column headers: `Order ID`, `Product Item`, `Price`, `Customer`, `Date Checkout`.
- Data rows should be borderless but exude a soft background or shadow glow exactly when hovered over.

---

## 3. Interactivity & Animation (Crucial for the effect)
To sell the "Antigravity" effect, absolutely nothing should be entirely static.

### A. The "Breathing" Effect
All major glass cards must execute a very subtle, slow vertical bobbing animation.

```css
@keyframes floating { 
    0% { transform: translateY(0px); } 
    50% { transform: translateY(-10px); } 
    100% { transform: translateY(0px); } 
}

.glass-card {
    animation: floating 6s ease-in-out infinite;
}
```
*Tip:* Stagger the `animation-delay` slightly across different cards so they don't bob in perfect unison.

### B. Hover States (Levitation Surge)
When a user hovers over any card, it should:
1. Lift slightly closer to the screen (Scale).
2. Intensify the colored shadow glow (Brightness).
```css
.glass-card:hover {
    transform: scale(1.02) translateY(-5px);
    box-shadow: 
        0 25px 50px rgba(0,0,0,0.7), 
        0 0 40px rgba(102, 252, 241, 0.3); /* Intense neon glow */
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
```
