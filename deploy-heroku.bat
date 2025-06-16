@echo off
echo Deploying File Tracking System to Heroku...
echo.

echo Step 1: Adding files to git...
git add .

echo Step 2: Committing changes...
git commit -m "Deploy to Heroku - %date% %time%"

echo Step 3: Pushing to GitHub...
git push origin master

echo Step 4: Pushing to Heroku...
git push heroku master

echo.
echo Deployment complete!
echo Opening your app...
heroku open

pause