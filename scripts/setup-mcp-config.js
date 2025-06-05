#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function detectNodePath() {
  try {
    const nodeVersion = process.version;
    console.log(`${colors.green}✓ Detected Node.js version: ${nodeVersion}${colors.reset}`);
    
    const nvmDir = process.env.NVM_DIR;
    if (nvmDir) {
      try {
        const currentVersion = execSync('nvm current', { encoding: 'utf8' }).trim();
        const nodePath = path.join(nvmDir, 'versions', 'node', currentVersion, 'bin', 'node');
        if (fs.existsSync(nodePath)) {
          console.log(`${colors.green}✓ Using nvm Node.js at: ${nodePath}${colors.reset}`);
          return nodePath;
        }
      } catch (e) {
      }
    }
    
    console.log(`${colors.green}✓ Using Node.js at: ${process.execPath}${colors.reset}`);
    return process.execPath;
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Could not detect Node.js path, using default${colors.reset}`);
    return 'node';
  }
}

async function testStorybookConnection(url) {
  try {
    console.log(`${colors.blue}Testing connection to: ${url}${colors.reset}`);
    const response = await fetch(`${url}/iframe.html`);
    if (response.ok) {
      console.log(`${colors.green}✓ Successfully connected to Storybook${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠️  Storybook responded with status: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Failed to connect: ${error.message}${colors.reset}`);
    return false;
  }
}

async function main() {
  console.log(`${colors.bright}${colors.blue}🎨 MCP Design System Extractor Configuration Setup${colors.reset}\n`);

  const projectPath = path.resolve(__dirname, '..');
  const distIndexPath = path.join(projectPath, 'dist', 'index.js');

  const srcIndexPath = path.join(projectPath, 'src', 'index.ts');
  if (!fs.existsSync(distIndexPath) && fs.existsSync(srcIndexPath)) {
    console.log(`${colors.yellow}⚠️  Dist file not found. Building project...${colors.reset}`);
    try {
      execSync('npm run build', { cwd: projectPath, stdio: 'inherit' });
      console.log(`${colors.green}✓ Build completed${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.red}❌ Build failed. Please run 'npm run build' manually${colors.reset}`);
      process.exit(1);
    }
  }

  if (!fs.existsSync(distIndexPath)) {
    console.log(`${colors.red}❌ Dist file not found at: ${distIndexPath}${colors.reset}`);
    console.log(`${colors.yellow}Please run 'npm run build' first${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Found server dist at: ${distIndexPath}${colors.reset}\n`);

  console.log(`${colors.bright}Storybook Configuration:${colors.reset}`);
  console.log('1. Local development (http://localhost:6006)');
  console.log('2. Custom Storybook URL');
  
  const urlChoice = await question('\nSelect Storybook option (1-2): ');
  let storybookUrl = 'http://localhost:6006';
  
  switch (urlChoice) {
    case '1':
      storybookUrl = 'http://localhost:6006';
      break;
    case '2':
      storybookUrl = await question('Enter Storybook URL: ');
      if (!storybookUrl.startsWith('http')) {
        console.log(`${colors.red}❌ URL must start with http:// or https://${colors.reset}`);
        process.exit(1);
      }
      break;
    default:
      console.log(`${colors.red}Invalid option, using localhost${colors.reset}`);
  }

  console.log(`\n${colors.blue}Selected Storybook URL: ${storybookUrl}${colors.reset}`);

  const testConnection = await question('\nTest connection now? (y/n): ');
  if (testConnection.toLowerCase() === 'y') {
    const connected = await testStorybookConnection(storybookUrl);
    if (!connected) {
      const proceed = await question(`\n${colors.yellow}Connection failed. Continue anyway? (y/n): ${colors.reset}`);
      if (proceed.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        process.exit(0);
      }
    }
  }

  const nodePath = detectNodePath();
  
  console.log(`\n${colors.bright}Node.js Configuration:${colors.reset}`);
  console.log(`1. Use detected Node.js: ${nodePath}`);
  console.log(`2. Specify custom Node.js path`);
  console.log(`3. Use system default (node)`);
  
  const nodeChoice = await question('\nSelect option (1-3): ');
  let finalNodePath = nodePath;
  
  switch (nodeChoice) {
    case '2':
      finalNodePath = await question('Enter full path to Node.js executable: ');
      if (!fs.existsSync(finalNodePath)) {
        console.log(`${colors.yellow}⚠️  Path not found, using detected path${colors.reset}`);
        finalNodePath = nodePath;
      }
      break;
    case '3':
      finalNodePath = 'node';
      break;
  }

  const mcpConfig = {
    mcpServers: {
      "design-system-extractor": {
        command: finalNodePath,
        args: [distIndexPath],
        env: {
          STORYBOOK_URL: storybookUrl
        }
      }
    }
  };

  const platform = os.platform();
  let configPath;
  let configDir;

  if (platform === 'darwin') {
    configDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
    configPath = path.join(configDir, 'claude_desktop_config.json');
  } else if (platform === 'win32') {
    configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Claude');
    configPath = path.join(configDir, 'claude_desktop_config.json');
  } else {
    configDir = path.join(os.homedir(), '.config', 'claude');
    configPath = path.join(configDir, 'claude_desktop_config.json');
  }

  console.log(`\n${colors.bright}Configuration Options:${colors.reset}`);
  console.log('1. Save to Claude Desktop config');
  console.log('2. Display config (copy manually)');
  console.log('3. Save to custom file');
  
  const choice = await question('\nSelect option (1-3): ');

  switch (choice) {
    case '1':
      let existingConfig = {};
      if (fs.existsSync(configPath)) {
        try {
          existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (existingConfig.mcpServers && existingConfig.mcpServers['design-system-extractor']) {
            const overwrite = await question(`\n${colors.yellow}⚠️  'design-system-extractor' server already exists. Overwrite? (y/n): ${colors.reset}`);
            if (overwrite.toLowerCase() !== 'y') {
              console.log('Cancelled.');
              process.exit(0);
            }
          }
        } catch (error) {
          console.log(`${colors.yellow}⚠️  Could not read existing config, will create new one${colors.reset}`);
        }
      }

      const finalConfig = {
        ...existingConfig,
        mcpServers: {
          ...existingConfig.mcpServers,
          ...mcpConfig.mcpServers
        }
      };

      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2));
      console.log(`\n${colors.green}✅ Configuration saved to: ${configPath}${colors.reset}`);
      console.log(`\n${colors.yellow}⚠️  Restart Claude Desktop to apply changes${colors.reset}`);
      break;

    case '2':
      console.log(`\n${colors.bright}Copy this configuration to your Claude Desktop config:${colors.reset}\n`);
      console.log(JSON.stringify(mcpConfig, null, 2));
      break;

    case '3':
      const customPath = await question('Enter file path: ');
      fs.writeFileSync(customPath, JSON.stringify(mcpConfig, null, 2));
      console.log(`\n${colors.green}✅ Configuration saved to: ${customPath}${colors.reset}`);
      break;

    default:
      console.log(`${colors.red}Invalid option${colors.reset}`);
  }

  console.log(`\n${colors.bright}${colors.blue}Next Steps:${colors.reset}`);
  console.log(`1. Ensure Storybook is running at: ${colors.green}${storybookUrl}${colors.reset}`);
  console.log(`2. Restart Claude Desktop`);
  console.log(`3. Test with: "List all components from the design system"`);
  console.log(`4. Or try: "Get HTML for a button component"`);

  console.log(`\n${colors.blue}💡 Tip: You can change the Storybook URL anytime by running 'npm run setup' again${colors.reset}`);

  console.log(`\n${colors.bright}${colors.green}🎉 Setup completed successfully!${colors.reset}`);
  console.log(`\n${colors.blue}Available MCP tools:${colors.reset}`);
  console.log('• list_components - List all available components');
  console.log('• get_component_html - Extract HTML from components');
  console.log('• search_components - Search for specific components');
  console.log('• get_component_variants - Get all variants of a component');
  console.log('• get_component_styles - Analyze component styles');
  console.log('• compare_components - Compare two component variants');
  console.log('• analyze_component_usage - Analyze component usage patterns');
  console.log('• export_design_tokens - Export design tokens');

  rl.close();
}

main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});