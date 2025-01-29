// Three.js setup
const canvas = document.querySelector('#bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Add error handling for WebGL context
let renderer;
try {
    renderer = new THREE.WebGLRenderer({ 
        canvas, 
        alpha: true, 
        antialias: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false
    });
} catch (error) {
    console.error('WebGL error:', error);
}

// Add pixel ratio handling for iOS
const pixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio);

// Ensure proper sizing on iOS
function resizeRendererToDisplaySize() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return false; // Don't resize on mobile
    
    const width = canvas.clientWidth * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

// Initialize renderer
function initRenderer() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x006994, 0);
    resizeRendererToDisplaySize();
}

// Add context lost/restore handlers
canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
}, false);

canvas.addEventListener('webglcontextrestored', () => {
    initRenderer();
}, false);

initRenderer();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Left light
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight.position.set(-30, 40, 20);
scene.add(directionalLight);

// Right mirrored light
const mirroredLight = new THREE.DirectionalLight(0xffffff, 0.4);
mirroredLight.position.set(30, 40, 20);
scene.add(mirroredLight);

// Adjust secondary fill light
const secondaryLight = new THREE.DirectionalLight(0xffffff, 0.4);
secondaryLight.position.set(0, -10, 25);
scene.add(secondaryLight);

camera.position.z = 30;
camera.position.y = 0;

var scalar = 1; //keep direction of rotation with scrolling

// Add Splash particle class
class SplashParticle {
    constructor(position) {
        const spread = 0.15;
        const speed = 0.3;
        const isBox = Math.random() > 0.5;
        const size = Math.random() * 0.4 + 0.1;
        const geometry = isBox ? 
            new THREE.BoxGeometry(size, size, size) : 
            new THREE.SphereGeometry(size/2, 6, 6);
            
        const material = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.3,
            shininess: 90
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        
        // Random initial velocity
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * spread * speed,
            Math.random() * 0.3 * speed + 0.5 * speed,
            (Math.random() - 0.5) * spread * speed
        );
        //Random initial rotation
        this.mesh.rotation.x = (Math.random() - 0.5) * 3;
        this.mesh.rotation.y = (Math.random() - 0.5) * 3;
        this.mesh.rotation.z = (Math.random() - 0.5) * 3;
        
        this.life = Math.random() * 6 + 0.5;
        this.gravity = -0.015 * speed;
        
        scene.add(this.mesh);
    }
    
    update() {
        // Apply gravity
        this.velocity.y += this.gravity;
        this.mesh.position.add(this.velocity);
        
        // Fade out
        this.life -= 0.02;
        this.mesh.material.opacity = this.life * 0.3;
        
        return this.life > 0;
    }
    
    remove() {
        scene.remove(this.mesh);
    }
}

