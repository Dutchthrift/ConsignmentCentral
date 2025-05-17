// Script to run the Supabase migration process
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if .env file exists and contains DATABASE_URL
function checkEnvFile() {
  console.log('Checking .env file for DATABASE_URL...');
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      console.log('No .env file found. Creating one...');
      fs.writeFileSync(envPath, 'DATABASE_URL=\n');
      return false;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf-8');
    if (!envContent.includes('DATABASE_URL=')) {
      console.log('DATABASE_URL not found in .env file. Adding it...');
      fs.appendFileSync(envPath, 'DATABASE_URL=\n');
      return false;
    }
    
    // Check if DATABASE_URL has a value
    const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
    if (!dbUrlMatch || !dbUrlMatch[1].trim()) {
      console.log('DATABASE_URL exists but has no value.');
      return false;
    }
    
    console.log('DATABASE_URL found in .env file.');
    return true;
  } catch (error) {
    console.error('Error checking .env file:', error.message);
    return false;
  }
}

// Update DATABASE_URL in .env file
function updateDatabaseUrl(url) {
  console.log('Updating DATABASE_URL in .env file...');
  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Replace existing DATABASE_URL or add it if it doesn't exist
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(/DATABASE_URL=(.*)/, `DATABASE_URL="${url}"`);
    } else {
      envContent += `\nDATABASE_URL="${url}"\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('DATABASE_URL updated successfully.');
    return true;
  } catch (error) {
    console.error('Error updating DATABASE_URL:', error.message);
    return false;
  }
}

// Run the migration script
async function runMigration() {
  console.log('Running migration script...');
  try {
    const module = await import('./migrate-to-supabase.js');
    await module.migrateData();
    console.log('Migration completed successfully.');
    return true;
  } catch (error) {
    console.error('Error running migration:', error.message);
    return false;
  }
}

// Switch to Supabase storage
function switchToSupabaseStorage() {
  console.log('Switching to Supabase storage...');
  try {
    // Identify files using memory-storage to update them
    const filesToCheck = [
      './server/routes.ts',
      './server/index.ts',
      './server/auth.ts'
    ];
    
    filesToCheck.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        
        // Look for memory-storage import and replace with storage-supabase
        if (content.includes('./memory-storage')) {
          content = content.replace(/(['"])\.\/memory-storage(['"])/g, '$1./storage-supabase$2');
          fs.writeFileSync(filePath, content);
          console.log(`Updated ${filePath} to use storage-supabase`);
        }
      }
    });
    
    console.log('Successfully switched to Supabase storage.');
    return true;
  } catch (error) {
    console.error('Error switching to Supabase storage:', error.message);
    return false;
  }
}

// Promisify readline question
function question(rl, query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Main function to run the migration process
async function main() {
  console.log('=== Supabase Migration Tool ===');
  
  // Check if .env has DATABASE_URL
  const hasDbUrl = checkEnvFile();
  
  if (!hasDbUrl) {
    try {
      // Prompt user for DATABASE_URL
      const url = await question(rl, 'Please enter the Supabase connection string (DATABASE_URL): ');
      
      if (!url.trim()) {
        console.error('No connection string provided. Migration cancelled.');
        return;
      }
      
      // Update .env with the provided URL
      if (!updateDatabaseUrl(url)) {
        console.error('Failed to update DATABASE_URL. Migration cancelled.');
        return;
      }
      
      console.log('Connection string saved. Starting migration...');
      
      // Run migration
      const migrationSuccess = await runMigration();
      if (!migrationSuccess) {
        console.error('Migration failed. Please check the error messages above.');
        return;
      }
      
      // Ask user if they want to switch to Supabase storage
      const answer = await question(rl, 'Migration successful! Do you want to switch to using Supabase storage now? (y/n): ');
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        if (!switchToSupabaseStorage()) {
          console.error('Failed to switch to Supabase storage.');
          return;
        }
        
        console.log('Great! The application is now using Supabase for storage.');
        console.log('Please restart your application for changes to take effect.');
      } else {
        console.log('Staying with current storage implementation. You can manually switch later by:');
        console.log('1. Updating import statements to use ./storage-supabase instead of ./memory-storage');
        console.log('2. Restarting the application');
      }
    } catch (error) {
      console.error('Error during migration process:', error);
    } finally {
      rl.close();
    }
  } else {
    try {
      // DATABASE_URL already exists, proceed with migration
      console.log('DATABASE_URL already configured. Starting migration...');
      
      // Run migration
      const migrationSuccess = await runMigration();
      if (!migrationSuccess) {
        console.error('Migration failed. Please check the error messages above.');
        return;
      }
      
      // Ask user if they want to switch to Supabase storage
      const answer = await question(rl, 'Migration successful! Do you want to switch to using Supabase storage now? (y/n): ');
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        if (!switchToSupabaseStorage()) {
          console.error('Failed to switch to Supabase storage.');
          return;
        }
        
        console.log('Great! The application is now using Supabase for storage.');
        console.log('Please restart your application for changes to take effect.');
      } else {
        console.log('Staying with current storage implementation. You can manually switch later by:');
        console.log('1. Updating import statements to use ./storage-supabase instead of ./memory-storage');
        console.log('2. Restarting the application');
      }
    } catch (error) {
      console.error('Error during migration process:', error);
    } finally {
      rl.close();
    }
  }
}

// Run the main function
main();