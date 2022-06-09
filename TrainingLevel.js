import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js";
import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "../modules/GLTFLoader.js";
import { Reflector } from "./modules/Reflector.js";

//gloabal variables
let vision = []; //for ray casting
var bullets = []; //for the movent of bullets
let arrZombies = []; //for raycasting
var count = 4; //number of zombies on map
var zcheck = false; //to check if a zombie been shot
var mapCamera,
  mapWidth = 240,
  mapHeight = 160;

//creates a class for the animation for the player
class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
} //end Class BasicCharacterControllerProxy

//class to load the plyer
class BasicCharacterController {
  constructor(params) {
    this._Init(params);
  }

  _Init(params) {
    this._params = params;
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0); //sets the backwads spped for player
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0); //sets the speed for player
    this._velocity = new THREE.Vector3(0, 0, 0);
    this._position = new THREE.Vector3();
    this._sclGun = params.sclGun;
    this._sclPla = params.sclPla;
    this.BulletOffset = params.bulletOff;
    this.BulletSize = params.bulletSize;

    this._animations = {}; //container to hold animations
    this._input = new BasicCharacterControllerInput(); //links the inputs class to the character
    this._stateMachine = new CharacterFSM(
      new BasicCharacterControllerProxy(this._animations) //sets the states to the certain animation
    );

    this._LoadModels();
  } //end _Init

  _LoadModels() {
    const loader = new FBXLoader(); //fbx loader for player character
    loader.setPath("./resources/Player/");
    loader.load("pla.fbx", (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse((c) => {
        c.castShadow = true;
      });
      fbx.scale.multiplyScalar(this._sclPla);
      fbx.position.set(-89.473, 0, -110.75);

      //Adding gun to right hand
      const loader1 = new FBXLoader();
      loader1.setPath("./resources/FN Scar L/");
      loader1.load("scarL.FBX", (fbxPistol) => {
        //fbx loader for gun
        fbxPistol.traverse((c) => {
          c.castShadow = true;
        });
        fbxPistol.position.set(0, 40, -15);
        fbxPistol.scale.setScalar(1);
        fbxPistol.scale.multiplyScalar(this._sclGun);

        fbxPistol.rotation.y = -Math.PI;
        fbxPistol.rotation.x = Math.PI / 2;
        fbxPistol.rotation.z = Math.PI / 7;

        const rightHand = fbx.getObjectByName("mixamorigRightHand");
        rightHand.add(fbxPistol);
      });

      this._target = fbx;
      this._params.scene.add(this._target);

      this._mixer = new THREE.AnimationMixer(this._target);

      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._stateMachine.SetState("idle"); //sets the animation to idle when it starts
      };

      const _OnLoad = (animName, anim) => {
        const clip = anim.animations[0];
        const action = this._mixer.clipAction(clip);

        this._animations[animName] = {
          clip: clip,
          action: action,
        };
      };

      const loader = new FBXLoader(this._manager);
      loader.setPath("./resources/Player/"); //loads the certion animation to its respected state
      loader.load("walk.fbx", (a) => {
        _OnLoad("walk", a);
      });
      loader.load("run.fbx", (a) => {
        _OnLoad("run", a);
      });
      loader.load("idle.fbx", (a) => {
        _OnLoad("idle", a);
      });
      loader.load("shooting.fbx", (a) => {
        _OnLoad("shoot", a);
      });
    });
  }

  get Position() {
    //returns position of character
    return this._position;
  }

  get Rotation() {
    //returns rotation of character
    if (!this._target) {
      return new THREE.Quaternion();
    }
    return this._target.quaternion;
  }

  Update(timeInSeconds) {
    if (!this._stateMachine._currentState) {
      return;
    }

    this._stateMachine.Update(timeInSeconds, this._input); //updates state according to its input

    const velocity = this._velocity;
    //sets the speed of the chacter with the frames of the device
    const frameDecceleration = new THREE.Vector3(
      velocity.x * this._decceleration.x,
      velocity.y * this._decceleration.y,
      velocity.z * this._decceleration.z
    );
    frameDecceleration.multiplyScalar(timeInSeconds);
    frameDecceleration.z =
      Math.sign(frameDecceleration.z) *
      Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this._acceleration.clone();
    if (this._input._keys.shift) {
      //increases speed of character
      acc.multiplyScalar(2.0);
    }

    if (this._stateMachine._currentState.Name == "shoot") {
      acc.multiplyScalar(0.0);
    }

    if (this._input._keys.forward) {
      //moves the chater foward
      velocity.z += acc.z * timeInSeconds;
    }
    if (this._input._keys.backward) {
      //moves the chater backwards
      velocity.z -= acc.z * timeInSeconds;
    }
    if (this._input._keys.left) {
      //applies rotation to turn character left
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        4.0 * Math.PI * timeInSeconds * this._acceleration.y
      );
      _R.multiply(_Q);
    }
    if (this._input._keys.right) {
      //applies rotation to turn character right
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        4.0 * -Math.PI * timeInSeconds * this._acceleration.y
      );
      _R.multiply(_Q);
    }
    if (this._input._keys.space) {
      //shoots bullet
      var bullet = new THREE.Mesh( //creates the bullet mesh
        new THREE.SphereGeometry(this.BulletSize, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xa19d94 })
      );
      const bulletIdealStart = new THREE.Vector3(
        this.BulletOffset.x,
        this.BulletOffset.y,
        this.BulletOffset.z
      );

      bulletIdealStart.applyQuaternion(this._target.quaternion); //calculates offset of bullet to start from
      bulletIdealStart.add(this._position);

      bullet.position.set(
        bulletIdealStart.x,
        bulletIdealStart.y,
        bulletIdealStart.z
      );

      bullet.velocity = new THREE.Vector3(
        -Math.sin(this._params.camera.rotation.y),
        0,
        -Math.cos(this._params.camera.rotation.x)
      );

      bullet.alive = true;
      setTimeout(() => {
        bullet.alive = false;
        //removes bullet from scene
        this._params.scene.remove(bullet);
      }, 1500);
      //collisions for bullets using raycasting
      const raycastb = new THREE.Raycaster();

      raycastb.near = 0;
      raycastb.far = 200;

      let directionb = new THREE.Vector3();
      let startb = new THREE.Vector3();
      startb.copy(bullet.position);

      bullet.getWorldDirection(directionb);
      raycastb.set(startb, bullet.velocity);
      const found1 = raycastb.intersectObjects(arrZombies);

      if (found1.length > 0) {
        this._params.scene.remove(found1[0].object.parent);
        if (zcheck == true) {
          //for win game
          zcheck = false;
          count--;
          setTimeout(() => {
            zcheck = true;
          }, 2000);
        }
      }

      bullets.push(bullet);
      this._params.scene.add(bullet);
    }

    controlObject.quaternion.copy(_R);
    //collision for player and world
    const raycast = new THREE.Raycaster();

    raycast.near = 0;
    raycast.far = 2;

    let direction = new THREE.Vector3();
    let start = new THREE.Vector3();
    start.copy(controlObject.position);
    start.y += 1;
    controlObject.getWorldDirection(direction);
    raycast.set(start, direction);
    const found = raycast.intersectObjects(vision);

    if (found.length > 0) {
      return;
    }

    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    sideways.multiplyScalar(velocity.x * timeInSeconds);
    forward.multiplyScalar(velocity.z * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    this._position.copy(controlObject.position);

    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
} //end Class BasicCharacterController

