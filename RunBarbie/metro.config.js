const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Ensure Metro uses this folder as project root so node_modules (axios, etc.) resolve correctly
config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

module.exports = config;
