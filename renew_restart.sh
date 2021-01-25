#!/bin/bash
cd /home/ubuntu/shots-server
certbot certonly --manual --manual-auth-hook ./authenticator.sh -d shotsarcheryapp.com -d www.shotsarcheryapp.com --manual-public-ip-logging-ok -n
systemctl stop shots-server
systemctl start shots-server
