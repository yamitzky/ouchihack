#!/bin/sh

dbus-daemon --system
avahi-daemon -D
./bin/hubot -a slack
