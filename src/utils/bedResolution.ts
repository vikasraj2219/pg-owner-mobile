import { PropertyMatrixData } from '../types/api';

export interface BedResolutionOptions {
  rawBedNo?: string;
  tenantId?: string;
  tenantName?: string;
  currentBed?:
    | {
        _id?: string;
        bedNumber?: string | number;
        room?: { roomNumber?: string | number; floorNumber?: number } | string;
        roomNumber?: string | number;
      }
    | string
    | null;
  matrixData?: PropertyMatrixData | null;
  defaultRoom?: string;
  defaultBed?: string;
}

export interface ResolvedBedInfo {
  roomNumber: string;
  bedNumber: string;
  formattedLabel: string; // e.g. "201 · Bed 201-A"
  bedLabel: string; // e.g. "Bed 201-A"
}

export function resolveRoomAndBed({
  rawBedNo,
  tenantId,
  tenantName,
  currentBed,
  matrixData,
  defaultRoom = '201',
  defaultBed = '201-A',
}: BedResolutionOptions): ResolvedBedInfo {
  // 1. If rawBedNo is already full label e.g. "201 · Bed 201-A"
  if (rawBedNo && rawBedNo.includes('·')) {
    const parts = rawBedNo.split('·').map(s => s.trim());
    const rNum = parts[0].replace(/^Room\s*/i, '');
    const bPart = parts[1] || `Bed ${defaultBed}`;
    const bNum = bPart.replace(/^Bed\s*/i, '');
    return {
      roomNumber: rNum || defaultRoom,
      bedNumber: bNum || defaultBed,
      formattedLabel: `${rNum || defaultRoom} · Bed ${bNum || defaultBed}`,
      bedLabel: `Bed ${bNum || defaultBed}`,
    };
  }

  // 2. Try looking up in Property Matrix
  const currentBedId =
    typeof currentBed === 'string'
      ? currentBed
      : currentBed && typeof currentBed === 'object'
        ? currentBed._id
        : undefined;

  const currentBedNumber =
    currentBed && typeof currentBed === 'object' && currentBed.bedNumber
      ? String(currentBed.bedNumber)
      : undefined;

  if (matrixData?.floors && Array.isArray(matrixData.floors)) {
    for (const floor of matrixData.floors) {
      for (const room of floor.rooms || []) {
        for (const bed of room.beds || []) {
          const tenantMatch =
            tenantId && bed.currentTenant?._id && bed.currentTenant._id === tenantId;
          const nameMatch =
            !tenantId &&
            tenantName &&
            bed.currentTenant?.fullName &&
            bed.currentTenant.fullName.trim().toLowerCase() === tenantName.trim().toLowerCase();
          const bedIdMatch = currentBedId && bed._id && bed._id === currentBedId;
          const bedNumMatch = currentBedNumber && bed.bedNumber === currentBedNumber;

          if (tenantMatch || bedIdMatch || nameMatch || bedNumMatch) {
            const rNum = room.roomNumber || defaultRoom;
            const bNum = bed.bedNumber || defaultBed;
            return {
              roomNumber: rNum,
              bedNumber: bNum,
              formattedLabel: `${rNum} · Bed ${bNum}`,
              bedLabel: `Bed ${bNum}`,
            };
          }
        }
      }
    }
  }

  // 3. Inspect currentBed object if available
  if (currentBed && typeof currentBed === 'object') {
    const rNum =
      typeof currentBed.room === 'object' && currentBed.room
        ? currentBed.room.roomNumber
        : typeof currentBed.room === 'string'
          ? currentBed.room
          : currentBed.roomNumber;
    const bNum = currentBed.bedNumber;

    if (rNum && bNum) {
      return {
        roomNumber: String(rNum),
        bedNumber: String(bNum),
        formattedLabel: `${rNum} · Bed ${bNum}`,
        bedLabel: `Bed ${bNum}`,
      };
    }

    if (bNum) {
      const bStr = String(bNum);
      if (bStr.includes('-')) {
        const inferredRoom = bStr.split('-')[0];
        return {
          roomNumber: inferredRoom,
          bedNumber: bStr,
          formattedLabel: `${inferredRoom} · Bed ${bStr}`,
          bedLabel: `Bed ${bStr}`,
        };
      }
      return {
        roomNumber: defaultRoom,
        bedNumber: bStr,
        formattedLabel: `${defaultRoom} · Bed ${bStr}`,
        bedLabel: `Bed ${bStr}`,
      };
    }
  }

  // 4. Inspect rawBedNo if it has bed number info (not just 'Bed')
  if (rawBedNo) {
    const trimmed = rawBedNo.trim();
    if (trimmed !== 'Bed' && trimmed !== 'bed' && trimmed.length > 0) {
      const clean = trimmed.replace(/^Bed\s*/i, '');
      if (clean.includes('-')) {
        const inferredRoom = clean.split('-')[0];
        return {
          roomNumber: inferredRoom,
          bedNumber: clean,
          formattedLabel: `${inferredRoom} · Bed ${clean}`,
          bedLabel: `Bed ${clean}`,
        };
      }
      if (clean) {
        return {
          roomNumber: defaultRoom,
          bedNumber: clean,
          formattedLabel: `${defaultRoom} · Bed ${clean}`,
          bedLabel: `Bed ${clean}`,
        };
      }
    }
  }

  // 5. Safe default matching Image 1
  return {
    roomNumber: defaultRoom,
    bedNumber: defaultBed,
    formattedLabel: `${defaultRoom} · Bed ${defaultBed}`,
    bedLabel: `Bed ${defaultBed}`,
  };
}
