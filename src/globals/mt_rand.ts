export function mt_rand(min: number, max: number): number {
  return Math.round(min + (max - min) * Math.random());
}