class Cube {
    constructor(side, index, yOffset, scale, position = 'outer') {
        const geometry = new THREE.BoxGeometry(scale, scale, scale);
        const material = new THREE.MeshPhongMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7,
            shininess: 1,         // Reduced shininess for less glare
            specular: 0xffffff,    // Darker specular highlights
            refractionRatio: 0.98,
            reflectivity: 0.7,
            flatShading: false,    // Changed to smooth shading
        });
        
        // Add subtle bevel to edges
        const bevGeometry = new THREE.BoxGeometry(scale * 0.99, scale * 0.99, scale * 0.99);
        const edges = new THREE.EdgesGeometry(bevGeometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ 
                color: 0x000000, 
                transparent: true, 
                opacity: 0.2 
            })
        );
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.add(line); // Add edges to cube
        this.bubbles = [];
        this.bubbleSystem = new THREE.Group();
        scene.add(this.bubbleSystem);
        
        // Position
        const xOffset = side === 'left' ? -30 : 30;
        const xSpread = (index * 10);
        
        this.mesh.position.set(
            xOffset + xSpread,
            35,
            0
        );
        
        // Simple rotation - store original speeds
        this.rotationSpeed = new THREE.Vector3(
            (Math.random()*2 - 1) * 0.01,
            (Math.random()*2 - 1) * 0.01,
            (Math.random()*2 - 1) * 0.01
        );
        
        // Store initial speeds for reference
        this.initialRotationSpeed = this.rotationSpeed.clone().multiplyScalar(2);
        // Create slower base speed for when not scrolling
        this.baseRotationSpeed = this.rotationSpeed.clone().multiplyScalar(0.15);
        
        // Set current rotation speed to initial speed for falling animation
        this.currentRotationSpeed = this.initialRotationSpeed.clone();
        
        // Add scroll tracking
        this.lastScrollY = window.pageYOffset;
        
        // Add direction tracking
        this.rotationDirection = 1;
        
        // Movement
        this.velocity = new THREE.Vector3(0, -0.5, 0);
        this.targetY = window.innerHeight * 0.25 / 40  + yOffset;
        this.startY = this.targetY;
        this.finalY = window.innerHeight * 0.85 / 40 + 2*yOffset;
        // Set the target Y to where the animation will pick up to ease in:
        // Calculate scroll ratio and target position
        const scrollRatio = window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight);
        this.bottomOfScreen = this.targetY - this.finalY;
        this.targetY = THREE.MathUtils.lerp(this.targetY, this.bottomOfScreen, scrollRatio);

        this.falling = true;
        
        // Add initial and final scale
        this.initialScale = scale/3;
        this.finalScale = this.initialScale;
        this.mesh.scale.set(this.initialScale, this.initialScale, this.initialScale);
        
        this.position = position; // Add position property
        
        scene.add(this.mesh);
    }
    
    createBubble() {
        const bubbleGeometry = new THREE.SphereGeometry(Math.random() * 0.2 + 0.05, 8, 8);
        const bubbleMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2,
            shininess: 100,
            specular: 0x004a7c
        });
        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        
        bubble.position.copy(this.mesh.position);
        bubble.position.y -= 1;
        bubble.position.x += (Math.random() - 0.5) * 2;
        bubble.position.z += (Math.random() - 0.5) * 2;
        
        bubble.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            Math.random() * 0.05 + 0.02,
            (Math.random() - 0.5) * 0.02
        );
        bubble.life = 2.0;
        
        this.bubbles.push(bubble);
        this.bubbleSystem.add(bubble);
    }

    //ANIMATION
    update() {
        if (this.falling) {
            const distanceToTarget = (this.targetY - this.mesh.position.y);
            const speed = 0.05;
            this.mesh.position.y += (distanceToTarget * speed);
            
            // Apply rotation during fall at initial speed
            this.mesh.rotation.x += this.currentRotationSpeed.x * (-distanceToTarget * 0.3);
            this.mesh.rotation.y += this.currentRotationSpeed.y * (-distanceToTarget * 0.3);
            this.mesh.rotation.z += this.currentRotationSpeed.z * (-distanceToTarget * 0.3);
            
            //Spawn some bubbles
            if (Math.random() < Math.abs(distanceToTarget) * 0.05) {
                this.createBubble();
            }

            if (Math.abs(distanceToTarget) <= 0.25) {
                this.targetY = this.mesh.position.y;
                this.falling = false;
                // Transition to base rotation speed when stopping
                this.currentRotationSpeed.copy(this.baseRotationSpeed);
            }
        } else {
            // Calculate scroll speed
            const currentScrollY = window.pageYOffset;
            const scrollSpeed = (currentScrollY - this.lastScrollY) * 0.01;
            this.lastScrollY = currentScrollY;
            
            // Simpler rotation direction logic - directly use scroll direction
            if(0 < Math.abs(Math.sign(scrollSpeed))) {
                this.rotationDirection = Math.sign(scrollSpeed);
            }
            
            // Calculate scroll ratio and target position
            const scrollRatio = currentScrollY / (document.documentElement.scrollHeight - window.innerHeight);
            const targetY = THREE.MathUtils.lerp(this.startY, this.bottomOfScreen, scrollRatio);
            
            // Scale down based on scroll ratio
            const targetScale = THREE.MathUtils.lerp(this.initialScale, this.finalScale, scrollRatio);
            this.mesh.scale.set(targetScale, targetScale, targetScale);
            
            // Move cube
            const distanceToTarget = targetY - this.mesh.position.y;
            this.mesh.position.y += distanceToTarget * 0.05;
            
            // Smoothly transition rotation speed based on scroll speed
            const targetRotationSpeed = new THREE.Vector3();
            targetRotationSpeed.lerpVectors(
                this.baseRotationSpeed,
                this.initialRotationSpeed,
                Math.abs(scrollSpeed) * 2
            );
            
            // Smooth transition to target rotation speed
            this.currentRotationSpeed.lerp(targetRotationSpeed, 0.1);
            
            // Apply current rotation with direction
            this.mesh.rotation.x += this.currentRotationSpeed.x * this.rotationDirection;
            this.mesh.rotation.y += this.currentRotationSpeed.y * this.rotationDirection;
            this.mesh.rotation.z += this.currentRotationSpeed.z * this.rotationDirection;
            
            // Create bubbles based on scroll speed
            if (Math.random() < Math.abs(scrollSpeed) * 0.75) {
                this.createBubble();
            }

            //Remove splash particles
        }
        
        // Update bubbles
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const bubble = this.bubbles[i];
            bubble.position.add(bubble.velocity);
            bubble.life -= 0.01;
            bubble.material.opacity = bubble.life * 0.3;
            
            if (bubble.life <= 0) {
                this.bubbleSystem.remove(bubble);
                this.bubbles.splice(i, 1);
            }
        }
    }
}

