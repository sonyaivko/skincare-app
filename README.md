# skincare-app

skincare recommendations and analysis app!

to use as a desktop app, run:
- npm install
- npm run dist 
- npm "dist/--/Make Skin Better.app"
- for example, if you are on mac, "dis/mac/Make Skin Better.app"
- note: for windows and different OS, folder structure will be different

to run on local host, run:
- npx serve 
- paste the copied link into your primary browser!

inside src: 
- /build
icons for desktop app logo 
- /project
index.html: landing/login page 
signup.html: sign-up page 
welcome.html: once logged in, the welcome page that contains face scan option
questionnaire.html: skincare multiple choice survey 
results.html: results of the survey 
results2.html: results from face scan 
script.js: shine heuristic and classification 
firebase-init.js: main FireBase Authentication import and configuration
