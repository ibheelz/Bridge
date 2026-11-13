#!/bin/zsh
# Keeps running auto-dev/run.sh. After a successful step it starts the next
# one a minute later; after a failure (usually: usage exhausted) it waits
# 30 minutes and tries again. Stops when auto-dev/STOP exists.
DIR="/Users/bheelz/Desktop/web-apps/Bridge/auto-dev"
while [ ! -f "$DIR/STOP" ]; do
  if "$DIR/run.sh"; then sleep 60; else sleep 1800; fi
done
