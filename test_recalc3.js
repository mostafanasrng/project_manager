const items = [
  { code: '01.00', weightFactor: 0 },
  { code: '01.01', weightFactor: 5 },
  { code: '01.02', weightFactor: 10 },
  { code: '02', weightFactor: 0 },
  { code: '02.01', weightFactor: 20 },
  { code: '02.01.01', weightFactor: 7 },
  { code: '02.01.02', weightFactor: 13 },
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

const isDirectChild = (parentCode, childCode) => {
  const pParts = parentCode.split('.');
  const cParts = childCode.split('.');

  if (cParts.length === pParts.length + 1 && childCode.startsWith(parentCode + ".")) {
    return true;
  }

  if (cParts.length === pParts.length) {
    const pLast = pParts[pParts.length - 1];
    const cLast = cParts[cParts.length - 1];
    if ((pLast === '00' || pLast === '0' || pLast === '000') && 
        !(cLast === '00' || cLast === '0' || cLast === '000')) {
      if (pParts.slice(0, -1).join('.') === cParts.slice(0, -1).join('.')) {
        return true;
      }
    }
  }

  return false;
};

const sorted = [...items].sort((a, b) => getDepth(b.code) - getDepth(a.code));
const itemsMap = new Map();
sorted.forEach(i => itemsMap.set(i.code, { ...i }));

for (const item of sorted) {
  const children = Array.from(itemsMap.values()).filter(child => {
    if (child.code === item.code) return false;
    return isDirectChild(item.code, child.code);
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
