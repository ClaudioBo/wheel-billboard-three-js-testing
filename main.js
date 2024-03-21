// Import Three.js
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

// Setup everything
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 1.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const kartGroup = new THREE.Group()

// Function to create the kart
const createKart = () => {
    const mainKartMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const mainKartWireframeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    const mainKartGeometry = new THREE.BoxGeometry(2, 0.1, 1);
    const mainKartMesh = new THREE.Mesh(mainKartGeometry, mainKartMaterial);
    const mainKartWireframe = new THREE.Mesh(mainKartGeometry, mainKartWireframeMaterial);
    const mainKartAxesHelper = new THREE.AxesHelper(1)
    mainKartMesh.add(mainKartWireframe);
    mainKartMesh.add(mainKartAxesHelper)
    kartGroup.add(mainKartMesh); // Add mainKart to the group
}
createKart()

// Create a template group that would store a Sprite and DebugSquare
const createWheel = () => {

    // Debug square material
    const debugSquareGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const debugSquareMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true });

    // Wheel material
    const wheelSpriteTexture = new THREE.TextureLoader().load('wheel_sprite_sheet.png');
    wheelSpriteTexture.magFilter = THREE.NearestFilter;
    wheelSpriteTexture.minFilter = THREE.NearestFilter;
    const wheelSpriteMaterial = new THREE.SpriteMaterial({ map: wheelSpriteTexture });

    // Wheel group
    const wheelGroup = new THREE.Group()

    const wheelSprite = new THREE.Sprite(wheelSpriteMaterial);
    wheelSprite.scale.set(0.5, 0.5, 1);

    // Debug wireframe
    const debugSquareMesh = new THREE.Mesh(debugSquareGeometry, debugSquareMaterial);

    // Debug text
    const textSprite = new SpriteText('#');
    textSprite.textHeight = 0.05
    textSprite.strokeColor = "black"
    textSprite.strokeWidth = 1

    wheelGroup.add(wheelSprite)
    wheelGroup.add(debugSquareMesh)
    wheelGroup.add(textSprite)

    return wheelGroup
}

// Create 4 kart's wheels
const createKartWheels = () => {
    for (let i = 0; i < 4; i++) {
        const wheelNew = createWheel()
        wheelNew.name = i
        kartGroup.add(wheelNew)
    }
}
createKartWheels()

// Add the group to the scene
scene.add(kartGroup);

// Spritesheet properties
const wheelFramesPerColumn = 16;
const wheelFrameWidth = 32;
const wheelFrameHeight = 32;
const wheelTextureWidth = 512;
const wheelTextureHeight = 32;

// Function to set sprite frame
function setSpriteFrame(sprite, frameIndex, mirror = false, rotationDegree = 0) {
    const x = (frameIndex % wheelFramesPerColumn) * wheelFrameWidth;
    const y = Math.floor(frameIndex / wheelFramesPerColumn) * wheelFrameHeight;

    // Calculate texture offsets and repeats
    const offsetX = x / wheelTextureWidth;
    const offsetY = 1 - (y + wheelFrameHeight) / wheelTextureHeight;
    const repeatX = wheelFrameWidth / wheelTextureWidth;
    const repeatY = wheelFrameHeight / wheelTextureHeight;

    // Set texture coordinates
    sprite.material.map.offset.set(offsetX, offsetY);
    sprite.material.map.repeat.set(repeatX, repeatY);

    // Rotate texture by degrees
    sprite.material.rotation = rotationDegree * Math.PI / 180; // Convert degrees to radians for Three.js

    // Mirror texture horizontally if requested
    if (mirror) {
        sprite.material.map.repeat.x *= -1;
        sprite.material.map.offset.x += repeatX;
    }
}

function updateKartChildPositions() {
    // Update position and rotation for the main kart
    const mainKart = kartGroup.children[0];

    // Calculate the positions of wheel group relative to the main kart's local space
    const offsetX = 0.74;
    const offsetY = -0;
    const offsetZ = 0.65;
    const wheelLocalPositions = [
        new THREE.Vector3(-offsetX, offsetY, -offsetZ),
        new THREE.Vector3(offsetX, offsetY, -offsetZ),
        new THREE.Vector3(-offsetX, offsetY, offsetZ),
        new THREE.Vector3(offsetX, offsetY, offsetZ),
    ];

    // Update positions and rotations for the wheel group
    for (let i = 1; i <= 4; i++) {
        const wheelGroup = kartGroup.children[i]

        const wheelLocalPosition = wheelLocalPositions[i - 1];

        // Apply main kart's rotation to wheel local position
        const rotatedWheelLocalPosition = wheelLocalPosition.clone().applyQuaternion(mainKart.quaternion);

        // Calculate position in world space
        const wheelPosition = mainKart.position.clone().add(rotatedWheelLocalPosition);

        // Set positions
        wheelGroup.position.copy(wheelPosition);
    }
}

