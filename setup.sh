#!/bin/bash
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 4000
sudo cp shots-server.service /etc/systemd/system/shots-server.service
sudo systemctl enable shots-server.service
sudo systemctl stop shots-server
sudo systemctl start shots-server
