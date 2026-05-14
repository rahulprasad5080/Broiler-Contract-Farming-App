const fs = require('fs');

const file = 'd:\\murgi\\Broiler-Contract-Farming-App\\app\\(owner)\\manage\\batches\\[id].tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = "{activeTab === 'overview' && (";
const endStr = "{activeTab === 'comments' && (";

const start = content.indexOf(startStr);
const end = content.indexOf(endStr);

if (start === -1 || end === -1) {
  console.error('Could not find start or end strings.');
  process.exit(1);
}

const newTabs = `
            {activeTab === 'overview' && (
              <OverviewTab
                chicksPlaced={chicksPlaced}
                liveBirds={liveBirds}
                mortality={mortality}
                fcr={fcr}
                avgWeight={avgWeight}
                feedConsumed={feedConsumed}
                ageDays={ageDays}
                expectedAge={expectedAge}
                toGo={toGo}
              />
            )}
            
            {activeTab === 'daily' && (
              <DailyEntriesTab dailyLogs={dailyLogs} openDailyEntry={openDailyEntry} />
            )}

            {activeTab === 'expenses' && (
              <ExpensesTab
                activeExpenseTab={activeExpenseTab}
                setActiveExpenseTab={setActiveExpenseTab}
                activeExpenseTitle={activeExpenseTitle}
                activeExpenses={activeExpenses}
                activeExpenseTotal={activeExpenseTotal}
                todayExpenseTotal={todayExpenseTotal}
              />
            )}

            {activeTab === 'sales' && (
              <SalesTab
                sales={sales}
                totalSalesAmount={totalSalesAmount}
                todaySalesAmount={todaySalesAmount}
                totalSoldBirds={totalSoldBirds}
                totalSoldWeight={totalSoldWeight}
              />
            )}

            {activeTab === 'pnl' && (
              <PnlTab
                activePnlTab={activePnlTab}
                setActivePnlTab={setActivePnlTab}
                batchPnl={batchPnl}
                companyProfitLoss={companyProfitLoss}
                companyResultColor={companyResultColor}
              />
            )}

            `;

content = content.substring(0, start) + newTabs + content.substring(end);

const imports = `import { OverviewTab } from '@/components/batches/tabs/OverviewTab';
import { DailyEntriesTab } from '@/components/batches/tabs/DailyEntriesTab';
import { ExpensesTab } from '@/components/batches/tabs/ExpensesTab';
import { SalesTab } from '@/components/batches/tabs/SalesTab';
import { PnlTab } from '@/components/batches/tabs/PnlTab';
`;

content = content.replace('import React,', imports + 'import React,');

fs.writeFileSync(file, content);
console.log('Successfully refactored [id].tsx');
