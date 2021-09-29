#!/bin/bash
#pid=`cat pid.txt`
#name=`ps -p $pid -o comm=`
#if [[ $name == *"node"* ]]; then
#  kill -9 $pid
#  echo "Service shut down"
#else
#  echo "no node process with pid "$pid
#fi
systemctl stop walletsmith-server
