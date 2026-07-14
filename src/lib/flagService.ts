import { Flag, FlagOperation } from '../types/Flag';

/**
 * Applies a list of flag operations to the current flags array and returns the updated array.
 */
export function applyFlagOperations(flags: Flag[], operations: FlagOperation[]): Flag[] {
  if (!operations || operations.length === 0) return flags;

  // Deep copy to prevent side effects
  const updatedFlags = flags.map(f => {
    if (f.type === 'array_toggle') {
      return { ...f, value: Array.isArray(f.value) ? [...f.value] : [] };
    }
    return { ...f };
  });

  for (const op of operations) {
    const flag = updatedFlags.find(f => f.id === op.flagId);
    if (!flag) {
      console.warn(`Flag with ID ${op.flagId} not found for operation.`);
      continue;
    }

    if (flag.type === 'toggle') {
      if (op.action === 'toggle') {
        flag.value = !flag.value;
      } else {
        flag.value = !!op.value;
      }
    } else if (flag.type === 'number') {
      const currentVal = Number(flag.value) || 0;
      const opVal = Number(op.value) || 0;
      if (op.action === 'add') {
        flag.value = currentVal + opVal;
      } else if (op.action === 'sub') {
        flag.value = currentVal - opVal;
      } else {
        flag.value = opVal;
      }
    } else if (flag.type === 'array_toggle') {
      const idx = op.index ?? 0;
      // Initialize if not array
      if (!Array.isArray(flag.value)) {
        flag.value = Array(flag.arraySize || 1).fill(false);
      }
      
      // Bounds check
      if (idx >= 0 && idx < flag.value.length) {
        if (op.action === 'toggle') {
          flag.value[idx] = !flag.value[idx];
        } else {
          flag.value[idx] = !!op.value;
        }
      } else {
        console.warn(`Array index ${idx} out of bounds for flag ${flag.id}`);
      }
    }
  }

  return updatedFlags;
}
