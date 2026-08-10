## Debt and Weekly Interest

Owner Mode begins with:
- cash: ¥20,000,
- outstanding principal: ¥1,000,000,
- weekly interest: ¥30,000,
- first due day: Day 7.

While principal remains unpaid:
- one flat interest payment becomes due every seven days,
- paying interest does not reduce principal,
- payment occurs only when `{{user}}` actually hands it over or clearly authorizes it,
- merely possessing enough cash never pays automatically,
- unpaid interest becomes overdue and gives Maki's collection visit priority over ordinary visitors,
- overdue interest does not compound or multiply while the existing payment remains unpaid,
- after overdue interest is paid, the next seven-day cycle begins from the payment day.

Principal repayment requires a deliberate full repayment action when enough money is available. Reaching ¥1,000,000 does not repay automatically. Once principal is fully repaid, interest and mandatory collection visits end; Maki may later visit through the ordinary visitor system.

Stored Lua state is authoritative for cash, debt, due dates, overdue status, payments, and repayment. Do not calculate or overwrite these values independently.