export interface BoundedStringSet {
  readonly has: (value: string) => boolean;
  readonly add: (value: string) => void;
}

export function createBoundedStringSet(maxSize: number): BoundedStringSet {
  const values = new Set<string>();
  const order: string[] = [];

  return {
    has(value: string) {
      return values.has(value);
    },
    add(value: string) {
      if (values.has(value)) {
        return;
      }
      values.add(value);
      order.push(value);
      while (order.length > maxSize) {
        const oldest = order.shift();
        if (oldest !== undefined) {
          values.delete(oldest);
        }
      }
    },
  };
}
