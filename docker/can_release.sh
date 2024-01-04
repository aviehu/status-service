#!/bin/sh

LATEST_TAG=`git describe --tags --abbrev=0`
FILES_CHANGED=`git diff --name-only HEAD $LATEST_TAG`

if [ -n "$(git status --untracked-files=no --porcelain)" ]; then
    echo "Can't release when dirty "
    exit 1
fi

if [ -n "$FILES_CHANGED" ]; then
  echo "Can't release when commit isn't tagged"
  exit 1
fi

exit 0
