#!/bin/sh
tail -f /tmp/kp17-probe.log | grep --line-buffered -aE "PAIR|STUCK"
