export class TableMock implements LetsRole.Table {
  #rows: LetsRole.TableRow[];

  constructor(rows: LetsRole.TableRow[]) {
    this.#rows = rows;
  }

  get(id: LetsRole.ColumnId): LetsRole.TableRow | null {
    return this.#rows.find((row) => row.id === id) || null;
  }

  each(callback: (row: LetsRole.TableRow) => void): void {
    this.#rows.forEach(callback);
  }

  random(callback: (row: LetsRole.TableRow) => void): void;
  random(count: number, callback: (row: LetsRole.TableRow) => void): void;
  random(
    count: number | ((row: LetsRole.TableRow) => void),
    callback?: (row: LetsRole.TableRow) => void,
  ): void {
    if (typeof count === "number" && callback) {
      const rows = [...this.#rows];

      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * rows.length);
        const row = rows.splice(idx, 1)[0];
        callback(row);
      }

      return;
    } else if (typeof count === "function") {
      count(this.#rows[Math.floor(Math.random() * this.#rows.length)]);
    }
  }
}
