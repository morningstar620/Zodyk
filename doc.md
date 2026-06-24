**ZODYK**

Product Requirements & Architecture Vision

_Open-Source · Self-Hostable · Modern Website Operating System_

Version 1.0 Draft

# **1\. Executive Summary**

Zodyk is an open-source, self-hostable website platform engineered to serve developers, agencies, businesses, and enterprises. It combines the content management depth of WordPress, the theme architecture and visual editing experience of Shopify, and the developer ergonomics of Next.js - without the plugin dependency and legacy constraints that make WordPress difficult to maintain at scale.

The platform is designed to be a modern website operating system: a single installation that delivers content management, SEO, media, forms, automations, workflows, notifications, and now a fully integrated payments layer - all from core, with no third-party plugins required for these foundational capabilities.

# **2\. Mission & Core Principles**

## **Mission**

Provide a modern website operating system that delivers simplicity for content editors, flexibility for developers, scalability for enterprises, and open-source ownership for everyone.

## **Core Principles**

| **Open Source**        | Fully open-source under a permissive license; community-driven roadmap.           |
| ---------------------- | --------------------------------------------------------------------------------- |
| **Self Hostable**      | Runs on Vercel, Docker, Kubernetes, or bare metal with no vendor lock-in.         |
| **API First**          | Every feature is accessible via REST, GraphQL, and internal SDK.                  |
| **Theme First**        | Themes are first-class: installable, exportable, versioned, marketplace-ready.    |
| **Content Modeling**   | Unlimited custom content types without plugin installation.                       |
| **Cloud Native**       | Designed for horizontal scaling, edge delivery, and container orchestration.      |
| **Developer Friendly** | TypeScript throughout, monorepo structure, type-safe APIs, and CLI tooling.       |
| **No-Code Friendly**   | Visual builder and admin interfaces require zero code for common workflows.       |
| **Plugin-Light**       | SEO, forms, fields, media, automations, and payments ship in core.                |
| **Extensible**         | Clean package boundaries and event hooks allow first- and third-party extensions. |

# **3\. Target Users**

| **Persona** | **Primary Needs**                                  | **Key Features Used**                          |
| ----------- | -------------------------------------------------- | ---------------------------------------------- |
| Developers  | Type safety, APIs, theme development, modern stack | REST/GraphQL API, SDK, CLI, monorepo packages  |
| Agencies    | Reusable themes, client websites, visual editing   | Theme engine, visual builder, multi-site       |
| Businesses  | SEO, media, automations, forms, payments           | SEO platform, workflow engine, payments module |
| Enterprises | Roles, workflows, audit logs, scalability          | RBAC, audit logs, SSO, multi-tenant support    |

# **4\. Recommended Technology Stack**

## **Frontend**

| **Framework**          | Next.js (App Router)     |
| ---------------------- | ------------------------ |
| **Language**           | TypeScript               |
| **UI Library**         | Tailwind CSS + Shadcn UI |
| **Rich Text Editor**   | TipTap                   |
| **State Management**   | Zustand                  |
| **Forms & Validation** | React Hook Form + Zod    |

## **Backend**

| **Runtime**    | Node.js                                      |
| -------------- | -------------------------------------------- |
| **Framework**  | Next.js Route Handlers + Server Actions      |
| **Validation** | Zod                                          |
| **ORM**        | Mongoose                                     |
| **Database**   | MongoDB (primary)                            |
| **Cache**      | Redis (optional, recommended for production) |
| **Queue**      | BullMQ                                       |
| **Search**     | MongoDB Atlas Search                         |

## **Storage & Delivery**

| **Media Storage**    | Cloudflare R2       |
| -------------------- | ------------------- |
| **Image Processing** | Sharp (WebP + AVIF) |
| **CDN**              | Cloudflare          |

## **Authentication**

| **Library** | Auth.js                                               |
| ----------- | ----------------------------------------------------- |
| **Methods** | Email/password, magic links, social OAuth, API tokens |
| **Future**  | SSO, SAML, LDAP                                       |

## **Theme Engine**

| **Template Language** | Liquid (Shopify-compatible syntax)                 |
| --------------------- | -------------------------------------------------- |
| **Requirements**      | Theme sandboxing, schema system, section rendering |

# **5\. Monorepo Structure**

Zodyk is organized as a monorepo to enforce clean package boundaries, enable independent versioning, and allow third-party developers to consume individual packages.