//sets the window event listner for buttons for player
class BasicCharacterControllerInput {
  constructor() {
    this._Init();
  }

  _Init() {
    //sets all the vents to defalt false
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };
    document.addEventListener("keydown", (e) => this._onKeyDown(e), false);
    document.addEventListener("keyup", (e) => this._onKeyUp(e), false);
  }

  _onKeyDown(event) {
    //sets the evnts to true when key pressed
    switch (event.keyCode) {
      case 87: // key w
        this._keys.forward = true;
        break;
      case 65: // key a
        this._keys.left = true;
        break;
      case 83: // key s
        this._keys.backward = true;
        break;
      case 68: // key d
        this._keys.right = true;
        break;
      case 32: // key SPACE
        this._keys.space = true;
        break;
      case 16: // key SHIFT
        this._keys.shift = true;
        break;
    }
  }

  _onKeyUp(event) {
    //sets the evnts to false when key relased
    switch (event.keyCode) {
      case 87: // key w
        this._keys.forward = false;
        break;
      case 65: // keya
        this._keys.left = false;
        break;
      case 83: // key s
        this._keys.backward = false;
        break;
      case 68: // key d
        this._keys.right = false;
        break;
      case 32: // key SPACE
        this._keys.space = false;
        break;
      case 16: // key SHIFT
        this._keys.shift = false;
        break;
    }
  }
} //end Class BasicCharacterControllerInput

