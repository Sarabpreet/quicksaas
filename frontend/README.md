# QuickSaaS Customer Workspace App

The customer-facing multi-tenant web application for QuickSaaS. Built with React 19, TypeScript, Vite, Tailwind CSS v4, and Lucide Icons.

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure the backend API service is running on `http://localhost:4000`:
```bash
cd ../backend
npm run dev
```

### 2. Run the Customer App
From this directory (`frontend/`):
```bash
npm install
npm run dev
```
The application will launch on **`http://localhost:3000`**.

---

## 🔑 Demo Accounts

The customer login screen features quick 1-click authentication buttons for testing tenant roles:

| Role | Email | Password | Organization | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Workspace Owner** | `founder@startup.io` | `StartupPass123!` | Startup Labs | Full CRUD on dynamic collections, team management, file uploads, API keys |
| **Viewer Member** | `viewer@startup.io` | `ViewerPass123!` | Startup Labs | Read-only access to records and storage files; creation/mutation buttons locked |

---

## 🛠️ Features

- **Multi-Tenant Workspace Context**: Seamlessly switch between tenant organizations.
- **Dynamic API Collections**: Automatically reflects custom data resources defined in the API Studio.
- **Team Management**: Invite teammates and assign roles with instant link generation.
- **Developer API Keys**: Generate scoped access tokens for API integrations and microservices.
- **Secure File Storage**: Upload and download organization documents and media assets.
- **In-App Notifications**: Real-time bell alerts with unread counter and bulk mark-read action.

---

## 🧪 Testing & Production Build

### Run Automated Vitest Suites:
```bash
npm test
```
*Current test suite: 11 tests across 4 suites covering Auth, Navigation, Dynamic Collections, Team, and Storage.*

### Build for Production:
```bash
npm run build
```
Creates an optimized production bundle in `dist/`.
