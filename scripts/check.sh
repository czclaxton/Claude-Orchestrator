#!/usr/bin/env bash
# Structural checks for the claude-orchestrator plugin repo.
#
# Scope: mechanical facts about the shipped files only. Nothing here runs a model
# or asserts anything about whether a lane behaves correctly. See TEST-SUITE-PLAN.md.
#
# Usage:  bash scripts/check.sh            # compares version against origin/master
#         BASE_REF=master bash scripts/check.sh
#
# Exit 0 = every check passed or was explicitly skipped. Exit 1 = at least one failed.

set -uo pipefail

# Git for Windows rewrites "ref:path" arguments into Windows paths. Turn that off.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

cd "$(dirname "$0")/.." || exit 2

BASE_REF="${BASE_REF:-origin/master}"

if command -v python3 >/dev/null 2>&1; then PY=python3
elif command -v python >/dev/null 2>&1; then PY=python
else echo "FATAL: no python on PATH"; exit 2
fi

FAILED=0
SKIPPED=0

pass()  { printf '  PASS  %s\n' "$1"; }
fail()  { printf '  FAIL  %s\n' "$1"; FAILED=$((FAILED+1)); }
skip()  { printf '  SKIP  %s\n' "$1"; SKIPPED=$((SKIPPED+1)); }
head_() { printf '\n== %s\n' "$1"; }

# Route a python check's output through the standard ERR / SKIP / INFO handling.
report() { # report <failure-headline> <output>
  local headline="$1" out="$2"
  if printf '%s\n' "$out" | grep -q '^ERR '; then
    fail "$headline"
    printf '%s\n' "$out" | grep '^ERR ' | sed 's/^ERR /        /'
  elif printf '%s\n' "$out" | grep -q '^SKIP '; then
    skip "$(printf '%s\n' "$out" | grep '^SKIP ' | head -1 | sed 's/^SKIP //')"
  else
    pass "$(printf '%s\n' "$out" | grep '^INFO ' | head -1 | sed 's/^INFO //')"
  fi
}

# ---------------------------------------------------------------- 1. components
head_ "1. plugin components parse (claude plugin validate)"
if ! command -v claude >/dev/null 2>&1; then
  skip "claude CLI not on PATH - component validation not run"
else
  for dir in agents commands skills; do
    if out="$(claude plugin validate "./$dir" 2>&1)"; then
      pass "./$dir validates"
    else
      fail "./$dir failed validation"
      printf '%s\n' "$out" | sed 's/^/        /'
    fi
  done
  # The root invocation checks only the marketplace manifest. Run it too, but never
  # instead of the above: it passes clean while an agent file is unparseable.
  if rout="$(claude plugin validate . 2>&1)"; then
    pass "marketplace manifest validates"
  else
    fail "marketplace manifest failed validation"
    printf '%s\n' "$rout" | sed 's/^/        /'
  fi
fi

# ----------------------------------------------------------------- 2. manifests
head_ "2. manifests are well-formed and agree with each other"
man_out="$("$PY" - <<'PYEOF' 2>&1
import json, re
errs = []
try:
    p = json.load(open('.claude-plugin/plugin.json', encoding='utf-8'))
except Exception as e:
    print("ERR plugin.json does not parse: %s" % e); raise SystemExit
try:
    m = json.load(open('.claude-plugin/marketplace.json', encoding='utf-8'))
except Exception as e:
    print("ERR marketplace.json does not parse: %s" % e); raise SystemExit

for k in ('name', 'version', 'description'):
    if not p.get(k):
        errs.append("plugin.json is missing required key %r" % k)

v = p.get('version', '')
if not re.match(r'^\d+\.\d+\.\d+$', str(v)):
    errs.append("plugin.json version %r is not MAJOR.MINOR.PATCH" % v)

names = [e.get('name') for e in m.get('plugins', [])]
if p.get('name') not in names:
    errs.append("marketplace.json plugins[] %r does not list plugin.json name %r"
                % (names, p.get('name')))
if m.get('name') != p.get('name'):
    errs.append("marketplace.json name %r != plugin.json name %r"
                % (m.get('name'), p.get('name')))

for e in errs:
    print("ERR " + e)
print("INFO plugin.json + marketplace.json well-formed and consistent (v%s)" % v)
PYEOF
)"
report "manifest problems:" "$man_out"