//finite state machine to control the states
class FiniteStateMachine {
  constructor() {
    this._states = {}; //lists of all possible states
    this._currentState = null;
  }

  _AddState(name, type) {
    this._states[name] = type;
  }

  SetState(name) {
    const prevState = this._currentState;

    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this._states[name](this);

    this._currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed, input) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
} //end Class FiniteStateMachine

//finite state machine to control the states for player
class CharacterFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }

  _Init() {
    this._AddState("idle", IdleState);
    this._AddState("walk", WalkState);
    this._AddState("run", RunState);
    this._AddState("shoot", ShootState);
  }
} //end Class CharacterFSM

//states layout for each state
class State {
  constructor(parent) {
    this._parent = parent;
  }

  Enter() {}
  Exit() {}
  Update() {}
} //end Class State

//state for shooting animation
class ShootState extends State {
  constructor(parent) {
    super(parent);

    this._FinishedCallback = () => {
      this._Finished();
    };
  }

  get Name() {
    return "shoot";
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations["shoot"].action;
    const mixer = curAction.getMixer();
    mixer.addEventListener("finished", this._FinishedCallback);

    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.reset();
      curAction.setLoop(THREE.LoopOnce, 1);
      curAction.clampWhenFinished = true;
      curAction.crossFadeFrom(prevAction, 0.2, true); //allows the previos animation to finish and load new animtion smoothly
      curAction.play();
    } else {
      curAction.play();
    }
  }

  _Finished() {
    this._Cleanup();
    this._parent.SetState("idle"); //sets animation to idle when finished
  }

  _Cleanup() {
    const action = this._parent._proxy._animations["shoot"].action;

    action.getMixer().removeEventListener("finished", this._CleanupCallback);
  }

  Exit() {
    this._Cleanup();
  }

  Update(_) {}
} //end Class ShootState

//state for walking animation
class WalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return "walk";
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations["walk"].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == "run") {
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true); //allows the previos animation to finish and load new animtion smoothly
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {}

  Update(timeElapsed, input) {
    //uses thanimation for keys W and S
    if (input._keys.forward || input._keys.backward) {
      if (input._keys.shift) {
        this._parent.SetState("run");
      }
      return;
    }

    this._parent.SetState("idle");
  }
} //end Class WalkState

//state for run animation
class RunState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return "run";
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations["run"].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == "walk") {
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true); //allows the previos animation to finish and load new animtion smoothly
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {}

  Update(timeElapsed, input) {
    //uses thanimation for keys W and S
    if (input._keys.forward || input._keys.backward) {
      if (!input._keys.shift) {
        this._parent.SetState("walk");
      }
      return;
    }

    this._parent.SetState("idle");
  }
} //end Class RunState

