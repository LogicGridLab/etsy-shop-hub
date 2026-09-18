# Etsy Ops Hub

Build a modern, full-stack Etsy Multi-Shop Operations & Analytics Admin Dashboard designed for digital product sellers. The application should feature a high-contrast dark-mode interface (Slate/Catppuccin aesthetic) with a clean navigation sidebar.

### 1. CORE ARCHITECTURE & MULTI-SHOP MANAGEMENT

- Shop Switcher: Top navbar dropdown allowing users to switch between multiple Etsy shops (e.g., "LogicGridStore", "DigitalHubStudio", "All Shops Consolidated").

- Database Schema (Supabase integration):

  - Shops: `id`, `shop_name`, `api_key`, `sync_status`, `created_at`

  - Products/Listings: `id`, `shop_id`, `title`, `sku`, `price`, `conversion_rate`, `views`, `favorites`, `listing_quality_score`

  - Orders & Sales: `id`, `shop_id`, `order_id`, `customer_name`, `product_id`, `gross_amount`, `net_amount`, `etsy_fees`, `date`

  - Expenses & Advertising: `id`, `shop_id`, `ad_spend`, `listing_fees`, `offsite_ad_fees`, `date`

### 2. DASHBOARD FEATURES & VISUAL METRICS

- KPI Header Cards:

  - Total Gross Revenue ($)

  - Net Profit & Estimated Tax Reserves (30%)

  - Total Orders & Average Order Value (AOV)

  - Overall Shop Conversion Rate (%)

- Interactive Charts (using Recharts/Lucide icons):

  - Revenue vs. Etsy Fees & Net Profit (Monthly Stacked Bar Chart)

  - Daily Traffic & Views vs. Orders Conversion (Line Chart)

  - Product Category Sales Distribution (Donut Chart)

### 3. ETSY API SYNC ENGINE & INTEGRATION

- Etsy OAuth 2.0 Integration: Include an "Integrate Etsy Account" settings page with direct button connectors using Etsy Open API v3.

- Automatic & Manual Data Sync: Provide a "Sync Data Now" action button that fetches real-time listings, order logs, transaction fees, and traffic metrics from connected Etsy stores.

- Mock Data Fallback: Include a built-in toggle switch to generate realistic simulated data for development and testing when API keys are not active.

### 4. MODULES & TAB NAVIGATION

- 📊 Executive Dashboard: Consolidated financial metrics, profit margins, and daily/monthly graphs.

- 💰 Order & Revenue History: Detailed data table of sales with search filters, date pickers, and CSV export capabilities.

- 📦 Listing Performance Center: Table tracking view counts, click-through rates (CTR), conversion scores, and stock status per listing.

- 💸 Expense & Ad Spend Log: Track daily Etsy Ad spend, offsite ad deductions, and operating expenses.

- ⚙️ Shop Settings & API Setup: Connection manager for multiple shops, webhook configurations, and database management.

### 5. UI & DESIGN SYSTEM

- Theme: Dark Slate / Obsidian dark-mode (#111827 / #1E293B background) with crisp white typography and modern accent colors (Emerald Green for profit, Violet/Indigo for highlights, Coral for expenses).

- Components: Use Shadcn UI primitives, tailwind spacing, responsive data tables with pagination, clean status badges, and subtle border dividers.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://etsy-shop-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a9479fdf-51a1-4e9d-8f34-7e44ec701bf6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
