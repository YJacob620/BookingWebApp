/* Re-export utility functions from all utility files */
export * from './bookingRequestUtil';
export * from './dbUtils';
// export * from './emailService';
export * from './types';


import crypto from 'crypto';
/**
 * Generate a random token for various uses
 * @returns Random token
 */
export const generateToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};