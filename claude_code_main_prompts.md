I will tell you the plan for this new project, and you will help me in chosing the stack of tools, the architecture and then the  
claude.md and a plan. the idea is to participate in a challenge the conditions of which are described in the                        
challenge_instructions.md, which is basically to build a web pac-man game, but I want to go a step further and instead of do the    
classic 2d version of it, I want to do something similar but in 3d, using at least react and three-fiber (the 3js on react if I'm   
now wrong), and any other tool you think we need, trying to be as simple as possible. This web will be running on my hetzner vps    
under traefik, the traefik deployment has its own repo (check it to understand how i deploy other projects in it:                   
code/traefik_vps_infra), and also you can see one of the projects i already deployed in it which is my basic website                
(code/enricd_dot_com), or this other more complex project (code/erni_llm_prompt_challenge), you will see that they have their own   
dockerfiles and docker-compose, and also github workflow, so this will need to do something similar to be automatically deployed in 
 my vps from every push to github main branch. I want this game to be 3d, like the pac-man maze walls but in 3d, and the main       
character that you control with the arrows for now, and this 3d maze will be like a building of an office, and each level will be a 
 new floor of the building, so when the user completes one a door to the elevator opens and they can go up or down (one level more  
or less), starting at level 0 in the main floor, let's do 10 levels for now. later I want to make it online with websockets so      
multiple players connecting at the same time to my game can see each other, but after validating previous features of the game. an  
important thing of this is that I'm more familiarized to python and fastapi, so I want to learn/refresh react and ts doing this     
project. so for every tool you will need to use, very important: check the latest docs and examples of it, don't trust your memory, 
 make sure you are using latest stable version of each tool, check its docs and build your skill md files under ./.claude/skills/   
so you have in there your own up to date reliable docs, and then, a part from building this project following this rule, always     
create docs in markdown that explain each feature and code you generate, but also in a tutorial-like way that allows me to learn    
specially ts and react, but also advanced or complex concepts later of auth, ws in python/fastapi, etc. make sure to write these    
rules on claude.md