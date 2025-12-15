
# Technical Assessment Platform

## Setup
### Backend
cd server
npm install express express-session multer
node server.js

## Usage
- Open http://localhost:5000/ in your browser
- Select languages and number of questions, then start the test
- After submitting, if you meet the threshold (70%) you'll be able to upload a resume (PDF/DOC/DOCX, max 2MB)

## Notes
- Questions are in `server/questions.json` and served by the backend
- Uploaded resumes are saved to `server/uploads`