//state for idle animation
class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return "idle";
  }

  Enter(prevState) {
    const idleAction = this._parent._proxy._animations["idle"].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(prevAction, 0.5, true); //allows the previos animation to finish and load new animtion smoothly
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {}

  Update(_, input) {
    //changes state if one walks
    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState("walk");
    } else if (input._keys.space) {
      this._parent.SetState("shoot");
    }
  }
} //end Class IdleState

//class to set up the main camera
class ThirdPersonCamera {
  constructor(params) {
    this._params = params;
    this._camera = params.camera;

    this.cameraOffset = params.camerOff;

    this._currentPosition = new THREE.Vector3();
    this._currentLookat = new THREE.Vector3();
  }

  _CalculateIdealOffset() {
    //calculates the ceratin distance away from player character
    const idealOffset = new THREE.Vector3(
      this.cameraOffset.x,
      this.cameraOffset.y,
      this.cameraOffset.z
    );
    idealOffset.applyQuaternion(this._params.target.Rotation);
    idealOffset.add(this._params.target.Position);
    return idealOffset;
  }

  _CalculateIdealLookat() {
    //calculates the new camera focus e.g to look foward
    const idealLookat = new THREE.Vector3(0, 10, 50);
    idealLookat.applyQuaternion(this._params.target.Rotation);
    idealLookat.add(this._params.target.Position);
    return idealLookat;
  }

  Update(timeElapsed) {
    const idealOffset = this._CalculateIdealOffset();
    const idealLookat = this._CalculateIdealLookat();

    //camera delay to make camera move smoothly while player turns
    const t = 1.0 - Math.pow(0.001, timeElapsed);

    this._currentPosition.lerp(idealOffset, t);
    this._currentLookat.lerp(idealLookat, t);

    this._camera.position.copy(this._currentPosition);
    this._camera.lookAt(this._currentLookat);
  }
} //end Class ThirdPersonCamera

//main class for game tainging level
class TrainingLevel {
  constructor() {
    this._Initialize();
    count = 4; //for win game
    zcheck = false; //for win game
    setTimeout(function () {
      if (count <= 0) {
        //window.location = "win.html";
      } else {
        window.location = "gameover.html";
      }
    }, 1000000);
  }

  _Initialize() {
    //-------------------Initalise the window for Three js---------------
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);
    //-------------------------------------------------------------------

    //---------------------------Loading screen--------------------------
    this.divLoading = document.getElementById("loading");
    document.getElementById("loading").style.display = "grid";

    setTimeout(() => {
      zcheck = true; //for win game
      this.divLoading.style.display = "none";
    }, 30000);
    //-------------------------------------------------------------------

    //------------------------Resize Event handler------------------------
    window.addEventListener(
      "resize",
      () => {
        this._OnWindowResize();
      },
      false
    );
    //-------------------------------------------------------------------

    //-------------------------Initilaize Camera-------------------------
    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(75, 20, 0);
    //-------------------------------------------------------------------

    this._scene = new THREE.Scene();

    //-------------------------Place lights-------------------------------
    //main light with shadows
    let light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(20, 100, 10);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    light = new THREE.AmbientLight(0xffffff, 0.25);
    this._scene.add(light);
    //lights for torches on map
    const plight = new THREE.PointLight(0xffffff, 15, 100);
    plight.position.set(-80, 10, -30);
    this._scene.add(plight);

    const plight1 = new THREE.PointLight(0xffffff, 15, 100);
    plight1.position.set(80, 10, -30);
    this._scene.add(plight1);

    const plight2 = new THREE.PointLight(0xffffff, 15, 100);
    plight2.position.set(200, 10, -30);
    this._scene.add(plight2);
    //-------------------------------------------------------------------

    //------------------------------load map-----------------------------
    this.gltfloader_ = new GLTFLoader();
    this.SkyBox();
    this.createPlain();

    this.loadTerrain();
    //-------------------------------------------------------------------

    this._mixers = [];
    this._previousRAF = null;

