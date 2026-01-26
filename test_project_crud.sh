#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMTliNTRhNS04N2IxLTRiYWYtYWYyNC1iMjBlZGMzMmZkODQiLCJlbWFpbCI6InJvY2hha3N1bHVAZ21haWwuY29tIiwibmFtZSI6IkFyZXMgQU0iLCJ2ZXJpZmllZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSIsImlhdCI6MTc2ODMxNTg1NSwiZXhwIjoxNzY4NDAyMjU1fQ.HVmpWtp9zXyklV0WGmeN9MI6Zzlt19_VUQv8rPHyFBw"
BASE_URL="http://localhost:3001"

echo "========================================"
echo "1. POST /projects - Create project"
echo "========================================"
PROJECT_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"CRUD Test Project","description":"Testing project CRUD operations","visibility":"PUBLIC"}')
echo "$PROJECT_RESPONSE"
PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)
echo ""

echo "========================================"
echo "2. GET /projects - Get all projects"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET $BASE_URL/projects \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "========================================"
echo "3. GET /projects/:projectId - Get project by ID"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET $BASE_URL/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "========================================"
echo "4. PATCH /projects/:projectId - Update project"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X PATCH $BASE_URL/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"CRUD Test Project Updated","description":"Updated description","visibility":"PRIVATE"}'
echo ""

echo "========================================"
echo "5. GET /projects/:projectId - Verify update"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET $BASE_URL/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "========================================"
echo "6. DELETE /projects/:projectId - Delete project"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X DELETE $BASE_URL/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "========================================"
echo "7. GET /projects/:projectId - Verify deletion (should fail)"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET $BASE_URL/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
echo ""