**apps/**

- admin - Next.js administration panel
- website - Public-facing Next.js site renderer

**packages/**

- core - Shared types, utilities, and platform primitives
- auth - Authentication, session management, RBAC
- database - Mongoose models, migrations, seed scripts
- seo - SEO metadata, sitemap, robots.txt, schema.org
- media - R2 upload, image optimization, media library
- liquid - Liquid template engine adapter + sandboxing
- workflow - Workflow automation engine (triggers/conditions/actions)
- forms - Form builder, submission storage, notifications
- notifications - Unified email/SMS/WhatsApp/webhook layer
- payments - Payment gateway adapters, webhook handlers, billing UI
- builder - Visual drag-and-drop section builder
- theme-engine - Theme install, export, versioning, marketplace adapter
- api - REST and GraphQL API layer
- shared-ui - Design system components shared across apps

**infrastructure/**

- docker - Docker Compose files for local and production
- scripts - Seed, migration, and deployment utilities
- deployment - Kubernetes manifests and Vercel config

# **6\. Core Modules**

## **6.1 Authentication**

- Login, registration, password reset
- Multi-Factor Authentication (MFA)
- Session management with secure token rotation
- Role-Based Access Control (RBAC)
- API token management
- Future: SSO, SAML, LDAP

## **6.2 Pages**

- Create, draft, publish, schedule, and archive pages
- Revision history with diff view and restore
- Per-page SEO configuration
- Hierarchical page structure

## **6.3 Meta Objects (Custom Content Types)**

Equivalent to WordPress Custom Post Types. Users define any content schema without writing code.

- Dynamic schema definition (no migrations required)
- Relations between content types
- Examples: Products, Authors, Events, Services, Team Members, Testimonials

## **6.4 Meta Fields**

Equivalent to Advanced Custom Fields (ACF). Available field types:

- Text, Rich Text, Number, Boolean
- Date, Datetime
- Image, Gallery, File
- Repeater, Relation, JSON, Code, URL
- Validation rules, conditional logic, and localization support per field

## **6.5 Media Manager**

- Cloudflare R2 storage backend
- Folder structure, search, bulk actions
- Metadata editing (alt text, title, caption)
- Automatic image optimization to WebP and AVIF

## **6.6 Menu Manager**

- Nested drag-and-drop menu builder
- Dynamic menus tied to content types
- Mega menu support

## **6.7 SEO Platform**

Built into core - no SEO plugin required.

- Meta titles and descriptions
- Open Graph and Twitter Card tags
- Canonical URLs
- Schema.org structured data
- XML Sitemap auto-generation
- Robots.txt management
- 301/302 redirect manager
- Breadcrumb schema

## **6.8 Forms Builder**

- Visual drag-and-drop form builder
- Submission storage and export
- Email and webhook notifications on submission
- Integration with workflow automation engine

## **6.9 Theme System**

Inspired by Shopify's theme architecture. Theme structure:

- layout/ - Global page shells
- templates/ - Page-type templates
- sections/ - Modular, schema-driven content blocks
- snippets/ - Reusable Liquid partials
- assets/ - CSS, JS, images bundled with the theme
- config/ - Theme settings schema (settings_schema.json)

Theme capabilities:

- Install from file or marketplace URL
- Export as versioned .zip package
- Version history and rollback
- Marketplace-ready packaging format

## **6.10 Theme Editor**

- Shopify-style code editor in the admin panel
- Syntax highlighting for Liquid, CSS, and JavaScript
- Live preview with hot reload
- Version history per file

## **6.11 Visual Builder (Version 2.0)**

- Section-based drag-and-drop page composer
- Live preview with responsive breakpoint switching
- Undo/redo history
- Reusable saved templates
- Schema-driven section settings panel

## **6.12 Workflow Automation Engine**

Inspired by Shopify Flow. Core components: Trigger → Conditions → Actions.

### **Triggers**

- content.created, content.updated, content.deleted
- form.submitted
- user.registered
- payment.completed, payment.failed, payment.refunded
- subscription.created, subscription.cancelled, subscription.renewed
- Scheduled (cron-style) events

### **Actions**

- Send email, SMS, or WhatsApp message
- Trigger outbound webhook
- Create, update, or tag content
- Add or remove user tags
- Grant or revoke access to gated content

## **6.13 Notifications Platform**

### **Email**

- Providers: SMTP, Amazon SES, Resend, Mailgun, SendGrid
- Template editor with variable substitution
- Delivery logs and retry queue

### **SMS**

- Providers: Twilio, MSG91, Textlocal
- OTP delivery, campaign messages, transactional notifications

### **WhatsApp (Phase 2)**

- Providers: WhatsApp Business API, Twilio, 360dialog
- Template messages, marketing broadcasts, transactional alerts

## **6.14 Webhooks**

- Inbound webhooks - receive events from payment gateways and third-party services
- Outbound webhooks - broadcast internal events to external systems
- Event types include: page.created/updated, form.submitted, user.created, payment.completed, subscription.\*, refund.issued
- Delivery logs, retry logic with exponential backoff, HMAC signature verification

## **6.15 Search**

- Full-text search across all content types via MongoDB Atlas Search
- Faceted search with field-level filtering
- Real-time indexing on content create/update events

# **7\. Payments Module**

The Payments Module is a core, plugin-free feature of Zodyk. It enables businesses and creators to accept one-time payments and recurring subscriptions directly from their Zodyk-powered websites, with full workflow and notification integration.

## **7.1 Design Principles**

- Gateway-agnostic: adapters for multiple providers, switchable at config level
- No payments plugin required - ships in the @zodyk/payments package
- PCI-DSS compliant by design: card data is never stored on Zodyk servers
- Integrated with the workflow engine, notification platform, and webhooks
- Extensible: third-party gateway adapters can be registered via the plugin API

## **7.2 Supported Payment Gateways**

| **Gateway** | **Region Focus** | **One-Time** | **Subscriptions** | **Phase** |
| ----------- | ---------------- | ------------ | ----------------- | --------- |
| Stripe      | Global           | ✓            | ✓                 | 1.5       |
| Razorpay    | India / SEA      | ✓            | ✓                 | 1.5       |
| PayPal      | Global           | ✓            | ✓                 | 2.0       |
| Paddle      | Global (SaaS)    | ✓            | ✓                 | 2.0       |
| Cashfree    | India            | ✓            | ✗                 | 2.0       |
| Instamojo   | India            | ✓            | ✗                 | 2.0       |
| PayU        | India / LATAM    | ✓            | ✓                 | 2.0       |
| Square      | US / Canada      | ✓            | ✗                 | 2.5       |
| Mollie      | Europe           | ✓            | ✓                 | 2.5       |

## **7.3 Core Features**

### **Payment Links & Checkout**

- Generate shareable payment links without code
- Hosted checkout pages with theme-aware styling
- Embedded checkout widget for inline purchase flows
- Custom success and failure redirect URLs
- Order bump and upsell support (Phase 2)

### **One-Time Payments**

- Fixed-amount and user-defined (pay-what-you-want) amounts
- Currency selection with multi-currency support
- Downloadable digital products post-payment (Phase 2)
- Coupon / discount code support

### **Subscriptions & Recurring Billing**

- Free trial periods (configurable duration)
- Monthly, quarterly, annual, and custom billing intervals
- Metered and seat-based billing (Phase 2)
- Plan upgrade, downgrade, and pause flows
- Proration handling on plan changes
- Dunning management: smart retry sequences for failed payments
- Grace period configuration before subscription cancellation

### **Products & Plans**

- Product catalog: name, description, image, metadata
- Multiple pricing plans per product
- Free and paid tiers
- Archive and version products without deleting historical orders

### **Orders & Transactions**

- Order ledger with full lifecycle: pending → paid → refunded / cancelled
- Partial and full refund initiation from admin panel
- Transaction timeline with gateway event log
- Export orders to CSV

### **Customer Portal (Phase 2)**

- Self-service subscription management for end users
- Update payment method, cancel, pause, or reactivate subscription
- Download invoices and payment history
- White-labeled - inherits site theme and branding

### **Invoicing**

- Auto-generated PDF invoices per transaction
- Custom invoice templates with logo, tax ID, and address fields
- Tax line item support (GST, VAT, custom)
- Invoice email delivery with PDF attachment

### **Content Gating & Member Access**

- Gate pages, posts, or meta objects behind a payment or active subscription
- Workflow trigger: grant/revoke access on payment.completed / subscription.cancelled
- Drip content scheduling for subscription members
- Role assignment on successful payment (integrates with RBAC module)

## **7.4 Payment Webhook Architecture**

All payment gateways communicate status changes via inbound webhooks. The payments module handles these securely:

- HMAC signature validation per gateway before processing
- Idempotency keys to prevent duplicate event processing
- Events persisted to a payment_events collection before handler execution
- Retry queue via BullMQ if handler processing fails
- Events forwarded to the Zodyk workflow engine for automation triggers

## **7.5 Data Models**

### **Product**

| **\_id**        | ObjectId           |
| --------------- | ------------------ |
| **name**        | String             |
| **description** | String (rich text) |
| **image**       | Media reference    |
| **status**      | active \| archived |
| **metadata**    | Object (key-value) |
| **createdAt**   | DateTime           |

### **Price / Plan**

| **\_id**           | ObjectId                           |
| ------------------ | ---------------------------------- |
| **productId**      | ObjectId → Product                 |
| **type**           | one_time \| recurring              |
| **amount**         | Number (smallest currency unit)    |
| **currency**       | ISO 4217 (e.g. INR, USD)           |
| **interval**       | month \| quarter \| year \| custom |
| **intervalCount**  | Number                             |
| **trialDays**      | Number                             |
| **gatewayPriceId** | String (gateway-side ID)           |
| **status**         | active \| archived                 |

### **Order / Payment**

| **\_id**             | ObjectId                                                    |
| -------------------- | ----------------------------------------------------------- |
| **customerId**       | ObjectId → User                                             |
| **productId**        | ObjectId → Product                                          |
| **priceId**          | ObjectId → Price                                            |
| **status**           | pending \| paid \| failed \| refunded \| partially_refunded |
| **amount**           | Number                                                      |
| **currency**         | String                                                      |
| **gateway**          | stripe \| razorpay \| paypal \| …                           |
| **gatewayOrderId**   | String                                                      |
| **gatewayPaymentId** | String                                                      |
| **metadata**         | Object                                                      |
| **createdAt**        | DateTime                                                    |
| **paidAt**           | DateTime                                                    |

### **Subscription**

| **\_id**                  | ObjectId                                              |
| ------------------------- | ----------------------------------------------------- |
| **customerId**            | ObjectId → User                                       |
| **productId**             | ObjectId → Product                                    |
| **priceId**               | ObjectId → Price                                      |
| **status**                | trialing \| active \| past_due \| paused \| cancelled |
| **currentPeriodStart**    | DateTime                                              |
| **currentPeriodEnd**      | DateTime                                              |
| **cancelAtPeriodEnd**     | Boolean                                               |
| **gatewaySubscriptionId** | String                                                |
| **metadata**              | Object                                                |

## **7.6 Admin Panel UI**

- Payments dashboard: revenue chart (MRR, ARR, total revenue), churn rate, active subscribers
- Orders table: filterable by status, gateway, date range; searchable by customer
- Subscriptions table: active, trialing, cancelled, past due views
- Product & plan manager: create, edit, archive
- Refund actions inline on order detail page
- Gateway configuration: connect API keys, toggle test/live mode
- Webhook event log with payload inspector

## **7.7 API Endpoints**

| **Method** | **Endpoint**                           | **Description**            |
| ---------- | -------------------------------------- | -------------------------- |
| GET        | /api/payments/products                 | List all active products   |
| POST       | /api/payments/products                 | Create product             |
| GET        | /api/payments/products/:id             | Get product detail         |
| POST       | /api/payments/prices                   | Create price/plan          |
| POST       | /api/payments/checkout                 | Create checkout session    |
| GET        | /api/payments/orders                   | List orders (admin)        |
| GET        | /api/payments/orders/:id               | Get order detail           |
| POST       | /api/payments/orders/:id/refund        | Issue refund               |
| GET        | /api/payments/subscriptions            | List subscriptions (admin) |
| POST       | /api/payments/subscriptions/:id/cancel | Cancel subscription        |
| POST       | /api/payments/webhooks/:gateway        | Inbound webhook handler    |
| GET        | /api/payments/invoices/:orderId        | Download invoice PDF       |

## **7.8 Security Considerations**

- Card data never passes through or is stored on Zodyk servers (gateway-hosted fields)
- HMAC signature validation required on all inbound payment webhooks
- Payment-related admin actions (refunds, plan changes) require elevated role permission
- All payment events logged to audit trail
- Test mode / live mode toggle prevents accidental production charges
- Rate limiting on checkout endpoint to prevent abuse

# **8\. Scalability Architecture**

## **Database**

- MongoDB Atlas with replica sets and read replicas
- Sharding-ready data models - tenant ID as shard key for multi-tenant deployments
- Index strategy: compound indexes on (tenantId, status, createdAt) for all high-volume collections

## **Cache Layer (Redis)**

- Session storage
- Page-level HTML cache for public pages
- Rate-limit counters
- BullMQ job queue backend

## **Queue Architecture (BullMQ)**

| **Queue** | **Purpose**                                            |
| --------- | ------------------------------------------------------ |
| email     | Outbound email delivery with provider retry            |
| sms       | SMS delivery                                           |
| whatsapp  | WhatsApp message delivery (Phase 2)                    |
| webhooks  | Outbound webhook delivery with exponential backoff     |
| workflows | Async workflow step execution                          |
| payments  | Payment webhook event processing and idempotency guard |
| media     | Image optimization and CDN invalidation                |
| scheduled | Cron-based trigger evaluation                          |

## **CDN Layer**

- Cloudflare for static assets and media delivery
- Edge caching for public pages with cache-tag-based purging on publish

## **Multi-Tenancy & Multi-Site**

- Tenant context injected at request middleware level
- All MongoDB documents scoped by tenantId
- Separate R2 bucket prefixes per tenant for media isolation
- Custom domain mapping per tenant/site

# **9\. Security Requirements**

| **Area**            | **Implementation**                                                     |
| ------------------- | ---------------------------------------------------------------------- |
| CSRF Protection     | Next.js built-in + double-submit cookie pattern for forms              |
| XSS Protection      | Content Security Policy headers, TipTap output sanitization            |
| Rate Limiting       | Redis-backed per-IP and per-user rate limits on all mutation endpoints |
| RBAC                | Role definitions in database; permission checks in API middleware      |
| Audit Logs          | All admin actions written to immutable audit_logs collection           |
| API Key Management  | Scoped, rotatable keys; hashed at rest; last-used tracking             |
| Secrets Encryption  | Gateway API keys encrypted at rest using AES-256-GCM                   |
| Theme Sandboxing    | Liquid executed in isolated VM context; no Node.js module access       |
| Payment Security    | HMAC webhook validation; no card data stored; PCI-DSS scope minimized  |
| Dependency Scanning | Dependabot + npm audit in CI pipeline                                  |

# **10\. API Strategy**

- REST API for all CRUD operations, available at /api/v1/\*
- GraphQL API for flexible content queries, available at /api/graphql
- Internal SDK (@zodyk/sdk) for server-side access within the monorepo
- API key authentication for external integrations
- OpenAPI 3.0 spec auto-generated from route definitions
- Future: MCP-compatible APIs and AI agent endpoint profiles

# **11\. Installation Experience**

## **CLI**

npx create-zodyk my-project

## **Setup Wizard - Required**

- MongoDB URI
- Admin email address
- Admin password

## **Setup Wizard - Optional**

- Cloudflare R2 credentials (media storage)
- SMTP / email provider configuration
- SMS provider configuration
- Payment gateway selection and API keys (Stripe, Razorpay, etc.)

## **Setup Process**

- Validate all configuration values
- Generate .env and .env.example
- Create database collections and indexes
- Seed default data (roles, settings, default theme)
- Create admin user account
- Install default theme
- Generate encryption keys for secrets at rest
- Display admin URL and credentials summary

# **12\. Phased Release Roadmap**

| **Version**                  | **Key Deliverables**                                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0 - Foundation            | Authentication, Pages, Meta Objects, Meta Fields, Menus, SEO, Media, Forms, Theme Engine, Theme Editor, Webhooks, REST API                                                                     |
| v1.5 - Automation & Payments | Redis integration, BullMQ queues, Workflow Engine, Email module, SMS module, Activity logs, Revisions, Payments Module (Stripe + Razorpay), Subscription management, Invoicing, Content gating |
| v2.0 - Visual & Commerce     | Visual Builder, WhatsApp notifications, Marketplace (themes + sections), Localization, Multi-site, Additional payment gateways (PayPal, Paddle, PayU, Cashfree), Customer portal               |
| v3.0 - Enterprise & AI       | E-commerce layer (cart, checkout, order management), AI Workflows, AI Content Tools, Enterprise governance, SSO/SAML, Advanced permissions, Metered billing, Seat-based billing                |

# **13\. Success Criteria**

Zodyk should enable a user to build, manage, optimize, automate, and monetize a modern website without requiring any third-party plugins for core functionality.

The platform must deliver:

- The content management depth of WordPress
- The theme experience and visual editing of Shopify
- The developer ergonomics of Next.js
- The payment and subscription capabilities of a dedicated billing platform
- Full open-source ownership and self-hostability

- End of Document -