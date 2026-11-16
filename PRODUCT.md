# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary — Specialty Coffee Customers**: Neighborhood patrons, remote workers, students, and daily commuters ordering handcrafted drinks and freshly baked pastries online. They want to browse available items, customize their drink (cup size, milk preference, sweetness, espresso shots, modifiers), pay seamlessly via GCash, Maya, or cash, and either pick up at the counter without waiting in line or coordinate third-party courier delivery (`Lalamove`, `Grab`, etc.) with live order status tracking.
- **Secondary — Cafe Baristas & Store Operators**: Staff and owners managing incoming online and walk-in orders, verifying digital payment proofs, preparing drinks and display batches, and maintaining accurate recipe-linked ingredient stock.

## Product Purpose

Basta Kape makes specialty craft coffee approachable, customizable, and effortless to order online. Success means customers can discover their favorite drink, tailor it to their exact taste, complete checkout with clear payment and fulfillment visibility, and receive their order fresh—whether walking up for pickup or booking a courier once their order is marked ready.

## Positioning

Accessible neighborhood Filipino specialty coffee ("Basta Kape") that combines barista-grade drink customization with real-time, recipe-linked FEFO inventory availability and transparent two-way fulfillment (in-store pickup and customer-booked courier coordination with live status updates from `PENDING` to `READY_FOR_PICKUP`, `DISPATCHED`, and `COMPLETED`).

## Operating Context

- **Storefront Location & Hours**: Physical roastery and cafe (defaulting to `50 K-1st, Quezon City, Metro Manila`, operating `7:00 AM – 9:00 PM` daily, dynamically configurable via Store Settings).
- **Order & Payment Rituals**: Customers browse the live catalog (`/products`), configure variants and modifier groups, and pay via manual e-wallet transfer (`GCash` / `Maya` with reference number and proof-of-payment upload) or `CASH`.
- **Courier & Pickup Handoff**: For delivery orders, customers book their own courier once the cafe marks the order `READY_FOR_PICKUP`, submit rider details (`riderName`, `riderPlate`, `riderVehicle`, `trackingLink`), and can confirm order completion upon arrival.

## Capabilities and Constraints

- **Live Menu & Best Sellers**: Public menu APIs (`/menu`, `/menu/categories`, `/menu/types`, `/menu/best-sellers`) surface only active products and variants backed by available raw ingredients or prepared display stock.
- **Modifier & Variant Pricing**: Products support multiple variants (e.g., sizes/temperatures) and modifier groups with real-time price calculation.
- **Payment Verification**: Receipt and order views distinguish between unconfirmed payments (`Not paid` / pending verification) and confirmed payments.
- **Technical Stack**: React 19, TypeScript, Vite, TanStack Router, TanStack Query, Tailwind CSS v4, Radix UI primitives, and Lucide icons communicating with an Express + Prisma backend.

## Brand Commitments

- **Name**: Basta Kape (dynamically resolved via `useStoreSettings()`, defaulting to `Basta Kape`).
- **Voice**: Warm, welcoming, craft-proud yet unpretentious—neighborhood hospitality paired with specialty coffee precision.
- **Assets**: Brand mark at `src/assets/logo.png` and fallback product imagery at `src/assets/default.png`.

## Evidence on Hand

- **Live Storefront Data**: Dynamic store settings (`useStoreSettings`), real-time best-selling items (`/menu/best-sellers`), product types (`/menu/types`), categories (`/menu/categories`), and full product/modifier catalog (`/menu`).
- **Assets**: Official logo (`src/assets/logo.png`) and default product placeholder (`src/assets/default.png`).
- **Absences Not to Fabricate**: Do not invent unverified third-party press mentions, fake partner logos, or automated in-house delivery fleet claims (delivery uses customer-coordinated couriers).

## Product Principles

1. **Craft Without Pretension**: Present specialty coffee details (roast, origin, modifiers, customization) in a warm, inviting way that welcomes everyday coffee drinkers and enthusiasts alike.
2. **Total Order Transparency**: Keep price breakdowns, payment confirmation state, preparation progress, and courier handoff requirements crystal clear at every step.
3. **Speed to First Sip**: Minimize friction from landing on the storefront to customizing a drink and checking out on both mobile and desktop browsers.
4. **Honest Availability**: Reflect real store hours, real menu categories, and real stock-backed product availability rather than static placeholders whenever live data is present.
