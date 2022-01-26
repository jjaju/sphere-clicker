// used tutorials: 
// Textures: https://www.youtube.com/watch?v=aJun0Q0CG_A
// Raycasting: https://www.youtube.com/watch?v=ZYi0xGp882I

import * as THREE from "./node_modules/three/build/three.module.js";
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";
import { FlakesTexture } from "./node_modules/three/examples/jsm/textures/FlakesTexture.js";
import { RGBELoader } from "./node_modules/three/examples/jsm/loaders/RGBELoader.js";

let scene, renderer, camera, ambLight, controls, raycaster, envMapTexture, texture, lastSphereWasTemp, mouseMoved;
let palette = [], spheres = [], sphereMeshes = [];

function main(){

    /** SETUP */

    // scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x808080 );
    scene.fog = new THREE.Fog( 0x808080, 20, 60);

    // camera
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    camera.position.x = 0;
    camera.position.y = 5;
    camera.position.z = 30;
    camera.lookAt(new THREE.Vector3(0,0,0));
    
    // lights
    ambLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambLight);

    const numLights = 2;
    for (let i = 0; i < numLights; i++)
    {
        const light = new THREE.PointLight(0xffffff, 0.2); 
        light.position.set((Math.random() - 0.5) * 2 * 10, (Math.random() - 0.5) * 2 * 10, (Math.random() - 0.5) * 2 * 10);
        light.castShadow = true;
        scene.add(light);
    }

    // renderer
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    document.getElementById("webgl").appendChild(renderer.domElement);

    // user controls
    controls = new OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true;
    controls.update();

    
    // colors
    palette[0] = 0x01295F;
    palette[1] = 0xFFB30F;
    palette[2] = 0xFD151B; 

    /** SETUP DONE */


    // load environment texture
    // texture from: https://polyhaven.com/a/empty_warehouse_01
    const envMapLoader = new THREE.PMREMGenerator(renderer);
    new RGBELoader().setPath("textures/").load("empty_warehouse_01_2k.hdr", function(hdrMap){

        envMapTexture = envMapLoader.fromCubemap(hdrMap);
        
        // get texture used on spheres
        texture = new THREE.CanvasTexture(new FlakesTexture());
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.x = 10;
        texture.repeat.y = 6;
        
        // pick color of first sphere 
        const firstSphereColor = pickColor();

        // create first sphere 
        generateSphere(10, firstSphereColor, new THREE.Vector3(0.0));
    } );



    raycaster = new THREE.Raycaster();


    // event for clicking --> Adding a permanent sphere
    const clickMouse = new THREE.Vector2();
    window.addEventListener('pointerdown', event => {
        // clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        // clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        let rect = renderer.domElement.getBoundingClientRect();
        clickMouse.x = ((event.clientX - rect.left)/ (rect.right - rect.left)) * 2 - 1;
        clickMouse.y = -((event.clientY - rect.top)/ (rect.bottom - rect.top)) * 2 + 1;
        raycaster.setFromCamera(clickMouse, camera);
        const isect = raycaster.intersectObjects(sphereMeshes);
        if(isect.length > 0 && isect[0].object.geometry){
            const mesh = isect[0].object;
            const geo = mesh.geometry;
            const mat = mesh.material;
            const point = isect[0].point;
            const face = isect[0].face;

            let col = pickColor();

            let newSphereSize =  0.5 * (mesh.geometry.boundingBox.max.x - mesh.geometry.boundingBox.min.x);
            let normal = new THREE.Vector3(face.normal.x, face.normal.y, face.normal.z);
            let newSpherePos = point.add(normal.multiplyScalar(newSphereSize * 0.5));
            normal.normalize();
            let newSpherePosTemp = new THREE.Vector3(newSpherePos.x, newSpherePos.y, newSpherePos.z);
            let newSphereCollisionPos = newSpherePos.add(normal.multiplyScalar(0.05));
            newSpherePos = newSpherePosTemp;
            generateSphere(newSphereSize, col, newSpherePos, newSphereCollisionPos);
        }
    })

    // event for hovering above geometry --> Adding a temporary sphere
    const mouse = new THREE.Vector2();
    window.addEventListener('mousemove', event => {
        // mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        // mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        let rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left)/ (rect.right - rect.left)) * 2 - 1;
        mouse.y = -((event.clientY - rect.top)/ (rect.bottom - rect.top)) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const isect = raycaster.intersectObjects(sphereMeshes);
        if(isect.length > 0 && isect[0].object.geometry){
            const mesh = isect[0].object;
            const geo = mesh.geometry;
            const mat = mesh.material;
            const point = isect[0].point;
            const face = isect[0].face;

            // set position and size of temporary sphere
            let newSphereSize =  0.5 * (mesh.geometry.boundingBox.max.x - mesh.geometry.boundingBox.min.x);
            let normal = new THREE.Vector3(face.normal.x, face.normal.y, face.normal.z);
            let newSpherePos = point.add(normal.multiplyScalar(newSphereSize * 0.5));
            normal.normalize();
            newSpherePos = newSpherePos.add(normal.multiplyScalar(0.03));

            // and generate sphere with those
            generateTempSphere(newSphereSize, newSpherePos);
            
        }

        // if mouse is no longer hovering above geo: delete last temp sphere and update information about last element of scene.children
        else{
            const lastIndex = scene.children.length - 1;
            if(lastSphereWasTemp){
                scene.remove(scene.children[lastIndex]);  
                lastSphereWasTemp = false;
            }
        }
        mouseMoved = true;
    })

    window.addEventListener('resize', event =>	{
        var width = window.innerWidth;
        var height = window.innerHeight;
        renderer.setSize( width, height );
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
	})

    render();
}

