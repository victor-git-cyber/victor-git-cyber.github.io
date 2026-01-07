
window.addEventListener('load', function(){

console.log=function(){};
const SCALE = 27,PI = Math.PI;

//Camera values
const FOV = 45,ASPECT = window.innerWidth/window.innerHeight,NEAR = 0.1,FAR = 2000;

//Divs
var startButton = document.getElementById("playButton");
var instrButton = document.getElementById("instructButton");
var infButton = document.getElementById("infiniteButton");
var finger = document.getElementById("pointer");
var myMenu=document.getElementById("menu");
var myScore=document.getElementById("scoreId");
var instruct1=document.getElementById("instr1");
var instruct2=document.getElementById("instr2");
instructText=document.getElementById("instrText");
contText=document.getElementById("pressText");
var stageMenu=document.getElementById("menu2");
var stage1=document.getElementById("stage1");
var stage2=document.getElementById("stage2");
var stage3=document.getElementById("stage3");
var stage4=document.getElementById("stage4");
var stage5=document.getElementById("stage5");
var stage6=document.getElementById("stage6");
var stage7=document.getElementById("stage7");
var stage8=document.getElementById("stage8");
var stage9=document.getElementById("stage9");
var stage10=document.getElementById("stage10");
// Background audio (try to load if available, otherwise continue without)
var niceSong = new Audio('./assets/audio/background-music.mp3');
var audioLoaded = false;

//Variables
var alpha=0,paused=1;
var startX,startY,distX,distY,elapsedTime,startTime;
var minDist = 10; //required min distance traveled to be considered swipe
var allowedTime = 2000; // maximum time allowed to travel that distance
var swipeRightBol = 0,swipeLeftBol = 0,swipeUpBol = 0,swipeDownBol =0; //swipe boolean
var shapeValue=0,scoreCounter=30,speedVar=0.1*50,playingTutorial=0,groundValue=0; //some initial conditions
var diffTime = 0,currentDate=0,onClickDate=0,currentFinger=0,ground2var=0,playedTutorial=0;
var posValue=3,rotValue=1,posYValue=2,copyValue = 0,allowRot=1,allowPos=1,allowPosY=1,infVar=0,finishedGame=0,stageValue=0; //some more initial conditions
var motionText = "Horizontal",rotationText = "No"; //just some text

//Arrays
var patternPos = [-6,-4,-2,0,2,4,6];
var patternRot = [-Math.PI/2,0,Math.PI/2,Math.PI,];
var patternPosY=[-4,-2,0,2,4,6];
var shapeArray=["T","L","S"];
var copyPattern = [],realPattern = [],cube = [],groundArray=[];
var stageArray = [0,stage1,stage2,stage3,stage4,stage5,stage6,stage7,stage8,stage9,stage10];
var functionArray = [stage2function,stage3function,stage4function,stage5function,stage6function,stage7function,stage8function,stage9function,stage10function];
var cloudArray=[];
//Speed variable
var moreSpeed = 65;
var audioVar = 0;
var ua = navigator.userAgent.toLowerCase();
var isAndroid = ua.indexOf("android") > -1;

// Minimal swal polyfill if SweetAlert isn't loaded
if (typeof swal === 'undefined') {
    window.swal = function(opts){
        if (opts && opts.buttons) {
            return Promise.resolve(confirm((opts.title||'') + '\n\n' + (opts.text||'')));
        } else {
            alert((opts.title||'') + '\n\n' + (opts.text||''));
            return Promise.resolve(true);
        }
    };
}

var stageProgress=1;
var bestScore=0;

if(isAndroid==0) {
// Saving user progress:
//localStorage.clear();
stageProgress = parseInt(localStorage.getItem("stageProgressSave"));
if (isNaN(stageProgress) == true){
                  stageProgress = 1;
            }

bestScore = parseInt(localStorage.getItem("bestScoreSave"));
if (isNaN(bestScore) == true){
                  bestScore = 0;
            }
}
// ********** Creating the scene: **********
// Renderer
var renderer = new THREE.WebGLRenderer({ antialias: true }); //Creates a WebGL renderer using threejs library
renderer.setPixelRatio( window.devicePixelRatio ); //Prevents blurry output
renderer.setSize( window.innerWidth,window.innerHeight ); //Sets renderer size to the size of the window
renderer.setClearColor(0xA9F5F2, 1); //Makes the background color of the scene blue
renderer.shadowMapEnabled = true;
renderer.shadowMapSoft = true;
document.body.appendChild( renderer.domElement ); //Attaches renderer to DOM (initializes renderer)

var scene = new THREE.Scene(); //Creates an empty scene where we are going to add our objects

/*Camera*/
var camera = new THREE.PerspectiveCamera( FOV,ASPECT,NEAR,FAR ); //Creates a camera
camera.up.set( 0,0,1 ); //Sets the camera the correct direction
camera.rotation.x=-PI/2;
camera.position.x=-35;
camera.position.z=30;
// Use the correct method name: lookAt (capital A)
camera.lookAt(0,0,0); //Points the camera to the center of the scene
scene.add( camera ); //Adds the camera to the scene



// OrbitControls 

//Light
var ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight); //Adding ambient light
var light = new THREE.DirectionalLight( 0xffffff, 0.5);
light.position.set(-30, 0, 0);
light.castShadow = true;

var d = 10;
light.shadowCameraLeft = d;
light.shadowCameraRight = -d;
light.shadowCameraTop = d;
light.shadowCameraBottom = -d;
scene.add(light);

//Fog
var fogColor = new THREE.Color(0xA9F5F2);
scene.background = fogColor;
scene.fog = new THREE.Fog(fogColor, 48, 70);
        
var width  = 16.1; //width of ground
var length = 15; //length of ground

var geometry = new THREE.BoxGeometry( width, length,3); //ThreeJS function to create plane geometry

// No external textures: use simple colored materials
var groundMat1 = new THREE.MeshLambertMaterial({
    transparent: true,
    opacity: 1,
    color: 0xe6e6e6,
    side: THREE.DoubleSide
});
var groundMat2 = new THREE.MeshLambertMaterial({
    transparent: true,
    opacity: 1,
    color: 0xe6e6e6,
    side: THREE.DoubleSide
});

var ground = new THREE.Mesh( geometry, groundMat1 ); //Creates a mesh containing the geometry and groundmaterial just defined
ground.receiveShadow = true;
ground.rotation.y+=Math.PI/2;
ground.rotation.z+=Math.PI/2;
ground.position.x=20;

var ground2 = new THREE.Mesh( geometry, groundMat2 ); //Creates a mesh containing the geometry and groundmaterial just defined
ground2.receiveShadow = true;
ground2.rotation.y+=Math.PI/2;
ground2.rotation.z+=Math.PI/2;
ground2.position.x=0;


var cloudGeometry = new THREE.DodecahedronGeometry(6,1)
var cloudMaterial = new THREE.MeshLambertMaterial( {

color:0x00ff00,
transparent:true,
opacity:1

    
} );

var worldX = new THREE.Vector3( 1, 0, 0 );
var worldZ=new THREE.Vector3( 0, 1,0);

function spawnT(color1,color2,yPos,xRot,shad,xPos,zPos,myMaterial){
var geometry = new THREE.BoxGeometry( 1, 1, 2);

if (color1 == 0xA9F5F2){
    var material = new THREE.MeshBasicMaterial( {color:color1} );
    var material2 = new THREE.MeshBasicMaterial( {color:color2} );
}
else{
    var material = new THREE.MeshLambertMaterial( {color:color1} );
    var material2 = new THREE.MeshLambertMaterial( {color:color2} );
}
var cube = new THREE.Mesh( geometry, material );
cube.position.z=2;
cube.position.x=xPos;
cube.position.y=yPos;
cube.position.z=zPos;
cube.rotation.x=xRot;
scene.add( cube );

var cube2 = new THREE.Mesh( geometry, material2 );
cube2.rotation.x=PI/2;
cube2.position.z=-1.4;
cube.add( cube2 );

cube.castShadow = shad;
cube2.castShadow= shad;
cube.receiveShadow=false;
cube2.receiveShadow=false;
return cube;
}

function spawnL(color1,color2,yPos,xRot,shad,xPos,zPos){
var geometry = new THREE.BoxGeometry( 1, 1, 2);
if (color1 == 0xA9F5F2){
    var material = new THREE.MeshBasicMaterial( {color:color1} );
    var material2 = new THREE.MeshBasicMaterial( {color:color2} );
}
else{
    var material = new THREE.MeshLambertMaterial( {color:color1} );
    var material2 = new THREE.MeshLambertMaterial( {color:color2} );
}
var cube = new THREE.Mesh( geometry, material );
cube.position.z=2;

cube.position.y=yPos;
cube.position.x=xPos;
cube.position.z=zPos;
cube.rotation.x=xRot;

scene.add( cube );

var cube2 = new THREE.Mesh( geometry, material2 );
cube2.rotation.x=PI/2;
cube2.position.z=-1.4;
cube2.position.y=0.5;
cube.add( cube2 );

cube.castShadow = shad;
cube2.castShadow=shad;
cube.receiveShadow=false;
cube2.receiveShadow=false;
return cube;
}

function spawnS(color1,color2,yPos,xRot,shad,xPos,zPos){
var geometry = new THREE.BoxGeometry( 1, 1, 2);
if (color1 == 0xA9F5F2){
    var material = new THREE.MeshBasicMaterial( {color:color1} );
    var material2 = new THREE.MeshBasicMaterial( {color:color2} );
}
else{
    var material = new THREE.MeshLambertMaterial( {color:color1} );
    var material2 = new THREE.MeshLambertMaterial( {color:color2} );
}
var cube = new THREE.Mesh( geometry, material );
cube.position.z=2;

cube.position.y=yPos;
cube.position.x=xPos;
cube.rotation.x=xRot;
cube.position.z=zPos;
scene.add( cube );

var cube2 = new THREE.Mesh( geometry, material2 );
cube2.rotation.x=0;
cube2.position.z=-1;
cube2.position.y=0.5;
cube.add( cube2 );

cube.castShadow = shad;
cube2.castShadow=shad;
cube.receiveShadow=false;
cube2.receiveShadow=false;
return cube;
}

function spawnCloud(zValue,xValue,groundNum){
var cloud = new THREE.Mesh( cloudGeometry, cloudMaterial );
cloud.receiveShadow=true;

cloud.position.z=zValue;
cloud.position.x=xValue;

groundNum.add(cloud);

var treeGeometry = new THREE.BoxGeometry( 3, 3, 45);
var treeMaterial = new THREE.MeshLambertMaterial( {color:0xb35900} );
var tree= new THREE.Mesh( treeGeometry, treeMaterial );

cloud.add(tree);
tree.rotation.x+=Math.PI/2;
tree.position.y=-45/2;

}

//Support for wall
function spawnSupport(groundNum){
var supportGeometry = new THREE.BoxGeometry( 2, 2, 45);
var supportMaterial = new THREE.MeshLambertMaterial({
    color:0x8c8c8c
});
var support= new THREE.Mesh( supportGeometry, supportMaterial );
support.rotation.x+=Math.PI/2;
support.position.y=(-45/2)-(15/2)-0.1;
support.position.z=0.25;

groundNum.add(support);
}

//Main figure
cube[0]=spawnT(0xe6e600,0xe6e600,patternPos[posValue],patternRot[rotValue],true,0,0);
cube[1]=spawnL(0xff0000,0xff0000,patternPos[posValue],patternRot[rotValue],true,-35,0);
cube[2]=spawnS(0x0000ff,0x0000ff,patternPos[posValue],patternRot[rotValue],true,-35,0);

//Real pattern
realPattern[0]=spawnT(0xA9F5F2,0xA9F5F2,patternPos[posValue],patternRot[rotValue],false,30,0);
realPattern[0].position.x=ground.position.x;
realPattern[1]=spawnL(0xA9F5F2,0xA9F5F2,patternPos[posValue],patternRot[rotValue],false,-25,0);
realPattern[2]=spawnS(0xA9F5F2,0xA9F5F2,patternPos[posValue],patternRot[rotValue],false,-25,0);

//Copy pattern
copyPattern[0] = spawnT(0x00ff00,0x00ff00,patternPos[posValue],patternRot[rotValue],false,-25,0);
copyPattern[1] = spawnL(0x00ff00,0x00ff00,patternPos[posValue],patternRot[rotValue],false,-25,0);
copyPattern[2] = spawnS(0x00ff00,0x00ff00,patternPos[posValue],patternRot[rotValue],false,-25,0);

//Wall
scene.add( ground );
scene.add(ground2);
ground2.position.x=-35;
groundArray=[ground,ground2];

//cloud
spawnCloud(11,14,ground);
spawnCloud(31,15,ground);
spawnCloud(20,-14,ground);
spawnCloud(2,-15,ground);

spawnCloud(11,14,ground2);
spawnCloud(31,15,ground2);
spawnCloud(20,-14,ground2);
spawnCloud(2,-15,ground2);

//support
spawnSupport(ground);
spawnSupport(ground2);

window.addEventListener('touchstart', startFunction)
function startFunction(e){
    var touchobj = e.changedTouches[0];
    startX = touchobj.pageX;
    startY = touchobj.pageY;
    
    distX = 0;
    distY = 0;
    swipeRightBol = 0;
    swipeLeftBol = 0;
    swipeUpBol=0;
    swipeDownBol=0;

    startTime = new Date().getTime(); //momento en que se toca la pantalla

    if(playingTutorial==1){
        instruct1.style.display="inline";
        finger.style.display="inline";
        instructText.innerHTML="TOCA EL LADO DERECHO DE LA PANTALLA PARA GIRAR EN EL SENTIDO DE LAS AGUJAS DEL RELOJ";
        instructText.style.bottom="70%";
        instructText.style.left="60%";
        instructText.style.fontSize="15px";
        playingTutorial=2;
    }
    else if(playingTutorial==2){
        instruct1.style.display="none";
        instruct2.style.display="inline";
        instructText.innerHTML="TOCA EL LADO IZQUIERDO DE LA PANTALLA PARA GIRAR EN CONTRA DEL SENTIDO DE LAS AGUJAS DEL RELOJ";
        instructText.style.left="40%";
        finger.style.left="25%";
        playingTutorial=3;
    }
    else if(playingTutorial==3){
        instruct1.style.display="none";
        instruct2.style.display="none";
        instructText.style.fontSize="18px";
        instructText.innerHTML="DESLIZA PARA MOVER PIEZA";
        instructText.style.left="50%";
        instructText.style.bottom="80%";
        finger.style.left="50%";
        finger.style.bottom="30%";
        currentFinger=parseInt(finger.style.left,10);
        onClickDate = new Date();
        playingTutorial=4;
    }
    else if(playingTutorial==4){
        finger.style.display="none";
    
        if(playedTutorial==0){
            startButton.style.opacity="1";
    
    infButton.style.opacity="1";

startButton.addEventListener('touchend', startGame);
            infButton.addEventListener('touchend', infFunction);
            playedTutorial=1;
        }
        showMenu();
    }

};

window.addEventListener('touchend', endFunction);
function endFunction(e){

    if (paused==0 && e.cancelable==true){
        e.preventDefault();//prevents black scene when tapping
    }
    else if(playingTutorial>0 && e.cancelable==true){
        e.preventDefault();
    }

    var touchobj = e.changedTouches[0];

    distX = touchobj.pageX - startX; //total x-distance traveled by finger while in contact with screen
    distY = touchobj.pageY - startY;//total y-distance traveled by finger while in contact with screen
    elapsedTime = new Date().getTime() - startTime; //time elapsed
    
    // check elapsed time and dist traveled
 if(elapsedTime <= allowedTime && distY >= minDist && allowPosY==1 && Math.abs(distY)>Math.abs(distX)){
        swipeDownBol = 1;
if (cube[shapeValue].position.z>-6){
        cube[shapeValue].position.z-=2;
}
    }
    else if(elapsedTime <= allowedTime && distY <= -minDist && allowPosY==1 && Math.abs(distY)>Math.abs(distX)){
        swipeUpBol = 1;
        if (cube[shapeValue].position.z<6){    cube[shapeValue].position.z+=2;
}
    }
    else if(elapsedTime <= allowedTime && distX >= minDist){
        swipeRightBol = 1;
        if (cube[shapeValue].position.y>-6){
        cube[shapeValue].position.y-=2;
}
    }
    else if(elapsedTime <= allowedTime && distX <= -minDist){
        swipeLeftBol = 1;
    if (cube[shapeValue].position.y<6){    cube[shapeValue].position.y+=2;
}
    }
    
    if (allowRot==1){
        if(touchobj.pageX>=window.innerWidth/2){
            if(swipeLeftBol==0 && swipeRightBol==0 && swipeDownBol==0 && swipeUpBol==0){
        
                if(shapeValue!=2){
                    cube[shapeValue].rotateOnWorldAxis(worldX,PI/2);
                }
                else if(shapeValue==2){
                    if (Math.round(cube[shapeValue].rotation.x)==0){
                        cube[shapeValue].rotation.x=-Math.PI/2;
                    }
                    else{
                        cube[shapeValue].rotation.x=0;
                    }
                }
            }
        }

        else if(touchobj.pageX<window.innerWidth/2){
            if(swipeLeftBol==0 && swipeRightBol==0 && swipeUpBol==0 && swipeDownBol==0){
                if(shapeValue!=2){
                    cube[shapeValue].rotateOnWorldAxis(worldX,-PI/2);
                }
                else if(shapeValue==2){
            
                    if (Math.round(cube[shapeValue].rotation.x)==0){
                        cube[shapeValue].rotation.x=-Math.PI/2;
                    }
                    else{
                        cube[shapeValue].rotation.x=0;
                    }
                }
            }
        }
    }
    swipeLeftBol=0;
    swipeRightBol=0;
    swipeUpBol=0;
    swipeDownBol=0;
    return true;
};

function detect(){
if ( groundArray[groundValue].position.x<=1.1){
   if(Math.round(realPattern[shapeValue].rotation.x)==Math.round(cube[shapeValue].rotation.x)&& Math.round(realPattern[shapeValue].position.y) == Math.round(cube[shapeValue].position.y) && Math.round(realPattern[shapeValue].position.z) == Math.round(cube[shapeValue].position.z) ){//hit box
        
        if(groundValue == 0){

            groundValue = 1;
            groundArray[groundValue].position.x=40;
            groundArray[groundValue].material.opacity = 1;
        }
        else if(groundValue == 1){

            groundValue = 0;
            groundArray[groundValue].position.x=40;
            groundArray[groundValue].material.opacity = 1;
        }
        ground2var=1;
        
        if (shapeValue==0){
            positionCopy(0,1,2);
        }
        
        else if(shapeValue==1){
            positionCopy(1,0,2);
        }
        
        else if(shapeValue==2){
            if(rotValue==2){
                rotValue=0;
            }
            else if(rotValue==3){
                rotValue=1;
            }
            positionCopy(2,1,0);
            copyPattern[2].rotation.x=patternRot[rotValue];
        }
        
        if (allowPos==1){
            posValue=Math.floor(Math.random()*(patternPos.length-1) );
        }
        
        if (allowRot==1){
            rotValue=Math.floor(Math.random()*(patternRot.length-1) );
        }
        
        if (allowPosY==1){
           posYValue=Math.floor(Math.random()*(patternPosY.length-1) );
        }
        
        shapeValue=Math.floor(Math.random()*shapeArray.length);
        
        if (shapeValue==0){
            positionFigures(0,1,2);
        }
        else if(shapeValue==1){
            positionFigures(1,0,2);
        }
        else if(shapeValue==2){
            if(rotValue==2){
                rotValue=0;
            }
            else if(rotValue==3){
                rotValue=1;
            }

            positionFigures(2,1,0);
            
            if (copyPattern[copyValue].rotation.x==Math.PI/2){
                cube[2].rotation.x=-copyPattern[copyValue].rotation.x;
            }
            else if(copyPattern[copyValue].rotation.x==Math.PI){
                cube[2].rotation.x=0;
            }
            else{
                cube[2].rotation.x=copyPattern[copyValue].rotation.x;
            }
        }
        
        if (speedVar<=(0.18*moreSpeed)&&infVar==1){
            speedVar+=(0.01*moreSpeed);
        }
        if (infVar==0){
            scoreCounter-=1;
            if (scoreCounter == 0){
                checkPoints();
            }
        }
        else if(infVar==1){
            scoreCounter+=1;
        }
        teleport.play();
        myScore.innerHTML=scoreCounter;
        }
        else{
            showMenu();
        }
    }
}

function showMenu(){
    allowRot=1;
    allowPos=1;
    allowPosY=1;
    paused=1;
    groundArray[groundValue].position.x=40;
    myMenu.style.display="inline";

  
    if(playingTutorial==4){
        playingTutorial=0;
    }
    else{
        if (infVar==0){
            swal({
              title: "Game over!",
              text: "Te estrellaste contra la pared",
              icon: "error",
              button: "Juega de nuevo",
              closeOnClickOutside: false,
            });
        }
        else if(infVar==1){
            swal({
              title: "Game over!",
              text: "Obtuviste " + scoreCounter + " points!",
              icon: "error",
              button: "Juega de nuevo",
              closeOnClickOutside: false,

            });
            
            if (scoreCounter>bestScore){
                bestScore=scoreCounter;
            if(isAndroid==0){
            
                    localStorage.setItem("bestScoreSave",bestScore);
}
            }
        }
    }
    scoreCounter=30;
    infVar=0;
}

function startGame(){
    stageMenu.style.display="inline";
    myMenu.style.display="none";
    audioLoad();
    niceSong.volume=0.2;
    niceSong.play();
};

stage1.addEventListener("touchend", function(){
    selectStage(1,0.1,5); //stageNumber, speed, score
});

function stage2function(){
    selectStage(2,0.15,10); 
};

function stage3function(){
    selectStage(3,0.1,5); 
};

function stage4function(){
    selectStage(4,0.15,10); 
};

function stage5function(){
    selectStage(5,0.2,20); 
};

function stage6function(){
    selectStage(6,0.27,5); 
};

function stage7function(){
    selectStage(7,0.1,5); 
};

function stage8function(){
    selectStage(8,0.15,15); 
};

function stage9function(){
    selectStage(9,0.20,10); 
};

function stage10function(){
    selectStage(10,0.20,30); 
};

function infFunction(){
    audioLoad();
    //if (finishedGame==1){
        selectStage(100,0.1,0); 
    /*}
    else{
       swal({
            title: "Complete stage 10 to unlock infinity mode",
        });
    }
    */
    
};

instrButton.addEventListener('touchend', function(){
    audioLoad();
    cube[shapeValue].position.y=0;
    cube[shapeValue].position.z=0;
        if (groundValue == 0){
        groundArray[0].position.x=20;
        groundArray[1].position.x=-40;
    }
    else if(groundValue ==1){
        groundArray[1].position.x=20;
        groundArray[0].position.x=-40;
    }
    realPattern[shapeValue].position.x=groundArray[groundValue].position.x-1.01;
    hideStuff();
    myScore.style.display="none";
    instructText.innerHTML="HAZ COINCIDIR TU PIEZA CON EL AGUJERO";
    instructText.style.display="inline";
    contText.style.display="inline";
    instructText.style.fontSize="20px";
    finger.style.left="75%";
    playingTutorial=1;
});

function checkPoints(){
    switch (stageValue){
        case 1:
            finishedStage(stage2,"stage 1",1);
            break;
        case 2:
            finishedStage(stage3,"stage 2",2);
            break;
        case 3:
            finishedStage(stage4,"stage 3",3);
            break;
        case 4:
            finishedStage(stage5,"stage 4",4);
            break;
        case 5:
            finishedStage(stage6,"stage 5",5);
            break;
        case 6:
            finishedStage(stage7,"stage 6",6);
            break;
        case 7:
            finishedStage(stage8,"stage 7",7);
            break;
        case 8:
            finishedStage(stage9,"stage 8",8);
            break;
        case 9:
            finishedStage(stage10,"stage 9",9);
            break;
        case 10:
            finishedStage(stage10,"stage 10",10);
            break;
    }
}

//Unlocking stages if you unlocked them earlier
if (stageProgress<11){
    for (i=2;i<=stageProgress;i++){
        stageArray[i].style.opacity=1;
        stageArray[i].addEventListener("touchend",functionArray[i-2]);
    }
}
else if (stageProgress == 11){
    for (i=2;i<=stageProgress-1;i++){
        stageArray[i].style.opacity=1;
        stageArray[i].addEventListener("touchend",functionArray[i-2]);
    
        infButton.style.opacity="1";
        finishedGame=1;
    }
}
if (stageProgress>1){
playedTutorial=1;
    startButton.style.opacity="1";
    infButton.style.opacity ="1";
    startButton.addEventListener('touchend', startGame);
    infButton.addEventListener('touchend', infFunction);
}

//Some functions to reuse code
function hideStuff(){
    myMenu.style.display = "none";
    myScore.style.display="inline";
    instruct1.style.display="none";
    instruct2.style.display="none";
    finger.style.display="none";
    instructText.style.display="none";
    contText.style.display="none";
    myScore.innerHTML=scoreCounter;
    stageMenu.style.display="none"
}

function selectStage(stageNumber,SPEED,SCORE){
    stageValue=stageNumber;
    speedVar=SPEED*moreSpeed;
    scoreCounter=SCORE;
    cube[shapeValue].position.y=0;
    cube[shapeValue].position.z=0;
    realPattern[shapeValue].position.x=groundArray[groundValue].position.x;
    hideStuff();
    
    if (groundValue == 0){
        groundArray[0].position.x=30;
        groundArray[1].position.x=-50;
    }
    else if(groundValue ==1){
        groundArray[1].position.x=30;
        groundArray[0].position.x=-50;
    }
    
    
    if (stageNumber < 3){
        cube[shapeValue].rotation.x=0;
realPattern[shapeValue].rotation.x=0;
        motionText = "Horizontal"
        rotationText = "No";
        rotValue=1;
        posYValue=2;
        allowRot=0;
        allowPos=1;
        allowPosY=0;
    }
    else if (stageNumber < 7){
        motionText = "Horizontal"
        rotationText = "Yes";
        realPattern[shapeValue].position.z=0;
        posYValue=2;
        allowRot=1;
        allowPos=1;
        allowPosY=0;
    }
    else if(stageNumber<20){
        motionText = "Horizontal and Vertical";
        rotationText = "Yes";
        allowRot=1;
        allowPos=1;
        allowPosY=1;
    }
    else{
        infVar=1;
        motionText = "Horizontal and Vertical";
        rotationText = "Yes";
        allowRot=1;
        allowPos=1;
        allowPosY=1;
    }
    
    if (stageNumber<20){
        setTimeout(function(){
            swal({
              title: "STAGE "+stageNumber,
              text: "Objective: "+SCORE+" Points\nMotion: "+motionText+"\nRotation: "+rotationText,
              icon: "warning",
              buttons: true,
              closeOnClickOutside: false,
            })
            .then((willDelete) => {
              if (willDelete) {
                    paused=0;
              }
              else {
                    playingTutorial=4;
                    showMenu();
              }
            });
        },50);
    }
    else{
        setTimeout(function(){
            swal({
              title: "INFINITY MODE",
              text: "Best Score: " + bestScore +"\n\nObjective: Do not crash\nMotion: Horizontal and Vertical\nRotation: Yes",
              icon: "warning",
              buttons: true,
              closeOnClickOutside: false,
            })
            .then((willDelete) => {
              if (willDelete) {
                    paused=0;
              } else {
                    playingTutorial=4;
                    showMenu();
              }
            });
        },50);
    }
}

function finishedStage(nextStage,stageString,numb){
    playingTutorial=4;
    showMenu();
    swal({
      title: "Muy bien!",
      text: "Has acabado " + stageString,
      icon: "exito",
      button: "Si!",
      closeOnClickOutside: false,
    });
    copyPattern[0].position.x=-25;
    copyPattern[1].position.x=-25;
    copyPattern[2].position.x=-25;
    ground2var=0;
    
    if (stageProgress<(numb+1)){
        stageProgress = numb+1;
        
    if(isAndroid==0) {    localStorage.setItem("stageProgressSave",stageProgress);
        }

        if (stageProgress<11){
            nextStage.style.opacity=1;
            nextStage.addEventListener("touchend",functionArray[numb-1]);
        }
        else{
            infButton.style.opacity="1";
            finishedGame=1;
        }
    }
}

function positionFigures(current,not1,not2){
        realPattern[current].position.y=patternPos[posValue];
        realPattern[current].rotation.x=patternRot[rotValue];
        realPattern[current].position.x=30;
        realPattern[current].position.z=patternPosY[posYValue];
        
        cube[current].rotation.x=copyPattern[copyValue].rotation.x;
        cube[current].position.x=0;
        cube[current].position.y=copyPattern[copyValue].position.y;
        cube[current].position.z=copyPattern[copyValue].position.z;
        
        realPattern[not1].position.x=-25;
        realPattern[not2].position.x=-25;
        cube[not1].position.x=-35;
        cube[not2].position.x=-35;
}

function positionCopy(current,not1,not2){
        copyPattern[current].position.y=patternPos[posValue];
        copyPattern[current].rotation.x=patternRot[rotValue];
        copyPattern[current].position.z=patternPosY[posYValue];
        copyPattern[current].position.x=0;
        copyValue = current;
        
        copyPattern[not1].position.x=-25;
        copyPattern[not2].position.x=-25;
}


function audioLoad(){
    if (audioVar == 0){
        try {
            // Try to load teleport sound effect
            var listener = new THREE.AudioListener();
            camera.add(listener);
            window.teleport = new THREE.Audio(listener);
            var audioLoader = new THREE.AudioLoader();
            
            audioLoader.load('./assets/audio/220162__gameaudio__teleport-high2 - copia.mp3', function(buffer) {
                teleport.setBuffer(buffer);
                teleport.setLoop(false);
                teleport.setVolume(0.5);
            }, undefined, function(error) {
                window.teleport = { play: function(){} };
            });
        } catch(e) {
            window.teleport = { play: function(){} };
        }
        audioVar = 1;
    }
    
    if (!audioLoaded && niceSong === null) {
        try {
            // Load local background music if present in assets/audio
            niceSong = new Audio();
            niceSong.src = './assets/audio/background-music.mp3';
            niceSong.loop = true; // loop ambient music
            niceSong.volume = 0.35;
            // Attempt to play; mobile browsers may block until user interaction
            niceSong.play().catch(function() {
                // Autoplay blocked — will play later on first user interaction
            });
            audioLoaded = true;
        } catch(e) {
            niceSong = null;
        }
    }
}

//********** Render function **********
var clock = new THREE.Clock();
var delta=0;
clock.start();
gameLoop();

function gameLoop(){

    requestAnimationFrame(gameLoop);
    delta = clock.getDelta();
    //using delta to determine all distances travelled
    
    if (paused==0){
        detect(); //detect going through hole
        
        // Motion
        groundArray[groundValue].position.x-=speedVar*delta;
        realPattern[shapeValue].position.x=groundArray[groundValue].position.x-1.01;
    
        if ( groundValue==1 && ground2var==1){
            groundArray[0].position.x-=speedVar*delta;

if (groundArray[0].material.opacity>0.5){
    groundArray[0].material.opacity-=0.025;
}
            copyPattern[copyValue].position.x=groundArray[0].position.x-1.01;
        
            if (groundArray[0].position.x<=-50){
                ground2var=0;
            }
        }
        else if(groundValue==0 && ground2var==1){
            groundArray[1].position.x-=speedVar*delta;

if (groundArray[1].material.opacity>0.5){
    groundArray[1].material.opacity-=0.025;
}
            copyPattern[copyValue].position.x=groundArray[1].position.x-1.01;
        
            if (groundArray[1].position.x<=-50){
                ground2var=0;
            }
            
        }
    }
    
    //Instruction animation
    if (playingTutorial==4){
        currentDate = new Date();
        diffTime = (currentDate - onClickDate);
        finger.style.left=currentFinger+diffTime/4 + "px";
        if (diffTime/1000 >=1){
            finger.style.left="25%";
            onClickDate = new Date();
        }
    }

    renderer.render(scene, camera); //We need this in the loop to perform the rendering
    };
});