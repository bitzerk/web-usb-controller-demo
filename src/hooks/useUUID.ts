import { useEffect, useState } from 'react';
import { getOrCreateUUID } from '../utils/uuid';

/**
 * Hook to manage UUID for host mode
 * Returns the persisted or newly generated UUID
 */
export function useUUID(): string {
  const [uuid, setUUID] = useState<string>(() => getOrCreateUUID());
  
  useEffect(() => {
    // Ensure UUID is set on mount
    const currentUUID = getOrCreateUUID();
    setUUID(currentUUID);
  }, []);
  
  return uuid;
}
