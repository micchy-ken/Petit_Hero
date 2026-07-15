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

/**
 * Checks if a flag condition is satisfied based on current flags state.
 */
export function checkFlagCondition(
  flags: Flag[],
  requiredFlagId?: string,
  requiredFlagValue?: any,
  requiredFlagIndex?: number
): boolean {
  if (!requiredFlagId) return true; // No flag condition, always satisfied

  const flag = flags?.find(f => f.id === requiredFlagId);
  if (!flag) {
    // If flag doesn't exist, assume false (or check default falsy state)
    return false;
  }

  const expected = requiredFlagValue;

  if (flag.type === 'toggle') {
    const current = !!flag.value;
    const exp = expected !== undefined ? (expected === 'true' || expected === true) : true;
    return current === exp;
  } else if (flag.type === 'number') {
    const current = Number(flag.value) || 0;
    const exp = expected !== undefined ? Number(expected) : 1;
    return current === exp;
  } else if (flag.type === 'array_toggle') {
    const idx = requiredFlagIndex ?? 0;
    const arr = Array.isArray(flag.value) ? flag.value : [];
    const current = !!arr[idx];
    const exp = expected !== undefined ? (expected === 'true' || expected === true) : true;
    return current === exp;
  }

  return true;
}
