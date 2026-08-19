#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const COMMANDS_DIR = path.join(os.homedir(), '.claude', 'commands');

const ALIASES = {
  'wrap-up.md': 'Run the /claude-orchestrator:wrap-up command now.\n',
  'catch-up.md': 'Run the /claude-orchestrator:catch-up command now.\n',
};

function main() {
  const created = [];

  for (const [filename, body] of Object.entries(ALIASES)) {
    const target = path.join(COMMANDS_DIR, filename);
    if (fs.existsSync(target)) continue; // never overwrite something the user may have customized

    fs.mkdirSync(COMMANDS_DIR, { recursive: true });
    const content = `---\ndescription: alias\n---\n${body}`;
    fs.writeFileSync(target, content, 'utf8');
    created.push(filename);
  }

  if (created.length > 0) {
    const output = {
      systemMessage: `Claude Orchestrator: created short command aliases (${created.join(', ')}) in ~/.claude/commands/.`,
    };
    process.stdout.write(JSON.stringify(output));
  }
}

main();
