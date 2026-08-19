#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const TESTING_CONFIG = path.join(CLAUDE_DIR, 'orchestrator-testing.md');
const RESET_SENTINEL = path.join(CLAUDE_DIR, 'orchestrator-reset-sentinel.json');
const DIAG_LOG = path.join(CLAUDE_DIR, 'orchestrator-hook-diag.log');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function maybeLogDiagnostic(argSubtype, raw) {
  if (process.env.CLAUDE_ORCHESTRATOR_DEBUG !== '1') return;
  try {
    const entry = `${new Date().toISOString()} arg=${argSubtype || '(none)'} stdin=${raw}\n`;
    fs.appendFileSync(DIAG_LOG, entry);
  } catch {
    // Diagnostics are best-effort only.
  }
}

function main() {
  const argSubtype = process.argv[2] || null; // "clear" when hooks.json's clear-matched entry invoked this
  const raw = readStdin();
  maybeLogDiagnostic(argSubtype, raw);

  const contextParts = [];

  if (fs.existsSync(TESTING_CONFIG)) {
    contextParts.push(
      'Claude Orchestrator testing mode is active (~/.claude/orchestrator-testing.md exists). ' +
      'Capture friction/findings about the orchestrator plugin itself during this session, described ' +
      'project-agnostically, and sweep them via /reset before your next /clear.'
    );
  }

  if (argSubtype === 'clear') {
    if (fs.existsSync(RESET_SENTINEL)) {
      try {
        fs.unlinkSync(RESET_SENTINEL);
      } catch {
        // Non-fatal: worst case the sentinel is consumed on a later run instead.
      }
    } else {
      contextParts.push(
        'Heads up: the previous session was cleared without running /reset first. Any findings or ' +
        'resume notes from that session were not swept and may be lost. Run /reset before your next /clear.'
      );
    }
  }

  if (contextParts.length > 0) {
    const output = {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: contextParts.join('\n\n'),
      },
    };
    process.stdout.write(JSON.stringify(output));
  }
}

main();
