#!/bin/bash

BASE_URL="http://localhost:3001"

echo "========================================"
echo "TEST: POST /users/register - Register new user"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test123!@#","name":"Test User"}'
echo ""

echo "========================================"
echo "TEST: POST /otp/generate - Generate OTP"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/otp/generate \
  -H "Content-Type: application/json" \
  -d '{"email":"rochaksulu@gmail.com"}'
echo ""

echo "========================================"
echo "TEST: POST /otp/resend - Resend OTP"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/otp/resend \
  -H "Content-Type: application/json" \
  -d '{"email":"rochaksulu@gmail.com"}'
echo ""

echo "========================================"
echo "TEST: POST /otp/verify - Verify OTP (with wrong OTP)"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"rochaksulu@gmail.com","otp":"123456"}'
echo ""

echo "========================================"
echo "TEST: POST /users/verify-email - Verify email (with wrong OTP)"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/users/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"rochaksulu@gmail.com","otp":"123456"}'
echo ""

echo "========================================"
echo "TEST: POST /auth/login - Login"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rochaksulu@gmail.com","password":"wrongpassword"}'
echo ""

echo "========================================"
echo "TEST: POST /projects/accept-invitation - Accept invitation (no token)"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/projects/accept-invitation \
  -H "Content-Type: application/json"
echo ""

echo "========================================"
echo "TEST: POST /projects/accept-invitation - Accept invitation (with fake token)"
echo "========================================"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$BASE_URL/projects/accept-invitation?token=fake-token-123"
echo ""

