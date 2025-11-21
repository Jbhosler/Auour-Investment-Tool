import { query, isSQLite } from '../database.js';
import { randomUUID } from 'crypto';

// Generate realistic return stream
const generateReturnStream = (lengthMonths, annualizedMean, annualizedVolatility) => {
  const monthlyMean = annualizedMean / 12;
  const monthlyVolatility = annualizedVolatility / Math.sqrt(12);
  const returns = [];
  let currentDate = new Date();
  currentDate.setMonth(currentDate.getMonth() - lengthMonths);

  for (let i = 0; i < lengthMonths; i++) {
    const randomNormal = (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) / 3;
    const returnValue = monthlyMean + randomNormal * monthlyVolatility;
    
    returns.push({
      date: currentDate.toISOString().slice(0, 7),
      value: returnValue,
    });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  return returns;
};

async function seedDatabase() {
  console.log('Seeding database with initial data...');
  
  try {
    // Seed Strategies
    const strategies = [
      {
        id: 's1',
        name: 'US Equity Growth Fund',
        returns: generateReturnStream(120, 0.12, 0.18),
        assetAllocation: { equity: 100, fixedIncome: 0, alternatives: 0 }
      },
      {
        id: 's2',
        name: 'Global Bond Fund',
        returns: generateReturnStream(120, 0.04, 0.06),
        assetAllocation: { equity: 0, fixedIncome: 100, alternatives: 0 }
      },
      {
        id: 's3',
        name: 'Emerging Markets High-Risk',
        returns: generateReturnStream(84, 0.15, 0.25),
        assetAllocation: { equity: 100, fixedIncome: 0, alternatives: 0 }
      },
      {
        id: 's4',
        name: 'Real Estate Investment Trust (REIT)',
        returns: generateReturnStream(120, 0.08, 0.15),
        assetAllocation: { equity: 0, fixedIncome: 0, alternatives: 100 }
      }
    ];

    for (const strategy of strategies) {
      const sql = isSQLite()
        ? 'INSERT OR REPLACE INTO strategies (id, name, returns, asset_allocation) VALUES (?, ?, ?, ?)'
        : 'INSERT INTO strategies (id, name, returns, asset_allocation) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name';
      
      const params = isSQLite()
        ? [strategy.id, strategy.name, JSON.stringify(strategy.returns), JSON.stringify(strategy.assetAllocation)]
        : [strategy.id, strategy.name, strategy.returns, strategy.assetAllocation];
      
      await query(sql, params);
      console.log(`  ✓ Added strategy: ${strategy.name}`);
    }

    // Seed Benchmarks
    const benchmarks = [
      {
        id: 'b1',
        name: 'S&P 500 Index',
        returns: generateReturnStream(120, 0.10, 0.16)
      },
      {
        id: 'b2',
        name: 'Bloomberg Global Aggregate Bond Index',
        returns: generateReturnStream(120, 0.03, 0.05)
      },
      {
        id: 'b3',
        name: 'MSCI Emerging Markets Index',
        returns: generateReturnStream(120, 0.11, 0.22)
      }
    ];

    for (const benchmark of benchmarks) {
      const sql = isSQLite()
        ? 'INSERT OR REPLACE INTO benchmarks (id, name, returns) VALUES (?, ?, ?)'
        : 'INSERT INTO benchmarks (id, name, returns) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name';
      
      const params = isSQLite()
        ? [benchmark.id, benchmark.name, JSON.stringify(benchmark.returns)]
        : [benchmark.id, benchmark.name, benchmark.returns];
      
      await query(sql, params);
      console.log(`  ✓ Added benchmark: ${benchmark.name}`);
    }

    console.log('\n✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
