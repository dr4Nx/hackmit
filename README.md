
<img width="1500" height="680" alt="Frame 2" src="https://github.com/user-attachments/assets/ce7c60c8-a236-4228-8f98-2a8dc33c9572" />

# HackMIT 2025: Remy

### Real-time VLM-powered cooking mentor via Mentra smart glasses.

Tim, Adi, Nyx & Evan

<h3><a href="https://youtu.be/CMAqN5V02yY">Demo</a></h3>

<hr>

Remy is what all four of us wished we had when we first moved into our college apartments and had to cook for ourselves for the very first time. Between incessantly calling our parents and furiously googling recipes and ingredients, so much of our time and energy is spent on preparing our own meals, clearly a muscle we have not had the chance to exercise this intensely before coming to college. Despite this steep learning curve, cooking is a life skill. After all, food is one of the basic necessities of life. And what better time to learn how to cook than in college, a period in life where we are indeed expected to learn?

Not only that, we believe that learning should be fun. We believe that cooking should be fun. That got us thinking: what’s more fun than learning how to cook with a rat in your hat pulling your hair controlling you like a puppet? But we don’t have a rat, or a hat, or Linguini’s anatomy, drat. But we do have talking smart glasses...


### Technical Details

To build Remy, the most innovative and essential aspect we wanted to introduce was real-time vision and audio querying for cooking. 

We were able to introduce this by using Mentra’s Live Glasses, which allowed our user to ask questions about exactly what they see. These Glasses were configured via a MentraOS application on our phone that communicated with Ngrok to expose a local endpoint. 

From here, a typescript backend would interact with the typescript glasses SDK listening to the user and taking images. This typescript backend would then interact with a python backend written with FastAPI that was responsible for creating VLM, Websearch and general LLM API calls with Anthropic; alongside being the bridge between our front-end written in Svelte and Mentra Glasses.


### Future Work

- Fridge analysis: Remy could recommend recipes to create out of the items in a user’s fridge. Our plan would be to use computer vision models that use segmentation to identify what ingredients the user has, and based on this it would recommend multiple dishes the user can cook! 
- Health: steer our agentic websearch for recipes to work more towards healthier options. We were planning to achieve this by having a supervisor LLM that would guide the websearch agent by giving each recipe that we visit a healthscore and optimising search for this criteria. 
- Display on glasses: add the instructions provided by “little chef” to a display on the glasses. The glasses we used did not have a display on them, but we are aware that Mentra’s other models have displays and we would look forward to adding instructions to them in the future. 
- Persistent storage: Remy could improve user customizability by giving users individual accounts that save previously used recipes via a database, allowing users to easily practice their previous dishes, and perhaps even recommending similar ones in the future.
