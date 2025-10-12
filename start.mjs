#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting E-Commerce application...');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found. Please create one with your database configuration.');
  console.log('Example .env content:');
  console.log('DATABASE_URL=postgresql://postgres:password@localhost:5433/E-Commerce');
  console.log('NODE_ENV=development');
  process.exit(1);
}

// Function to run command
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function start() {
  try {
    console.log('📦 Setting up database schema...');
    await runCommand('npm', ['run', 'db:push']);
    
    console.log('🌟 Starting server...');
    await runCommand('npx', ['tsx', 'server/index.ts']);
  } catch (error) {
    console.error('❌ Error starting application:', error.message);
    process.exit(1);
  }
}

start();