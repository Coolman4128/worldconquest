import type { Province } from '../interfaces/Province';

export function calculateDistance(
  startId: string,
  targetId: string,
  provinces: Province[]
): number {
  const provinceMap = new Map<string, Province>(provinces.map(p => [p.Id, p]));
  if (!provinceMap.size || startId === targetId) return 0;

  const queue: { id: string; distance: number }[] = [{ id: startId, distance: 0 }];
  const visited = new Set<string>([startId]);
  const maxSearchDepth = 10;

  while (queue.length > 0) {
    const { id: currentId, distance: currentDistance } = queue.shift()!;
    if (currentId === targetId) return currentDistance;
    if (currentDistance >= maxSearchDepth) continue;
    const currentProvince = provinceMap.get(currentId);
    if (currentProvince?.AdjacentProvinceIds) {
      for (const neighborId of currentProvince.AdjacentProvinceIds) {
        if (provinceMap.has(neighborId) && !visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ id: neighborId, distance: currentDistance + 1 });
        }
      }
    }
  }
  return Infinity;
}
