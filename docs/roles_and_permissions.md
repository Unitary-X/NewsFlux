# 👑 NewsFlux: Roles & Permissions

This document outlines the strict Role-Based Access Control (RBAC) and data control rules governing the NewsFlux platform.

---

## 🔐 Core Data Control Rules (CRITICAL)

- Each agency sees **only its own data**.
- Workers see **only their own records**.
- Super Admin sees **everything**.

---

## 1. 👑 Super Admin (Platform Owner / Developer)
**Scope:** Entire system (all agencies)

### Permissions:
- ✅ Manage all agencies  
- ✅ View Agency analytics 📊  
- ✅ View Server performance ⚙️  
- ✅ Control Server / database  
- ✅ Control Global settings  
- ✅ Enable / disable agencies  
- ✅ Monitor platform usage  

### Restrictions:
- ❌ **Cannot** interfere with daily agency operations (best practice).

---

## 2. 🏢 Admin (Agency Owner)
**Scope:** Full control within their specific agency  

### Permissions:
- ✅ **Add & manage stock** 📦  
- ✅ **Add/remove workers** 👷  
- ✅ **Manage customers** 👥  
- ✅ **Set pricing** 💰  
- ✅ **Billing & payments** 🧾  
- ✅ **View reports** 📊  
- ✅ **Manage salaries** 💸  

*👉 ✔ Admin can perform any operational action inside their agency.*

---

## 3. 👷 Worker (Distributor)
**Scope:** Very limited (only their specific assigned data)

### Permissions:
- ✅ View assigned newspapers  
- ✅ View today’s stock taken  
- ✅ Enter taken quantity  
- ✅ Enter returned quantity  
- ✅ View their personal sales  
- ✅ View their personal salary  

### Restrictions:
- ❌ **Cannot** see pricing  
- ❌ **Cannot** see other workers' data  
- ❌ **Cannot** access admin data  
