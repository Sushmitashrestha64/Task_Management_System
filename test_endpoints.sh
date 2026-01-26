#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMTliNTRhNS04N2IxLTRiYWYtYWYyNC1iMjBlZGMzMmZkODQiLCJlbWFpbCI6InJvY2hha3N1bHVAZ21haWwuY29tIiwibmFtZSI6IkFyZXMgQU0iLCJ2ZXJpZmllZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSIsImlhdCI6MTc2ODMxNTg1NSwiZXhwIjoxNzY4NDAyMjU1fQ.HVmpWtp9zXyklV0WGmeN9MI6Zzlt19_VUQv8rPHyFBw"
BASE_URL="http://localhost:3001"

echo "========================================"
echo "1. GET / - Root endpoint"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET $BASE_URL/
echo ""

echo "========================================"
echo "2. GET /users/profile - Get current user"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET $BASE_URL/users/profile -H "Authorization: Bearer $TOKEN"
echo ""

echo "========================================"
echo "3. GET /users/profile/me/:userId - Get user profile by ID"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET $BASE_URL/users/profile/me/219b54a5-87b1-4baf-af24-b20edc32fd84 -H "Authorization: Bearer $TOKEN"
echo ""

echo "========================================"
echo "4. GET /projects - Get all projects"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET $BASE_URL/projects -H "Authorization: Bearer $TOKEN"
echo ""

echo "========================================"
echo "5. POST /projects - Create project"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Test Description","isPublic":true}'
echo ""

