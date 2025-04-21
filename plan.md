# Project Plan

I am planning on building a simple little "country game" that me and my friends can play in the browser. This document will describe how I want this game built. The features I want it to have, and the implementation process.

## Game Information

The name of the game is WorldConquest. This will be a fairly simple historical style game. There will be a map of part of the world, and the players will play as countries. The gameplay loop consists of taking your turn, doing actions such as building buildings, moving armies, hiring troops, managing diplomacy, ect. When you are done with your turn it will pass to the next player until it gets back around to the first player and time will advance. Battles will be played outside in another game that simulates the battles and the results will be fed into this game. 

## Game Features
In this section I am going to give a fairly comprehensive overview of all of the features of the game, and what they will need.
### Map Interface:

 - Made up of provinces
 - Can move around the map (WASD, Arrow Keys, Middle Mouse Drag, Mouse on the Edge of the Screen)
 - Provinces colored according to who owns them
 - Name of country displayed across map when zoomed out, and then fades when zoomed in.
 - Shows armies
 - Interactive, clicking provinces will bring up information about them, can see and order troops on the map, etc
 - Borders drawn between provinces, etc
### Provinces

 - Hold information such as 
    - Who owns them
    - What troops are inside them
    - What buildings are built inside it
    - What level is it (countryside, village, town, city, etc)
    - Religion of province
    - etc
  - Countries Own them
  - Can be land or water, water cannot be owned by a country
  - Can be unowned or unable to be owned (wastelands)
  - Interactive, clicking them on the map will display a menu
  - Can have unrest if people inside the province are unhappy with who owns them
 - You can upgrade the level of a province using money

 ### Countries
  - Have a display name, an ID, a color (used for provinces), money, and other metrics
  - Are controlled by a player
  - Have relationships with other countries, such as neutral, at-war, allies, non-agressive, etc.
  - Certain information is restricted to the player of the country (troop location, money amount, etc)
  
 ### Armies
  - When 2 armies of countries that are at war occupy a province at the same time, a battle will start
  - Each army can move up to 5 provinces per turn
  - Armies are created when you hire a general, and then you hire troops to add to the army through a menu
  - When a battle occurs a menu will pop up to have the results of the battle from outside the game typed in, this number will be casualties. 10% of casualties for the loser are prisoners of war and the winner will get the option of what to do with these. 0% of the winners are prisoners, after the battle the remaining soldiers will consolidate as much as possible, units with <50% remaining men will die and >= 50% remaining will go back to 100% capacity. The loser will get to roll a dice that is weighted towards higher numbers, 1-5 deciding how far they can retreat, and the winner will be come the owner of the province the battle occurred at. 
  - Every province has a built in garrison based on its level. The player can order an army to attack the garrison to control the province. If the attacker wins then the garrison dies no matter what the causality count is and does not retreat. 

### Turn taking
 - Every turn a player can take actions until they are done. They can move armies until they all run out of moves, they can built buildings or upgrade provinces until they run out of money, etc. Once they are done they will press the "Done" button and the turn will advance to the next player
 - When all players have taken a turn the date will advance 3 months, and the beginning of the turn will be calculated for each player.
 - To calculate the turn every player adds up how much money they generate from each province they own minus how many expenses they have from hired men and pending actions (some actions can take longer than 1 turn). They also roll for the chance of rebels spawning from any province with unrest. 
 
 ### Diplomacy
 - Countries have relations with each other and default to neutral
 - You can be allies where any wars started by you or against you they will be called in
 - You can have a defensive alliance where any wars started against you they will join
 - You can have At war which means two countries are currently in a war with each other
 - You can do certain diplomatic actions such as giving money
 - Two countries that are at war can submit peacedeals to each other which when accepted will make both go back to neutral and add a truce preventing them from waring for a set amount of time.
 - Peacedeals can include transfering ownership of provinces (both ways, giving and taking), and giving / taking money
 - If multiple countries are in a side in a war then the one who started the war on the attacking side and the one who got declared on the defending side will be the war leaders, and only they can send peace offers.

### Technology
 - Units need to be unlocked by researching them. Provinces that are a certain level or higher can research units of a certain level or higher and once you research a unit you can build them in your armies
 - Researching takes 3 years (12 turns) 
 - You start with all level 0 units researched, and you can't research level n units without first having researched all level n - 1 units


## Technical Stack
This game is web based, and such isn't going to be developed using a game engine. It is also mostly information based so it doesn't need much of that

## Frontend
The frontend for this game is based on a normal website. I want a HTML5 canvas where the map will be rendered and most interactivity happens, but then also side menus for things like province management, troop hiring, game chat, diplomacy, etc. Most of the logic will be javascript, but I would rather use typescript as it is much more type friendly and easier to build off of so the javascript used will be compiled from typescript.

## Backend
The backend for this game is going to be written in C# using ASP.NET. It will manage lobbies, players connecting and disconnecting, api calls, game state, etc. The players will make calls to the backend based on what their local gamestate is, and then the backend will process those calls and then rely the outcome to all the players.

## Technical Game Flow Example
1. User connects to website, backend serves frontend files
2. The user joins or creates a lobby, that lobby is now publically accessable to other players looking to join
3. They get the current gamestate from the backend and it loads into their frontend
4. Pick their country, get set up, etc now it is there turn
5. They choose to build a building, they select the button to do so on the front end and a SignalR call is made to the backend
6. The backend verifies that they are in fact allowed to build that building (checking how much money they have, do they own the province, etc) and either denies the request or accepts it
7. Upon accepting the server transmits a SignalR call to all clients alerting them of the action and updating their game states.
8.  The front end does what it needs to do to update things (reload province screen, play animations, etc)

## Technical Features
These are not really "game" features but are features that will need implemented
 
 - Lobby system. Players will need to be able to create lobbies and the server will have multiple games going at once each with it's own game state.
 - Players should be able to drop in and out of games and have things do on as intended. 
 - Players will need to be able to save the GameState and be able to load it into future lobbies (to continue playing where they left off) this gamestate file will likely be a .json file
 - The frontend should have 3 main vertical sections. The first will be a header that shows info like the date, whos turn it is, how much money you have and the done button for your turn. The middle section will be the main section and it will contain 2 menus on either side of the middle and the HTML canvas in the middle.
 - Lastly there will be the game chat at the bottom under the menus and the canvas.
 - All actions by the front end should have server side checks to prevent cheating.
 - Ally chat, typing /ally before a chat makes it only go out to allied players (players who countries are allied to the player sending the chat)







 