    this._LoadAnimatedModel(); //loads the main player

    this.loadZombies(); //loads the zombies

    this._RAF();
  }

  SkyBox() {
    //loads the skybox from images
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      "./resources/skybox/vz_apocalypse_rt.jpg",
      "./resources/skybox/vz_apocalypse_lf.jpg",
      "./resources/skybox/vz_apocalypse_up.jpg",
      "./resources/skybox/vz_apocalypse_dn.jpg",
      "./resources/skybox/vz_apocalypse_ft.jpg",
      "./resources/skybox/vz_apocalypse_bk.jpg",
    ]);
    texture.encoding = THREE.sRGBEncoding;
    this._scene.background = texture;
  }

  createPlain() {
    //creates the floor mesh with texture
    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this._threejs.capabilities.getMaxAnisotropy();
    const de = mapLoader.load("resources/de.png");
    de.anisotropy = maxAnisotropy;
    de.wrapS = THREE.RepeatWrapping;
    de.wrapT = THREE.RepeatWrapping;
    de.repeat.set(32, 32);
    de.encoding = THREE.sRGBEncoding;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800, 10, 10),
      new THREE.MeshStandardMaterial({ map: de })
    );
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);
  }

  modelgltfLoader(link, pos, scl) {
    //general glt model loader
    this.gltfloader_.load(link, (gltf) => {
      gltf.scene.traverse((c) => {
        c.castShadow = true;
        vision.push(c);
      });
      const model = gltf.scene;
      model.position.set(pos.x, pos.y, pos.z);
      model.scale.set(scl.x, scl.y, scl.z);
      this._scene.add(model);
    });
  }

  loadTerrain() {
    //------------------------Models for enironment----------------------

    //scale sizes --  Z=zero O=one T=two Th=three Fo=four F=five
    let sclT = new THREE.Vector3(2, 2, 2);
    let sclOF = new THREE.Vector3(1.5, 1.5, 1.5);
    let sclO = new THREE.Vector3(1, 1, 1);
    let sclZZF = new THREE.Vector3(0.05, 0.05, 0.05);
    let sclZZZO = new THREE.Vector3(0.001, 0.001, 0.001);
    let sclTZ = new THREE.Vector3(20, 20, 20);

    let posTraingroom = new THREE.Vector3(0, 25, 0);
    this.modelgltfLoader(
      "./resources/fortress_bastion_training_room/scene.gltf",
      posTraingroom,
      sclTZ
    );

    let posLtower = new THREE.Vector3(-80, 20, -30);
    this.modelgltfLoader(
      "./resources/light_tower/scene.gltf",
      posLtower,
      sclTZ
    );

    let posLtower1 = new THREE.Vector3(80, 20, -30);
    this.modelgltfLoader(
      "./resources/light_tower/scene.gltf",
      posLtower1,
      sclTZ
    );

    let posLtower2 = new THREE.Vector3(200, 20, -30);
    this.modelgltfLoader(
      "./resources/light_tower/scene.gltf",
      posLtower2,
      sclTZ
    );

    const mirrorOptions = {
      clipBias: 0.0,
      textureWidth: window.innerWidth * window.devicePixelRatio,
      textureHeight: window.innerHeight * window.devicePixelRatio,
      color: 0x808080,
      multisample: 4,
    };
    const mirrorGeometry = new THREE.PlaneGeometry(25, 90);
    const mirror = new Reflector(mirrorGeometry, mirrorOptions);
    mirror.rotateY(-Math.PI / 2);
    mirror.position.set(378.869, 0, 92.937);
    this._scene.add(mirror);
  }

  _LoadAnimatedModel() {
    //used to load the player and camera
    const params = {
      camera: this._camera,
      scene: this._scene,
      bulletOff: new THREE.Vector3(-2, 12, 1),
      bulletSize: 0.25,
      sclGun: 1,
      sclPla: 1,
    };
    this._controls = new BasicCharacterController(params);

    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
      target: this._controls,
      camerOff: new THREE.Vector3(-3, 13, -19),
    });
  }

  loadZombies() {
    //loads the zombies
    this._LoadAnimatedModelAndPlay(
      "./resources/zombie/",
      "zombie.fbx",
      "zidle1.fbx",
      new THREE.Vector3(331.307, 0, 165.374)
    );

    this._LoadAnimatedModelAndPlay(
      "./resources/zombie/",
      "zombie.fbx",
      "zidle.fbx",
      new THREE.Vector3(-237.25, 0, -14.961)
    );

    this._LoadAnimatedModelAndPlay(
      "./resources/zombie/",
      "zombie.fbx",
      "zidle2.fbx",
      new THREE.Vector3(210.501, 0, -159.961)
    );

    this._LoadAnimatedModelAndPlay(
      "./resources/zombie/",
      "zombie.fbx",
      "zidle1.fbx",
      new THREE.Vector3(-347.293, 0, -18.4004)
    );
  }

  _LoadAnimatedModelAndPlay(path, modelFile, animFile, offset) {
    //general fbx loader
    const loader = new FBXLoader();
    loader.setPath(path);
    loader.load(modelFile, (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse((c) => {
        c.castShadow = true;
        arrZombies.push(c);
      });
      fbx.scale.multiplyScalar(1);
      fbx.position.copy(offset);

      const anim = new FBXLoader();
      anim.setPath(path);
      anim.load(animFile, (anim) => {
        const m = new THREE.AnimationMixer(fbx);
        this._mixers.push(m);
        const idle = m.clipAction(anim.animations[0]);
        idle.play();
      });
      this._scene.add(fbx);
    });
  }

  loadMaterial_(name, tiling) {
    //loads the texture material
    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this._threejs.capabilities.getMaxAnisotropy();

    const metalMap = mapLoader.load(
      "resources/freepbr/" + name + "metallic.png"
    );
    metalMap.anisotropy = maxAnisotropy;
    metalMap.wrapS = THREE.RepeatWrapping;
    metalMap.wrapT = THREE.RepeatWrapping;
    metalMap.repeat.set(tiling, tiling);

    const albedo = mapLoader.load("resources/freepbr/" + name + "albedo.png");
    albedo.anisotropy = maxAnisotropy;
    albedo.wrapS = THREE.RepeatWrapping;
    albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(tiling, tiling);
    albedo.encoding = THREE.sRGBEncoding;

    const normalMap = mapLoader.load(
      "resources/freepbr/" + name + "normal.png"
    );
    normalMap.anisotropy = maxAnisotropy;
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(tiling, tiling);

    const roughnessMap = mapLoader.load(
      "resources/freepbr/" + name + "roughness.png"
    );
    roughnessMap.anisotropy = maxAnisotropy;
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(tiling, tiling);

    const material = new THREE.MeshStandardMaterial({
      metalnessMap: metalMap,
      map: albedo,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
    });

    return material;
  }

  _OnWindowResize() {
    //event listner for scaling the size of the window
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      //main game loader

      this._threejs.render(this._scene, this._camera);

      this._Step(t - this._previousRAF);
      this._previousRAF = t;

      //moves the bullets with the velocity in array
      for (var i = 0; i < bullets.length; i++) {
        if (bullets[i] === undefined) continue;
        if (bullets[i].alive == false) {
          bullets.splice(i, 1);
          continue;
        }
        bullets[i].position.add(bullets[i].velocity);
      }
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    if (this._mixers) {
      this._mixers.map((m) => m.update(timeElapsedS));
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }
    if (count <= 0) {
      //for win game
      window.location = "win.html";
    }

    this._thirdPersonCamera.Update(timeElapsedS);
  }
} //end Class ZombieGame Main Class

let _APP = null;

window.addEventListener("DOMContentLoaded", () => {
  _APP = new TrainingLevel();
});
