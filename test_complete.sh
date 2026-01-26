#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMTliNTRhNS04N2IxLTRiYWYtYWYyNC1iMjBlZGMzMmZkODQiLCJlbWFpbCI6InJvY2hha3N1bHVAZ21haWwuY29tIiwibmFtZSI6IkFyZXMgQU0iLCJ2ZXJpZmllZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSIsImlhdCI6MTc2ODMxNTg1NSwiZXhwIjoxNzY4NDAyMjU1fQ.HVmpWtp9zXyklV0WGmeN9MI6Zzlt19_VUQv8rPHyFBw"
BASE_URL="http://localhost:3001"

# Create a new project for testing
PROJECT_RESPONSE=$(curl -s -X POST $BASE_URL/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Complete Test Project","description":"Full endpoint testing","visibility":"PUBLIC"}')
PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)

echo "========================================"
echo "TEST: POST /tasks - Create task (CORRECTED with servirity)"
echo "========================================"
TASK_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT_ID\",\"title\":\"Test Task\",\"description\":\"Test task description\",\"status\":\"TODO\",\"priority\":\"MEDIUM\",\"servirity\":\"MAJOR\"}")
echo "$TASK_RESPONSE"
TASK_ID=$(echo "$TASK_RESPONSE" | grep -o '"taskId":"[^"]*' | cut -d'"' -f4)
echo "Extracted Task ID: $TASK_ID"
echo ""

if [ -n "$TASK_ID" ]; then
  echo "========================================"
  echo "TEST: PATCH /tasks/:taskId - Update task"
  echo "========================================"
  curl -s -w "\nHTTP Status: %{http_code}\n" -X PATCH $BASE_URL/tasks/$TASK_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"Updated Test Task"}'
  echo ""

  echo "========================================"
  echo "TEST: PATCH /tasks/:taskId/status - Update task status"
  echo "========================================"
  curl -s -w "\nHTTP Status: %{http_code}\n" -X PATCH $BASE_URL/tasks/$TASK_ID/status \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"IN_PROGRESS"}'
  echo ""

  echo "========================================"
  echo "TEST: DELETE /tasks/:taskId - Delete task"
  echo "========================================"
  curl -s -w "\nHTTP Status: %{http_code}\n" -X DELETE $BASE_URL/tasks/$TASK_ID \
    -H "Authorization: Bearer $TOKEN"
  echo ""
fi

echo "========================================"
echo "TEST: POST /projects/:projectId/members - Add member (non-existent user)"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/projects/$PROJECT_ID/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"00000000-0000-0000-0000-000000000000","role":"MEMBER"}'
echo ""

echo "========================================"
echo "TEST: PATCH /projects/:projectId/members/:userId/role - Change member role"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X PATCH $BASE_URL/projects/$PROJECT_ID/members/219b54a5-87b1-4baf-af24-b20edc32fd84/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"LEAD"}'
echo ""

echo "========================================"
echo "TEST: DELETE /projects/:projectId/members/:userId - Remove member"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X DELETE $BASE_URL/projects/$PROJECT_ID/members/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "========================================"
echo "TEST: DELETE /projects/:projectId - Delete project"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X DELETE $BASE_URL/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
echo ""

