 // --- Stats ---
 const stats = new Stats();
 document.body.appendChild(stats.dom);

 // --- Initialization ---
 const scene = new THREE.Scene();
 const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
 const renderer = new THREE.WebGLRenderer({
  antialias: true
 });
 renderer.setSize(window.innerWidth, window.innerWidth);
 renderer.shadowMap.enabled = true;
 renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 document.body.appendChild(renderer.domElement);

 // --- Overlay & Instructions ---
 const overlay = document.getElementById('overlay');
 overlay.addEventListener('click', startGame); // Start Game on Click

 // --- Game Over Screen ---
 const gameOverScreen = document.getElementById('gameOver');
 gameOverScreen.addEventListener('click', restartGame);

 function showGameOver() {
  gameOverScreen.style.display = 'flex';
  controls.unlock(); // Unlock controls so user can click
 }

 // --- Health Bar ---
 const healthBar = document.getElementById('health');
 let health = 100;

 function updateHealthBar() {
  healthBar.style.width = health + '%';
 }

 // --- Stamina Bar ---
 const staminaBar = document.getElementById('stamina');
 let stamina = 100;
 let isSprinting = false;

 function updateStaminaBar() {
  staminaBar.style.width = stamina + '%';
 }

 // --- Inventory ---
 const inventoryItemsDisplay = document.getElementById('inventoryItems');
 const inventory = [];

 function updateInventoryDisplay() {
  inventoryItemsDisplay.textContent = inventory.length > 0 ? inventory.join(', ') : 'Empty';
 }

 function addItemToInventory(item) {
  inventory.push(item);
  updateInventoryDisplay();
 }

 function removeItemFromInventory(item) {
  const index = inventory.indexOf(item);
  if (index > -1) {
   inventory.splice(index, 1);
   updateInventoryDisplay();
  }
 }

 // --- Weapon System ---
 const weaponDisplay = document.getElementById('currentWeapon');
 let currentWeapon = "None";
 let weaponDamage = 10;

 function updateWeaponDisplay() {
  weaponDisplay.textContent = currentWeapon;
 }

 // --- Fog ---
 scene.fog = new THREE.Fog(0x000000, 0, 75);

 // --- Lighting ---
 const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
 scene.add(ambientLight);

 const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
 directionalLight.position.set(1, 1, 1).normalize();
 directionalLight.castShadow = true;
 directionalLight.shadow.mapSize.width = 2048;
 directionalLight.shadow.mapSize.height = 2048;
 directionalLight.shadow.camera.near = 0.5;
 directionalLight.shadow.camera.far = 500;
 scene.add(directionalLight);

 const pointLight = new THREE.PointLight(0xff0000, 1, 10);
 pointLight.position.set(5, 1, 5);
 pointLight.castShadow = true;
 scene.add(pointLight);

 // --- Player Controls ---
 const controls = new THREE.PointerLockControls(camera, renderer.domElement);
 let moveForward = false;
 let moveBackward = false;
 let moveLeft = false;
 let moveRight = false;
 let sprint = false;
 const velocity = new THREE.Vector3();
 const direction = new THREE.Vector3();
 let moveSpeed = 5.0;
 let canJump = false;
 const gravity = -9.8;
 const jumpVelocity = 5;

 document.addEventListener('keydown', function (event) {
  switch (event.code) {
   case 'KeyW':
    moveForward = true;
    break;
   case 'KeyS':
    moveBackward = true;
    break;
   case 'KeyA':
    moveLeft = true;
    break;
   case 'KeyD':
    moveRight = true;
    break;
   case 'ShiftLeft':
    sprint = true;
    break;
   case 'Space':
    if (canJump) velocity.y += jumpVelocity;
    canJump = false; // Prevent double jumping
    break;
   case 'KeyE':
    interact();
    break;
   case 'KeyQ':
    useItem();
    break;
  }
 });

 document.addEventListener('keyup', function (event) {
  switch (event.code) {
   case 'KeyW':
    moveForward = false;
    break;
   case 'KeyS':
    moveBackward = false;
    break;
   case 'KeyA':
    moveLeft = false;
    break;
   case 'KeyD':
    moveRight = false;
    break;
   case 'ShiftLeft':
    sprint = false;
    break;
  }
 });

 renderer.domElement.addEventListener('click', function () {
  attack();
 });

 // --- Load Models ---
 const gltfLoader = new THREE.GLTFLoader();
 let groundMesh;
 let monsterMesh;
 let environmentMesh;
 let itemMesh;
 let interactableObject; // New variable for interactable object
 let doorMesh; // New door mesh
 let weaponMesh; // New weapon mesh
 let keyMesh;

 gltfLoader.load(
  'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf', // Replace with your GLTF model path
  function (gltf) {
   monsterMesh = gltf.scene;
   monsterMesh.scale.set(0.5, 0.5, 0.5);
   monsterMesh.position.set(10, 0, 10);
   monsterMesh.castShadow = true;
   monsterMesh.receiveShadow = true;
   scene.add(monsterMesh);
   monsterHealth = 50; // Set initial monster health

   // Play monster sound when monster is loaded
   playSound(monsterSound);
  },
  undefined,
  function (error) {
   console.error('An error happened while loading the model.');
  }
 );

 gltfLoader.load(
  'https://threejs.org/examples/models/gltf/scene.gltf', // Replace with your environment GLTF model path
  function (gltf) {
   environmentMesh = gltf.scene;
   environmentMesh.scale.set(0.1, 0.1, 0.1);
   environmentMesh.position.set(0, -2, 0); // Adjust position as needed
   environmentMesh.castShadow = false; // Adjust shadow settings
   environmentMesh.receiveShadow = true; // Adjust shadow settings
   scene.add(environmentMesh);
  },
  undefined,
  function (error) {
   console.error('An error happened while loading the environment model.');
  }
 );

 gltfLoader.load(
  'https://threejs.org/examples/models/gltf/Lantern/glTF/Lantern.gltf', // Replace with your item GLTF model path
  function (gltf) {
   itemMesh = gltf.scene;
   itemMesh.scale.set(0.1, 0.1, 0.1);
   itemMesh.position.set(3, 0, 3); // Adjust position as needed
   itemMesh.castShadow = true; // Adjust shadow settings
   itemMesh.receiveShadow = true; // Adjust shadow settings
   scene.add(itemMesh);
  },
  undefined,
  function (error) {
   console.error('An error happened while loading the item model.');
  }
 );

 // Load interactable object
 gltfLoader.load(
  'https://threejs.org/examples/models/gltf/SimpleSkin/SimpleSkin.gltf', // Replace with your interactable object GLTF model path
  function (gltf) {
   interactableObject = gltf.scene;
   interactableObject.scale.set(0.1, 0.1, 0.1);
   interactableObject.position.set(-3, 0, -3); // Adjust position as needed
   interactableObject.castShadow = true; // Adjust shadow settings
   interactableObject.receiveShadow = true; // Adjust shadow settings
   scene.add(interactableObject);
  },
  undefined,
  function (error) {
   console.error('An error happened while loading the interactable object model.');
  }
 );

 // Load door model
 gltfLoader.load(
  'https://threejs.org/examples/models/gltf/Flamingo.gltf', // Replace with your door GLTF model path
  function (gltf) {
   doorMesh = gltf.scene;
   doorMesh.scale.set(0.1, 0.1, 0.1);
   doorMesh.position.set(7, 0, -5); // Adjust position as needed
   doorMesh.castShadow = true; // Adjust shadow settings
   doorMesh.receiveShadow = true; // Adjust shadow settings
   scene.add(doorMesh);
  },
  undefined,
  function (error) {
   console.error('An error happened while loading the door model.');
  }
 );

 // Load weapon model
 gltfLoader.load(
  'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.gltf', // Replace with your weapon GLTF model path
  function (gltf) {
   weaponMesh = gltf.scene;
   weaponMesh.scale.set(0.1, 0.1, 0.1);
   weaponMesh.position.set(0, 0, 2); // Position in front of the player
   weaponMesh.castShadow = true; // Adjust shadow settings
   weaponMesh.receiveShadow = true; // Adjust shadow settings
   camera.add(weaponMesh); // Add weapon to the camera
   scene.add(camera);
   currentWeapon = "Sword";
   updateWeaponDisplay();
  },
  undefined,
  function (error) {
   console.error('An error happened while loading the weapon model.');
  }
 );

 // Load key model
 gltfLoader.load(
  'https://threejs.org/examples/models/gltf/Key/glTF/Key.gltf', // Replace with your key GLTF model path
  function (gltf) {
   keyMesh = gltf.scene;
   keyMesh.scale.set(0.1, 0.1, 0.1);
   keyMesh.position.set(-5, 0, 5); // Position of the key
   keyMesh.castShadow = true;
   keyMesh.receiveShadow = true;
   scene.add(keyMesh);
  },
  undefined,
  function (error) {
   console.error('An error happened while loading the key model.');
  }
 );

 // --- Ground ---
 const groundGeometry = new THREE.PlaneGeometry(100, 100, 100, 100);
 const groundMaterial = new THREE.MeshLambertMaterial({
  color: 0x808080
 });
 groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
 groundMesh.rotation.x = -Math.PI / 2;
 groundMesh.receiveShadow = true;
 scene.add(groundMesh);

 // --- Camera Setup ---
 camera.position.y = 1.6; // Average human eye height
 camera.position.z = 5;

 // --- Message Box ---
 const messageBox = document.getElementById('messageBox');
 const messageText = document.getElementById('messageText');

 function showMessage(message) {
  messageText.textContent = message;
  messageBox.style.display = 'block';
  controls.unlock(); // Unlock controls when message box is shown
 }

 function closeMessageBox() {
  messageBox.style.display = 'none';
  controls.lock(); // Relock controls when message box is closed
 }

 // --- Game State ---
 let gameStarted = false;

 function startGame() {
  controls.lock();
  overlay.style.display = 'none';
  gameStarted = true;
  health = 100; // Reset health
  stamina = 100; // Reset stamina
  updateHealthBar();
  updateStaminaBar();
  gameOverScreen.style.display = 'none'; // Hide game over screen
  monsterHealth = 50; // Reset monster health

  // Play background music when game starts
  playSound(backgroundMusic);
 }

 function restartGame() {
  // Reset player position
  controls.getObject().position.set(0, 1.6, 5);
  // Hide game over screen
  gameOverScreen.style.display = 'none';
  startGame(); // Restart the game
 }

 // --- Monster Health ---
 let monsterHealth = 50;

 function attack() {
  if (!monsterMesh) return; // If no monster, exit

  const distanceToMonster = controls.getObject().position.distanceTo(monsterMesh.position);

  if (distanceToMonster < 3) {
   // Attack logic
   monsterHealth -= weaponDamage; // Reduce monster health
   showMessage("You attacked the monster for " + weaponDamage + " damage!");

   if (monsterHealth <= 0) {
    scene.remove(monsterMesh); // Remove the monster
    monsterMesh = null; // Set monsterMesh to null
    showMessage("You defeated the monster!");
   }
  } else {
   showMessage("Monster is out of range!");
  }
 }

 // --- Minimap ---
 const minimapCanvas = document.getElementById('minimap');
 const minimapContext = minimapCanvas.getContext('2d');

 function updateMinimap() {
  minimapContext.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  // Player position on minimap
  const playerX = controls.getObject().position.x;
  const playerZ = controls.getObject().position.z;

  // Scale player position to fit within minimap
  const minimapScale = 2; // Adjust for desired minimap size relative to game world
  const playerMinimapX = (playerX * minimapScale) + minimapCanvas.width / 2;
  const playerMinimapY = (playerZ * minimapScale) + minimapCanvas.height / 2;

  // Draw player as a white dot
  minimapContext.fillStyle = 'white';
  minimapContext.fillRect(playerMinimapX - 2, playerMinimapY - 2, 4, 4);

  // Draw monster if it exists
  if (monsterMesh) {
   const monsterX = monsterMesh.position.x;
   const monsterZ = monsterMesh.position.z;
   const monsterMinimapX = (monsterX * minimapScale) + minimapCanvas.width / 2;
   const monsterMinimapY = (monsterZ * minimapScale) + minimapCanvas.height / 2;

   minimapContext.fillStyle = 'red';
   minimapContext.fillRect(monsterMinimapX - 2, monsterMinimapY - 2, 4, 4);
  }
 }

 function updatePhysics() {
  if (!gameStarted) return; // Only update physics if the game has started

  raycaster.ray.origin.copy(controls.getObject().position);
  raycaster.ray.origin.y -= 1; // Shift origin slightly below camera
  const intersections = raycaster.intersectObjects([groundMesh]);

  const onObject = intersections.length > 0;
  const delta = clock.getDelta();

  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;
  velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  moveSpeed = sprint && stamina > 0 ? 10.0 : 5.0; //Sprinting speed

  if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

  if (onObject === true) {
   velocity.y = Math.max(0, velocity.y);
   canJump = true;
  }

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);
  controls.getObject().position.y += velocity.y * delta; // New behavior

  if (controls.getObject().position.y < 1.6) {
   velocity.y = 0;
   controls.getObject().position.y = 1.6;

   canJump = true;
  }

  // Stamina management
  if (sprint && (moveForward || moveBackward || moveLeft || moveRight)) {
   if (stamina > 0) {
    stamina -= 1; // drain stamina
   } else {
    sprint = false; //Stop sprinting
   }
  } else if (stamina < 100) {
   stamina += 0.5; //Regen stamina
  }

  stamina = Math.max(0, Math.min(100, stamina)); //Clamp stamina
  updateStaminaBar();

  // Monster AI (Simple)
  if (monsterMesh) {
   const targetPosition = controls.getObject().position.clone();
   const monsterPosition = monsterMesh.position.clone();
   const directionToPlayer = targetPosition.sub(monsterPosition).normalize();

   monsterMesh.position.add(directionToPlayer.multiplyScalar(0.05)); // Adjust speed

   // Check for monster proximity
   const distanceToMonster = controls.getObject().position.distanceTo(monsterMesh.position);
   if (distanceToMonster < 2) {
    health -= 1; // Decrease health
    updateHealthBar();
    if (health <= 0) {
     // Game Over Logic
     // alert("Game Over!");
     showGameOver();
     gameStarted = false; // Stop game updates
    }
   }
  }

  // Item interaction
  if (itemMesh) {
   const distanceToItem = controls.getObject().position.distanceTo(itemMesh.position);
   if (distanceToItem < 2) {
    addItemToInventory("Lantern");
    scene.remove(itemMesh);
    itemMesh = null; // Remove the reference to the item
    showMessage("You picked up a Lantern!"); // Show message
   }
  }

  // Key interaction
  if (keyMesh) {
   const distanceToKey = controls.getObject().position.distanceTo(keyMesh.position);
   if (distanceToKey < 2) {
    addItemToInventory("Key");
    scene.remove(keyMesh);
    keyMesh = null; // Remove the reference to the key
    showMessage("You picked up a Key!"); // Show message
   }
  }
 }

 // --- Interaction Function ---
 function interact() {
  if (!interactableObject) return; // If no interactable object, exit

  const distanceToInteractable = controls.getObject().position.distanceTo(interactableObject.position);

  if (distanceToInteractable < 2) {
   // Interaction logic - example: change object color
   interactableObject.traverse(function (child) {
    if (child instanceof THREE.Mesh) {
     child.material.color.setHex(Math.random() * 0xffffff);
    }
   });
   showMessage("You interacted with the object!");
  }

  if (doorMesh) {
   const distanceToDoor = controls.getObject().position.distanceTo(doorMesh.position);
   if (distanceToDoor < 2) {
    if (inventory.includes("Key")) {
     showMessage("You opened the door with the key!");
     scene.remove(doorMesh); // Remove the door
     doorMesh = null; // Set doorMesh to null
     removeItemFromInventory("Key"); // Remove key from inventory
    } else {
     showMessage("The door is locked. Find a key!");
    }
   }
  }
 }

 // --- Use Item Function ---
 function useItem() {
  if (inventory.includes("Lantern")) {
   // Use lantern logic
   showMessage("You used the Lantern to light your way!");
   // Add actual lantern lighting effect here
   scene.fog.density = 0.05; //Example, makes fog thinner
  } else {
   showMessage("You have no items to use!");
  }
 }

 // --- Clock ---
 const clock = new THREE.Clock();

 // --- Animation Loop ---
 function animate() {
  requestAnimationFrame(animate);

  stats.update(); //Update FPS stats

  updatePhysics();
  updateMinimap(); // Update the minimap
  renderer.render(scene, camera);
 }

 // --- Window Resize Handler ---
 function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
 }
 window.addEventListener('resize', onWindowResize, false);

 // --- Audio ---
 const backgroundMusic = document.getElementById('backgroundMusic');
 const monsterSound = document.getElementById('monsterSound');

 function playSound(audio) {
  audio.currentTime = 0; // Reset to the beginning
  audio.play();
 }

 animate();