// At the top of the file, after renderer setup
let cubes;

function handleResize() {
    if (!cubes) return;
    const isMobile = window.innerWidth <= 768;
    
    cubes.forEach(cube => {
        if (isMobile) {
            cube.mesh.visible = cube.position === 'middle';
            if (cube.bubbleSystem) {
                cube.bubbleSystem.visible = cube.position === 'middle';
            }
            
            if (cube.position === 'middle') {
                // Simpler positioning for mobile
                const screenWidth = window.innerWidth;
                const rightOffset = screenWidth; 
                cube.mesh.position.x = rightOffset / 40;
                cube.mesh.position.z = 0.5;
                
                // Reset rotation speeds first to prevent compounding
                cube.rotationSpeed.copy(cube.baseRotationSpeed);
                cube.initialRotationSpeed.copy(cube.rotationSpeed).multiplyScalar(4);
                cube.currentRotationSpeed.copy(cube.initialRotationSpeed);
            }
        } else {
            cube.mesh.visible = true;
            if (cube.bubbleSystem) {
                cube.bubbleSystem.visible = true;
            }
            if (cube.position === 'middle') {
                cube.mesh.position.x = 30;
                cube.mesh.position.z = 0;
                cube.rotationSpeed.divideScalar(2);
                cube.initialRotationSpeed.divideScalar(2);
                cube.currentRotationSpeed.divideScalar(2);
            }
        }
    });
}

// After Cube class definition
cubes = [
    new Cube('left', -0.1, 0, 3, 'outer'),
    new Cube('left', -1.5, -1, 3, 'outer'),
    new Cube('left', -0.75, 5, 2.3, 'outer'),
    new Cube('right', 0, -1, 3.2, 'middle'),
    new Cube('right', 1.4, 3, 2.5, 'outer')
];

handleResize();

// Animation loop
function animate() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile && resizeRendererToDisplaySize()) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    
    cubes.forEach(cube => cube.update());
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Handle window resize
window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height, false);
    }
    handleResize();
});

animate();

// Update smooth scroll for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        const navHeight = document.querySelector('nav').offsetHeight;
        
        // Use requestAnimationFrame for smoother scrolling
        const scrollToSection = () => {
            window.scrollTo({
                top: targetSection.offsetTop - navHeight,
                behavior: 'smooth'
            });
        };
        
        // Delay scroll slightly to ensure everything is calculated correctly
        requestAnimationFrame(scrollToSection);
    });
});

// Add active state to navigation items
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('nav a');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 150) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').substring(1) === current) {
            link.classList.add('active');
        }
    });
});

// Add this to the end of main.js
const slideshow = {
    currentSlide: 0,
    slides: document.querySelectorAll('.slide'),
    dots: document.querySelectorAll('.dot'),
    
    init() {
        document.querySelector('.prev').addEventListener('click', () => this.moveSlide(-1));
        document.querySelector('.next').addEventListener('click', () => this.moveSlide(1));
        
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index));
        });
    },
    
    moveSlide(direction) {
        this.currentSlide = (this.currentSlide + direction + this.slides.length) % this.slides.length;
        this.updateSlideshow();
    },
    
    goToSlide(index) {
        this.currentSlide = index;
        this.updateSlideshow();
    },
    
    updateSlideshow() {
        const slidesContainer = document.querySelector('.slides');
        slidesContainer.style.transform = `translateX(-${this.currentSlide * 100}%)`;
        
        this.dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide);
        });
    }
};

slideshow.init();

// Replace the existing form submission code with this simpler version
document.getElementById('contact-form').addEventListener('submit', function(e) {
    const submitButton = this.querySelector('.submit-button');
    submitButton.disabled = true;
    submitButton.textContent = 'Joining...';
    
    // FormSubmit will handle the rest
    // Button will be re-enabled after navigation
}); 