function render() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

// pick random color from palette 
function pickColor(){
    let colorPicker = Math.random();
    if(colorPicker <= 0.33){
        return palette[0]; 
    }
    else if(colorPicker > 0.33 && colorPicker < 0.66){
        return palette[1];
    }
    else{
        return palette[2];
    }
}

// check if sphere intersects any of the permanent spheres
function checkCollisionSphere(sphere){
    for (let otherSphere of spheres){
        let collision = sphere.intersectsSphere(otherSphere);
        if (collision){
            return true;
        }
    }
    return false;
}

// generate permanent sphere
function generateSphere(size, color, position, collisionPosition){
    const radius = 0.5 * size;
    const sphereGeo = new THREE.SphereBufferGeometry(radius, 64, 64);

    const newSphereMaterial = {
        clearcoat: 1.0,
        clearcoatRoughness: 0.2,
        clearcoatRoughnessMap: texture,
        metalness: 0.9,
        roughness: 0.5,
        color: color,
        normalMap: texture,
        normalScale: new THREE.Vector2(0.15, 0.15),
        envMap: envMapTexture.texture,
        envMapIntensity: 0.7,
        sheen: 0.2,
        sheenColor: 0x0000ff
    };
    const newSphereMat = new THREE.MeshPhysicalMaterial(newSphereMaterial);
    const sphereMesh = new THREE.Mesh(sphereGeo, newSphereMat);
    sphereMesh.position.set(position.x, position.y, position.z);
    sphereMesh.geometry.computeBoundingBox();
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    
    // calculate intersection with sphere at collision position (translated by a small value into normal direction to avoid intersection with parent geo)
    const sphere = new THREE.Sphere(collisionPosition, radius);
    const isIntersect = checkCollisionSphere(sphere);
    if(!isIntersect){
        
        //only delete last added geo from scene if mouse has been moved in between two permanent spheres
        if(mouseMoved){
            const lastIndex = scene.children.length - 1;
            scene.remove(scene.children[lastIndex]);
        }
        
        // add collision sphere (at correct position of permanent geo) to colliders
        spheres.push(new THREE.Sphere(position, radius));
        
        // add geo to scene and update state
        scene.add(sphereMesh);
        lastSphereWasTemp = false;
        mouseMoved = false;

        // add geo to intersectable objects of raycaster
        sphereMeshes.push(sphereMesh);
    }

}

function generateTempSphere(size, position){
    const radius = 0.5 * size;
    const sphereGeo = new THREE.SphereBufferGeometry(radius, 30, 30);
    const newSphereMat = new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: false, opacity: 0.5, transparent: true});
    const sphereTempMesh = new THREE.Mesh(sphereGeo, newSphereMat);
    sphereTempMesh.position.set(position.x, position.y, position.z);
    const sphere = new THREE.Sphere(position, radius);
    const isIntersect = checkCollisionSphere(sphere);

    // only remove previously added sphere if it was a temp sphere
    if(lastSphereWasTemp){
        const lastIndex = scene.children.length - 1;
        scene.remove(scene.children[lastIndex]);
    }
    
    // set color based on intersection
    if(!isIntersect){
        sphereTempMesh.material.color.set(0x009f00);
    }
    else{
        sphereTempMesh.material.color.set(0x9f0000);
    }
    scene.add(sphereTempMesh);
    lastSphereWasTemp = true;
}
main();