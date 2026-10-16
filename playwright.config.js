import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({testDir:'./tests',workers:2,use:{baseURL:'http://127.0.0.1:5173',launchOptions:{executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']}},webServer:{command:'node scripts/server.mjs --dist',port:5173,reuseExistingServer:false},projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}]});
