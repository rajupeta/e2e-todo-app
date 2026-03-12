#!/bin/sh
# Installs the CI workflow file to the correct GitHub Actions path.
# This script exists because the OAuth token lacks the 'workflow' scope
# required by GitHub to push files to .github/workflows/ directly.
#
# Usage: sh scripts/install-ci-workflow.sh

set -e

mkdir -p .github/workflows
cp ci-workflow-content.yml .github/workflows/ci.yml
rm ci-workflow-content.yml
echo "CI workflow installed at .github/workflows/ci.yml"
echo "You can now commit and push with a token that has the 'workflow' scope."
