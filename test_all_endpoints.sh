#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMTliNTRhNS04N2IxLTRiYWYtYWYyNC1iMjBlZGMzMmZkODQiLCJlbWFpbCI6InJvY2hha3N1bHVAZ21haWwuY29tIiwibmFtZSI6IkFyZXMgQU0iLCJ2ZXJpZmllZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSIsImlhdCI6MTc2ODMxNTg1NSwiZXhwIjoxNzY4NDAyMjU1fQ.HVmpWtp9zXyklV0WGmeN9MI6Zzlt19_VUQv8rPHyFBw"
BASE_URL="http://localhost:3001"

echo "========================================" 
echo "5. POST /projects - Create project (CORRECTED)"
echo "========================================"
PROJECT_RESPONSE=$(curl -s -X POST $BASE_URL/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project API","description":"Test Description","visibility":"PUBLIC"}')
echo "$PROJECT_RESPONSE"
PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)
echo "Project ID: $PROJECT_ID"
echo ""

echo "========================================"
echo "6. GET /projects/:projectId - Get project details"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET $BASE_URL/projects/$PROJECT_ID -H "Authorization: Bearer $TOKEN"
echo ""

echo "========================================"
echo "7. PATCH /projects/:projectId - Update project"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X PATCH $BASE_URL/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Test Project"}'
echo ""

echo "========================================"
echo "8. POST /tasks - Create task"
echo "========================================"
TASK_RESPONSE=$(curl -s -X POST $BASE_URL/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT_ID\",\"title\":\"Test Task\",\"description\":\"Test task description\",\"status\":\"TODO\",\"priority\":\"MEDIUM\"}")
echo "$TASK_RESPONSE"
TASK_ID=$(echo "$TASK_RESPONSE" | grep -o '"taskId":"[^"]*' | cut -d'"' -f4)
echo "Task ID: $TASK_ID"
echo ""

echo "========================================"
echo "9. PATCH /tasks/:taskId - Update task"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X PATCH $BASE_URL/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Test Task"}'
echo ""

echo "========================================"
echo "10. PATCH /tasks/:taskId/status - Update task status"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X PATCH $BASE_URL/tasks/$TASK_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'
echo ""

echo "========================================"
echo "11. PATCH /users/profile/me - Update user profile"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X PATCH $BASE_URL/users/profile/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ares AM Updated"}'
echo ""

echo "========================================"
echo "12. POST /projects/:projectId/invite - Invite member"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/projects/$PROJECT_ID/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","role":"MEMBER"}'
echo ""

echo "========================================"
echo "13. POST /projects/:projectId/members - Add member directly"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/projects/$PROJECT_ID/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"00000000-0000-0000-0000-000000000000","role":"MEMBER"}'
echo ""

echo "========================================"
echo "14. DELETE /tasks/:taskId - Delete task"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X DELETE $BASE_URL/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "========================================"
echo "15. DELETE /projects/:projectId - Delete project"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X DELETE $BASE_URL/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
echo ""

