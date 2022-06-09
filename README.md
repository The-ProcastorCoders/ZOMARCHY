# ZOMARCHY

This a zombie shooting game made using the [three.js](https://github.com/mrdoob/three.js/) 3D library with [WebGL enabled](http://get.webgl.org/).

**Controls:**
 - W:  move foward
 - A: look left
 - S: MOVE BACK
 - D: LOOK RIGHT
 - SHIFT: RUN

**Must kiil all zombies before time limit to win** 

Design Style:
*Scene graph modelling*
A scene graphic modelling approach was the basis used to design the game. 
Where the components of each level form a structure. Each object of the scene 
was combined to form a more complex scene such that each level was first 
modelled by adding a camera and light. This is being a perspective camera, 
directional light, and an ambient light to illuminate the scene to be able to 
view it.

A BoxGeometry was then added to be able to create a mesh that is textured to 
provide the skybox. The skybox was initially done by using a 
THREE.textureLoader but it did not allow for the skybox to rotate which was 
then fixed by adding an imagePath and a BoxGeometry. This then allowed us to 
add the rotate function to the animate function. 
Following a textured geometric plane to provide the terrain for succeeding 
objects to be placed on.

Various inanimate objects were added to each level using a GLTF loader. This 
was done because GLTF loaders contains the complete 3D scene descriptions 
such that there is no essential need for an exterior level editor. This decision 
was chosen based on research that a GLTF is used for rendering and is more 
modern such as can handle mesh compression which could possibly come in 
handy at a later stage when creating the complex scene further as opposed to 
for example OBJ. 

Additional lighting was then added positionally placed around the architecture
where it was needed such as the streetlights in the scenes. This was done with
a point light as it was most suitable to imitate a light bulb given it emits a light 

from a single point in all directions compared to other lighting options. 
Mixamo models were then added to the scene, the choice to use mixamo 
model was because the models are rigged, textured and animated already. 
A third person perspective view was then added to the scene as the default to 
be able to focus on the main character of the scene and to follow the soldier 
around with controls to move the soldier. The movement of the character was 
done using an event handler.

Ray casting was then used over ammo.js because ammo.js makes physical 
objects solid which would require more space on memory which would 
increase loading time and as well requires building a separate mesh for the 
scene. Ray casting does not require a sperate mesh and works by using the 
player distance between the player and the object in the scene which made 
the loading time decrease which benefitted the playability of the game. 
Special effects were then added such as the fog. Which was done using the 
gltfMeshStandardSGMaterial by setting .fog to true. The rain was added by 
using THREE.geometry , THREE.vector and velocity. A loop was added to create 
the rain effect for 200000 ‘rain drops’. The blue lighting effect was created by 
using a point light and .power for the flash effect set randomly.
A mini map was added to the scene by using an orthographic camera and 
adding that to the scene. .setScissor was used to set the mapCamera to the top 
right side of the screen. This was done instead of adding the mapCamera to the 
initial camera as it gave many errors and was fixed by rendering both cameras 
separately to the scene. 
What we would have done differently in the game design is to put all the
classes in a separate folder each for a different level to increase the OOP of the 
game design and add functionality to allow the main model to be able to look 
up and down instead of only left and right

I'm documenting the process I went through/am going through in using threejs by doing an incremental video series. The results produced in each video are also available in the links below.

**Credits:**
 -  [Minimap](http://stemkoski.github.io/Three.js/Viewports-Minimap.html)
 -  [Gun Model](https://www.turbosquid.com/3d-models/3d-fn-scar-l-pbr-1798835)
 - [Bulllet shooting](https://www.youtube.com/watch?v=nsg0qFu3aso) 
 - [Realistic Rain Effect Three.js Tutorial](https://www.youtube.com/watch?v=1bkibGIG8i0)
 - [All gltf models from](https://sketchfab.com/feed)
 - [Soldier and gun model from](https://www.mixamo.com/#/)
 - [Immersive 3D Audio and Visualization (three.js & javascript)](https://www.youtube.com/watch?v=1S7ke6F8sV4)
 - [Building a Simple First Person Camera](https://www.youtube.com/watch?v=oqKzxPMLWxo)
 - [Adding weapon to character hand](https://discourse.threejs.org/t/adding-weapon-to-character-hand/30702)
 - [SimonDev 3D RPG game](https://www.youtube.com/watch?v=SBfZAVzbhCg&t=547s)
 - [Loadingscreen](https://hackernoon.com/u15-latest-and-best-loading-animations-to-make-user-enjoy-waiting-9c7861ed5d47)
 - [Music](https://downloads.khinsider.com/game-soundtracks/album/overlive-zombie-survival-rpg-android-game-music/music_arpedtriumphant.mp3)
 - [Logo](https://flyclipart.com/evil-halloween-hand-undead-zombie-icon-zombie-hand-png-427012)