# ------------------------------------------------------------------- 3. version
head_ "3. plugin.json version is ahead of the base branch"
cur_v="$(grep '"version"' .claude-plugin/plugin.json | head -1 | sed 's/.*: *"//;s/".*//')"
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  skip "base ref '$BASE_REF' does not exist here - cannot compare"
elif [ "$(git rev-parse HEAD)" = "$(git rev-parse "$BASE_REF")" ]; then
  skip "HEAD is $BASE_REF - nothing to compare (this check is for branches/PRs)"
else
  base_v="$(git show "$BASE_REF:.claude-plugin/plugin.json" 2>/dev/null \
            | grep '"version"' | head -1 | sed 's/.*: *"//;s/".*//')"
  if [ -z "$base_v" ]; then
    skip "could not read plugin.json version at $BASE_REF"
  elif "$PY" -c "import sys
t = lambda s: tuple(int(x) for x in s.split('.'))
sys.exit(0 if t(sys.argv[1]) > t(sys.argv[2]) else 1)" "$cur_v" "$base_v"; then
    pass "$cur_v > $base_v ($BASE_REF)"
  else
    fail "version $cur_v is not ahead of $base_v on $BASE_REF"
    echo "        Merging this would leave every installed copy on a stale cache:"
    echo "        'claude plugin update' skips re-syncing when version is unchanged."
  fi
fi

# ---------------------------------------------------------------- 4. model pins
head_ "4. routing tables agree with the agents' actual model pins"
pins_out="$("$PY" - <<'PYEOF' 2>&1
import glob, os, re
try:
    import yaml
except ImportError:
    print("SKIP pyyaml not installed"); raise SystemExit

pins = {}
for f in sorted(glob.glob('agents/*.md')):
    text = open(f, encoding='utf-8').read()
    if not text.startswith('---'):
        print("ERR %s has no frontmatter block" % f); continue
    end = text.find('\n---', 3)
    try:
        fm = yaml.safe_load(text[3:end])
    except Exception:
        # check 1 owns the parse error itself; do not double-report it
        print("ERR %s frontmatter does not parse, pin unknown" % f); continue
    name = (fm or {}).get('name') or os.path.basename(f)[:-3]
    model = (fm or {}).get('model')
    if not model:
        print("ERR %s declares no model pin" % f); continue
    pins[name] = str(model).strip().lower()

TABLES = ['README.md', 'skills/orchestration/SKILL.md']
seen = set()
for path in TABLES:
    if not os.path.exists(path):
        print("ERR %s missing" % path); continue
    for ln, line in enumerate(open(path, encoding='utf-8'), 1):
        if not line.lstrip().startswith('|'):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 3:
            continue
        for agent, pin in pins.items():
            if ('`%s`' % agent) in cells[2]:
                claimed = re.sub(r'[*`]', '', cells[1]).strip().lower()
                seen.add((path, agent))
                if claimed != pin:
                    print("ERR %s:%d routing table says %r for `%s`, "
                          "but agents/ pins it to %r" % (path, ln, claimed, agent, pin))
for path in TABLES:
    for agent in pins:
        if (path, agent) not in seen:
            print("ERR %s has no routing-table row naming `%s`" % (path, agent))
print("INFO pins agree with both routing tables: "
      + ", ".join("%s=%s" % kv for kv in sorted(pins.items())))
PYEOF
)"
report "routing tables disagree with the agent files:" "$pins_out"

# ----------------------------------------------- 5. advisor model named in prose
head_ "5. no shipped file names a model for the advisor that contradicts its pin"
prose_out="$("$PY" - <<'PYEOF' 2>&1
import glob, re
try:
    import yaml
except ImportError:
    print("SKIP pyyaml not installed"); raise SystemExit

text = open('agents/advisor.md', encoding='utf-8').read()
try:
    pin = str(yaml.safe_load(text[3:text.find('\n---', 3)])['model']).lower()
except Exception:
    print("SKIP advisor.md frontmatter unreadable - check 1 owns this"); raise SystemExit

files = (['README.md', 'CONTRIBUTING.md']
         + sorted(glob.glob('agents/*.md'))
         + sorted(glob.glob('commands/*.md'))
         + sorted(glob.glob('skills/*/SKILL.md'))
         + sorted(glob.glob('.claude-plugin/*.json')))
