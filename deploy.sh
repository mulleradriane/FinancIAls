#!/bin/bash
set -e
git pull
cd frontend
npm run build
cd ..
docker-compose up -d --build app
docker-compose restart nginx