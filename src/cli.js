import { searchByFraction } from './api.js';

async function main() {
  const fraction = process.argv[2];
  if (!fraction || !fraction.includes('/')) {
    console.error('Uso: npm run cli -- 032/168');
    process.exit(1);
  }

  try {
    const results = await searchByFraction(fraction);
    if (!results.length) {
      console.log('Nenhuma carta encontrada para', fraction);
      process.exit(0);
    }

    console.log(`Resultados para ${fraction}:`);
    for (const c of results) {
      console.log(`- ${c.name} | ${c.number}/${c.set.printedTotal ?? c.set.total} | Set: ${c.set.name} (${c.set.id}) | ${c.images?.small}`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

main();
