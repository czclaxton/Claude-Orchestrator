#!/usr/bin/env bash
# Sync the installed plugin to whatever is on the marketplace source.
#
# Safe to run any time. Reports what actually changed rather than what the
# update command claims — this repo has a logged failure where every stage of
# plugin delivery exits zero while the running copy stays stale.
set -uo pipefail

PLUGIN="claude-orchestrator"
QUALIFIED="${PLUGIN}@${PLUGIN}"
read_installed() {
  python -c "
import json,os,sys
p=os.path.expanduser('~/.claude/plugins/installed_plugins.json')
try:
    d=json.load(open(p,encoding='utf-8'))
    e=d['plugins']['$QUALIFIED'][0]
    print(e.get('version','?'), e.get('gitCommitSha','?')[:7])
except Exception:
    print('none none')
"
}

before=$(read_installed)
echo "installed before : $before"

claude plugin marketplace update "$PLUGIN" >/dev/null 2>&1 \
  && echo "marketplace      : refreshed" \
  || echo "marketplace      : refresh FAILED"

out=$(claude plugin update "$QUALIFIED" 2>&1)
echo "$out" | tail -1 | sed 's/^/update           : /'

after=$(read_installed)
echo "installed after  : $after"

# Verify the effect, not the exit code.
if [ "$before" = "$after" ]; then
  echo
  echo "RESULT: no change. Either you were already current, or the update did not land."
  echo "        If you expected a change, check that the merge is actually on the"
  echo "        marketplace source branch."
  exit 0
fi

ver=$(echo "$after" | cut -d' ' -f1)
cache=$(python -c "import os;print(os.path.expanduser(r'~/.claude/plugins/cache/$PLUGIN/$PLUGIN/$ver'))")
echo
if [ -d "$cache" ]; then
  echo "RESULT: updated to $after"
  echo "        cache dir present: $cache"
  echo "        agents present   : $(ls "$cache/agents" 2>/dev/null | wc -l) file(s)"
else
  echo "RESULT: version record says $ver but its cache directory is MISSING."
  echo "        Do not trust this install. Expected: $cache"
  exit 1
fi

echo
echo "Restart your sessions to pick it up — a running session keeps the copy it started with."