// Functions to update the frame for each wheel based on the camera's view
function updateKartWheelFrames() {
    for (let i = 1; i <= 4; i++) {
        const wheelGroup = kartGroup.children[i];
        changeWheelSpriteBasedOnCamera(wheelGroup)
    }
}

function changeWheelSpriteBasedOnCamera(wheelGroup) {
    // Calculate the angle between the camera's position and the wheel's position
    const relativePosition = wheelGroup.position.clone().sub(camera.position);
    const angleToCamera = Math.atan2(relativePosition.z, relativePosition.x) * (180 / Math.PI);

    // Frame selection, sprite rotation and mirroring
    let frameIndex;
    let rotationDegree = 0;
    let mirror = false;

    if (angleToCamera >= 0 && angleToCamera <= 90) {
        frameIndex = Math.floor((angleToCamera / 90) * wheelFramesPerColumn);
        mirror = true;
    } else if (angleToCamera > 90 && angleToCamera <= 180) {
        frameIndex = Math.floor(((180 - angleToCamera) / 90) * wheelFramesPerColumn);
        rotationDegree = 180;
        mirror = true;
    } else if (angleToCamera > -180 && angleToCamera <= -90) {
        frameIndex = Math.floor(((180 + angleToCamera) / 90) * wheelFramesPerColumn);
        rotationDegree = 180;
    } else if (angleToCamera > -90 && angleToCamera < 0) {
        frameIndex = Math.floor(((-angleToCamera) / 90) * wheelFramesPerColumn);
    }

    // Debugging text
    wheelGroup.children[2].text = `Angle: ${angleToCamera.toFixed(1)}\nFrame: ${frameIndex}\nRotation: ${rotationDegree}\nMirror: ${mirror}`

    // Update the frame for the current wheel
    setSpriteFrame(wheelGroup.children[0], frameIndex, mirror, rotationDegree);
}

// Define variables for mouse orbit controls
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Define the target point around which the camera will orbit
const orbitTarget = new THREE.Vector3();

// Define the zoom speed
const zoomSpeed = 0.1;

// Function to handle mouse down event
function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = { x: event.clientX, y: event.clientY };
}

// Function to handle mouse move event
function onMouseMove(event) {
    if (isDragging) {
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };

        const deltaRotationQuaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(
                -deltaMove.y * (Math.PI / 180),
                -deltaMove.x * (Math.PI / 180),
                0,
                'XYZ'
            ));

        camera.position.sub(orbitTarget);
        camera.position.applyQuaternion(deltaRotationQuaternion);
        camera.position.add(orbitTarget);
        camera.lookAt(orbitTarget);

        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
}

// Function to handle mouse up event
function onMouseUp(event) {
    isDragging = false;
}

// Function to handle mouse wheel event (zoom)
function onMouseWheel(event) {
    const delta = event.deltaY;
    const zoomDirection = delta > 0 ? -1 : 1;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const zoomDelta = forward.clone().multiplyScalar(zoomSpeed * zoomDirection);

    camera.position.add(zoomDelta);
}

// Add event listeners for mouse controls
document.addEventListener('wheel', onMouseWheel, false);

// Function to handle key presses
function onKeyDown(event) {
    if (event.key == "x")
        isCameraRotation = !isCameraRotation
    if (event.key == " ")
        console.log(kartGroup.children[4].children[2].text.replaceAll("\n", ", "))
}

let isCameraRotation = false

// Add event listeners for mouse controls
document.addEventListener('mousedown', onMouseDown, false);
document.addEventListener('mousemove', onMouseMove, false);
document.addEventListener('mouseup', onMouseUp, false);
document.addEventListener('keydown', onKeyDown, false);


// Function to update camera position and rotation
function updateCamera() {
    if (!isCameraRotation) return
    const radius = 2; // Distance of the camera from the kart
    const cameraRotationSpeed = 0.0005; // Speed of camera rotation

    // Calculate new angle for the camera
    const cameraAngle = Date.now() * cameraRotationSpeed;

    // Calculate new position for the camera based on its rotation around the kart
    const cameraX = kartGroup.position.x + radius * Math.sin(cameraAngle);
    const cameraY = kartGroup.position.y + radius * Math.sin(cameraAngle);
    const cameraZ = kartGroup.position.z + radius * Math.cos(cameraAngle);

    // Set the new position for the camera
    camera.position.set(cameraX, 0, cameraZ);

    // Set the camera to look at the kart
    camera.lookAt(kartGroup.position);
}


// Function to animate the scene
function animate() {
    updateCamera();

    updateKartChildPositions()
    updateKartWheelFrames()

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Start animation
animate();
