import * as crypto from 'crypto';

/**
 * Hash a password using a secure one-way hashing algorithm
 * 
 * @param password The plaintext password to hash
 * @returns A string containing the hashed password and salt
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = crypto.randomBytes(16).toString('hex');
  
  // Use PBKDF2 with 1000 iterations and SHA-256 to hash the password
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 1000, 64, 'sha256', (err, derivedKey) => {
      if (err) return reject(err);
      
      // Return the hash and salt concatenated with a period delimiter
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

/**
 * Compare a plaintext password with a previously hashed one
 * 
 * @param plainPassword The plaintext password to verify
 * @param hashedPassword The previously hashed password
 * @returns True if the passwords match, false otherwise
 */
export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Extract the original salt
    const [hash, salt] = hashedPassword.split('.');
    
    // Hash the plaintext password with the same salt
    crypto.pbkdf2(plainPassword, salt, 1000, 64, 'sha256', (err, derivedKey) => {
      if (err) return reject(err);
      
      // Compare the new hash with the stored hash
      resolve(derivedKey.toString('hex') === hash);
    });
  });
}