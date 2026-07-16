import fs from 'fs';

const files = [
  'app/(protected)/new/page.tsx',
  'app/(protected)/applications/[id]/ApplicationDetailClient.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // bg colors
  content = content.replace(/bg-white/g, 'bg-white dark:bg-zinc-900');
  content = content.replace(/bg-gray-50(?!0)/g, 'bg-gray-50 dark:bg-zinc-950');
  content = content.replace(/bg-gray-100/g, 'bg-gray-100 dark:bg-zinc-800');

  // text colors
  content = content.replace(/text-gray-900/g, 'text-gray-900 dark:text-zinc-100');
  content = content.replace(/text-gray-800/g, 'text-gray-800 dark:text-zinc-200');
  content = content.replace(/text-gray-700/g, 'text-gray-700 dark:text-zinc-300');
  content = content.replace(/text-gray-600/g, 'text-gray-600 dark:text-zinc-400');
  content = content.replace(/text-gray-500/g, 'text-gray-500 dark:text-zinc-400');
  content = content.replace(/text-gray-400/g, 'text-gray-400 dark:text-zinc-500');

  // border colors
  content = content.replace(/border-gray-200/g, 'border-gray-200 dark:border-zinc-800');
  content = content.replace(/border-gray-300/g, 'border-gray-300 dark:border-zinc-700');

  fs.writeFileSync(file, content);
  console.log(`Injected dark classes in ${file}`);
}
