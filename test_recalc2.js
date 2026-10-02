const items = [
  { code: '01.00', weightFactor: 0 },
  { code: '01.01', weightFactor: 5 },
  { code: '01.02', weightFactor: 10 },
  { code: '02', weightFactor: 0 },
  { code: '02.01', weightFactor: 20 },
];

const getDepth = (code) => {
  const parts = code.split('.');
  let depth = parts.length;
  const lastPart = parts[parts.length - 1];
  if (lastPart === '00' || lastPart === '0' || lastPart === '000') {
    depth -= 1;
  }
  return depth;
};

const sorted = [...items].sort((a, b) => getDepth(b.code) - getDepth(a.code));
const itemsMap = new Map();
sorted.forEach(i => itemsMap.set(i.code, { ...i }));

for (const item of sorted) {
  const parts = item.code.split('.');
  const lastPart = parts[parts.length - 1];
  const isZeroEnd = lastPart === '00' || lastPart === '0' || lastPart === '000';
  const myPrefix = isZeroEnd ? parts.slice(0, -1).join('.') : item.code;
  
  const children = Array.from(itemsMap.values()).filter(child => {
    if (child.code === item.code) return false;
    const childParts = child.code.split('.');
    
    // Strict child e.g. 01 -> 01.01
    if (!isZeroEnd && childParts.length === parts.length + 1 && child.code.startsWith(item.code + ".")) {
      return true;
    }
    
    // Zero-end child e.g. 01.00 -> 01.01
    if (isZeroEnd && childParts.length === parts.length) {
      const childLastPart = childParts[childParts.length - 1];
      const isChildZeroEnd = childLastPart === '00' || childLastPart === '0' || childLastPart === '000';
      if (!isChildZeroEnd && childParts.slice(0, -1).join('.') === parts.slice(0, -1).join('.')) {
        return true;
      }
    }
    
    return false;
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
