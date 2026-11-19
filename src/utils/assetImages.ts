/* eslint-disable @typescript-eslint/no-require-imports */
import { ImageSourcePropType } from 'react-native';

export const PROPERTY_IMAGES: ImageSourcePropType[] = [
  require('../../assets/properties/property-1.png'),
  require('../../assets/properties/property-2.png'),
  require('../../assets/properties/property-3.png'),
];

// 2 Male & 2 Female avatars dedicated exclusively for Tenants (fixed)
export const TENANT_BOY_AVATARS: ImageSourcePropType[] = [
  require('../../assets/tenants/boy-1.png'),
  require('../../assets/tenants/boy-2.png'),
];

export const TENANT_GIRL_AVATARS: ImageSourcePropType[] = [
  require('../../assets/tenants/girl-1.png'),
  require('../../assets/tenants/girl-2.png'),
];

// 1 Male & 1 Female avatar dedicated exclusively for Admin / Owner
export const OWNER_AVATAR: ImageSourcePropType = require('../../assets/tenants/boy-3.png');
export const OWNER_AVATAR_FEMALE: ImageSourcePropType = require('../../assets/tenants/girl-3.png');

export const BOY_AVATARS: ImageSourcePropType[] = [
  TENANT_BOY_AVATARS[0],
  TENANT_BOY_AVATARS[1],
  OWNER_AVATAR,
];

export const GIRL_AVATARS: ImageSourcePropType[] = [
  TENANT_GIRL_AVATARS[0],
  TENANT_GIRL_AVATARS[1],
  OWNER_AVATAR_FEMALE,
];

// Alternating male & female for balanced variety
export const ALL_PROFILE_AVATARS: ImageSourcePropType[] = [
  BOY_AVATARS[0],
  GIRL_AVATARS[0],
  BOY_AVATARS[1],
  GIRL_AVATARS[1],
  BOY_AVATARS[2],
  GIRL_AVATARS[2],
];

/**
 * Simple hash helper to convert a string to a stable non-negative integer.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Common Indian female first names for accurate avatar gender selection
 */
const FEMALE_NAMES = new Set([
  'priya',
  'neha',
  'pooja',
  'ananya',
  'sneha',
  'shreya',
  'divya',
  'ritu',
  'swati',
  'kavya',
  'anjali',
  'megha',
  'tanvi',
  'deepika',
  'sunita',
  'radhika',
  'lakshmi',
  'aishwarya',
  'riya',
  'sanya',
  'bhavna',
  'nisha',
  'meera',
  'nikita',
  'ishita',
  'aditi',
  'simran',
  'aarti',
  'kriti',
  'rashmi',
  'sakshi',
  'rekha',
  'geeta',
  'preeti',
  'vandana',
  'komal',
  'monika',
  'shweta',
  'pallavi',
  'aarushi',
  'anita',
  'sapna',
  'sonali',
  'vidya',
  'archana',
]);

/**
 * Detects if a tenant is female based on property type, explicit gender, or name.
 */
export function isFemaleTenant(
  nameOrObj?: { fullName?: string; gender?: string; propertyType?: string } | string | null,
  propType?: string,
): boolean {
  if (!nameOrObj) return false;

  const propertyType = (
    typeof nameOrObj === 'object' ? nameOrObj.propertyType || propType : propType
  )?.toLowerCase();

  if (propertyType === 'girls') return true;
  if (propertyType === 'boys') return false;

  const gender = (typeof nameOrObj === 'object' ? nameOrObj.gender : '')?.toLowerCase();
  if (gender === 'female' || gender === 'f' || gender === 'girl') return true;
  if (gender === 'male' || gender === 'm' || gender === 'boy') return false;

  const fullName = (typeof nameOrObj === 'string' ? nameOrObj : nameOrObj.fullName || '')
    .trim()
    .toLowerCase();

  const firstName = fullName.split(' ')[0] || '';
  if (FEMALE_NAMES.has(firstName)) return true;

  // In test data like "Tenant Two", "Tenant 2", or if name contains girl/female
  if (fullName.includes('girl') || fullName.includes('female')) return true;

  // Hash distribution for mixed/coliving fallback: alternate smoothly
  const h = hashString(fullName || 'tenant');
  return h % 2 === 1;
}

/**
 * Returns a stable, deterministic property thumbnail image.
 */
export function getPropertyImage(
  property?: { _id?: string; name?: string } | string | null,
  index?: number,
): ImageSourcePropType {
  if (typeof index === 'number' && index >= 0) {
    return PROPERTY_IMAGES[index % PROPERTY_IMAGES.length];
  }

  const name = (typeof property === 'string' ? property : property?.name || '').trim();
  const id = typeof property === 'object' && property?._id ? property._id : name;

  // If name has 1, 2, or 3
  if (/1\b|first/i.test(name)) return PROPERTY_IMAGES[0];
  if (/2\b|second/i.test(name)) return PROPERTY_IMAGES[1];
  if (/3\b|third/i.test(name)) return PROPERTY_IMAGES[2];

  const h = hashString(id || 'property');
  return PROPERTY_IMAGES[h % PROPERTY_IMAGES.length];
}

/**
 * Returns the dedicated Admin / Owner avatar (the 3rd picture: boy-3 or girl-3).
 */
export function getOwnerAvatar(idOrName?: string, gender?: string): ImageSourcePropType {
  const isFemale =
    gender === 'female' ||
    gender === 'f' ||
    gender === 'girl' ||
    (idOrName ? isFemaleTenant(idOrName) : false);
  return isFemale ? OWNER_AVATAR_FEMALE : OWNER_AVATAR;
}

/**
 * Returns a profile avatar. If role is owner/admin, returns the dedicated owner avatar.
 */
export function getProfileAvatar(
  idOrName?: string,
  index?: number,
  role?: string,
): ImageSourcePropType {
  if (role === 'owner' || role === 'admin') {
    return getOwnerAvatar(idOrName);
  }
  if (typeof index === 'number' && index >= 0) {
    return ALL_PROFILE_AVATARS[index % ALL_PROFILE_AVATARS.length];
  }
  const h = hashString(idOrName || 'user');
  return ALL_PROFILE_AVATARS[h % ALL_PROFILE_AVATARS.length];
}

/**
 * Returns a stable, deterministic tenant avatar fixed to the 2 boy or 2 girl photos.
 */
export function getTenantAvatar(
  tenant?:
    { _id?: string; fullName?: string; gender?: string; propertyType?: string } | string | null,
  propertyType?: string,
): ImageSourcePropType {
  const isFemale = isFemaleTenant(tenant, propertyType);
  const idOrName =
    (typeof tenant === 'string' ? tenant : tenant?._id || tenant?.fullName || 'tenant').trim() ||
    'tenant';

  const h = hashString(idOrName);
  const pool = isFemale ? TENANT_GIRL_AVATARS : TENANT_BOY_AVATARS;
  return pool[h % pool.length];
}