pat = re.compile(r'\b(sonnet|opus|fable)[- ]+(?:powered\s+)?advisor\b', re.I)
hits = 0
for f in files:
    try:
        lines = open(f, encoding='utf-8').readlines()
    except OSError:
        continue
    for ln, line in enumerate(lines, 1):
        for m in pat.finditer(line):
            if m.group(1).lower() != pin:
                hits += 1
                print("ERR %s:%d says %r advisor, but agents/advisor.md pins %r"
                      % (f, ln, m.group(1).lower(), pin))
print("INFO advisor pinned to %r; no shipped file contradicts it "
      "(%d contradicting mention(s))" % (pin, hits))
PYEOF
)"
report "a shipped file advertises the wrong advisor model:" "$prose_out"

# --------------------------------------------- 6. PR format defined exactly once
head_ "6. the PR body format is defined only in skills/pr-format/SKILL.md"
CANON='skills/pr-format/SKILL.md'
markers=('**TL;DR**' '**Deciding:**' '**Unverified:**' '**Alternatives:**' '**Decision**')
dup_found=0
if [ ! -f "$CANON" ]; then
  fail "$CANON is missing - the canonical definition does not exist"
else
  scope=(README.md CONTRIBUTING.md)
  for f in agents/*.md commands/*.md skills/*/SKILL.md; do
    [ "$f" = "$CANON" ] && continue
    scope+=("$f")
  done
  for f in "${scope[@]}"; do
    [ -f "$f" ] || continue
    for mk in "${markers[@]}"; do
      if grep -Fq -- "$mk" "$f" 2>/dev/null; then
        dup_found=1
        grep -Fn -- "$mk" "$f" | sed "s|^|        $f:|"
      fi
    done
  done
  if [ "$dup_found" -eq 0 ]; then
    pass "template markers appear only in $CANON"
  else
    fail "a second copy of the PR template exists (lines shown above)"
    echo "        A rule stated twice disagrees with itself, and the copy that"
    echo "        executes wins silently. Point at the skill instead of restating it."
  fi
fi

# --------------------------------------------------------------------- 7. hooks
head_ "7. hooks parse and every file they invoke exists"
hook_ok=1
if ! command -v node >/dev/null 2>&1; then
  skip "node not on PATH - hook syntax not checked"
  hook_ok=2
else
  for f in hooks/*.js; do
    [ -f "$f" ] || continue
    if ! nout="$(node --check "$f" 2>&1)"; then
      fail "$f is not valid JavaScript"
      printf '%s\n' "$nout" | sed 's/^/        /'
      hook_ok=0
    fi
  done
fi
if [ -f hooks/hooks.json ]; then
  refs="$("$PY" - <<'PYEOF' 2>&1
import json, os, re
try:
    d = json.load(open('hooks/hooks.json', encoding='utf-8'))
except Exception as e:
    print("ERR hooks/hooks.json does not parse: %s" % e); raise SystemExit
blob = json.dumps(d)
for rel in sorted(set(re.findall(r'CLAUDE_PLUGIN_ROOT\}/([A-Za-z0-9_./-]+)', blob))):
    if not os.path.exists(rel):
        print("ERR hooks.json invokes %s, which does not exist" % rel)
PYEOF
)"
  if printf '%s\n' "$refs" | grep -q '^ERR '; then
    fail "hooks.json points at something that is not there:"
    printf '%s\n' "$refs" | grep '^ERR ' | sed 's/^ERR /        /'
    hook_ok=0
  fi
fi
[ "$hook_ok" -eq 1 ] && pass "hooks/*.js parse and every \${CLAUDE_PLUGIN_ROOT} target exists"

# --------------------------------------------------------------------- summary
printf '\n----------------------------------------\n'
if [ "$FAILED" -eq 0 ]; then
  printf 'OK - all checks passed (%d skipped)\n' "$SKIPPED"
  printf 'This says the files are structurally sound. It says nothing about\n'
  printf 'whether the doctrine is right or any lane behaves correctly.\n'
  exit 0
else
  printf 'FAILED - %d check(s) failed (%d skipped)\n' "$FAILED" "$SKIPPED"
  exit 1
fi
