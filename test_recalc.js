const items = [
  { code: '01', weightFactor: 0 },
  { code: '01.01', weightFactor: 5 },
  { code: '01.02', weightFactor: 10 },
  { code: '02', weightFactor: 0 },
  { code: '02.01', weightFactor: 20 },
];
const sorted = [...items].sort((a, b) => b.code.split('.').length - a.code.split('.').length);
const itemsMap = new Map();
sorted.forEach(i => itemsMap.set(i.code, { ...i }));
for (const item of sorted) {
  const parts = item.code.split('.');
  const depth = parts.length;
  const children = Array.from(itemsMap.values()).filter(child => {
    const childParts = child.code.split('.');
    return childParts.length === depth + 1 && child.code.startsWith(item.code + ".");
  });
  if (children.length > 0) {
    const updated = itemsMap.get(item.code);
    let sum = 0;
    children.forEach(c => sum += c.weightFactor);
    updated.weightFactor = sum;
    itemsMap.set(item.code, updated);
  }
}
console.log(items.map(orig => itemsMap.get(orig.code)));
