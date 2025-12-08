@echo off
SET BACKEND=http://localhost:5000
echo Using backend: %BACKEND%

echo Ensuring dev user...
curl.exe -s -X POST "%BACKEND%/dev/ensure-user" -H "Content-Type: application/json" -d "{\"userId\":\"dev-user\",\"email\":\"dev@local.test\",\"name\":\"Dev User\"}"
echo.

echo Ensuring assessment...
curl.exe -s -X POST "%BACKEND%/dev/seed-assessment" -H "Content-Type: application/json" -d "{\"assessmentId\":\"local-test\",\"questionId\":\"local-q\",\"userId\":\"dev-user\"}"
echo.

echo Minting token (GET /dev/mint-token?user_id=dev-user)...
curl.exe -s "%BACKEND%/dev/mint-token?user_id=dev-user"
echo.

echo Done.
