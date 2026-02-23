# 🔄 NewsFlux: End-to-End System Flow

This document details the lifecycle and daily operational flow of the NewsFlux newspaper distribution platform.

---

## 🟢 Step 1: Super Admin Action
- Creates a new Agency in the system.
- Provisions and creates the initial Admin account for that agency.

---

## 🔵 Step 2: Admin Setup Phase
The Admin configures their isolated agency environment by adding:
- Newspapers available for distribution.
- Base Pricing 💰.
- Workers (Distributors) 👷.
- Customers and Subscriptions 👥.

---

## 🟡 Step 3: Daily Operation Loop

### Morning:
- Admin adds the initial daily stock 📦 to the platform.

### Distribution Phase:
- Workers log in to view their assigned stock.
- Workers take newspapers and begin their routes.

### Evening:
- Workers return to the platform to enter their "Returned" quantity.

---

## ⚙️ Automated System Calculations
Upon worker submission, the system automatically triggers functions to calculate:
- `Sold = Taken − Returned`
- `Daily Income = Sold * Price`
- Remaining Stock counts.

---

## 📅 Step 4: Monthly Process
At the end of the billing cycle, the system runs a batch process to:
- Generate customer bills based on delivery history.
- Calculate worker salaries / commissions.
- Generate aggregate Profit/Loss reports for the agency.
