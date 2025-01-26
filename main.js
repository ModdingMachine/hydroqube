// Three.js setup
const canvas = document.querySelector('#bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    alpha: true, 
    antialias: true 
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x006994, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(-15, 20, 10);
scene.add(directionalLight);

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
    constructor(side, index, yOffset, scale) {
        const geometry = new THREE.BoxGeometry(scale, scale, scale);
        const material = new THREE.MeshPhongMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.4,
            shininess: 50,
            specular: 0x004a7c,
            refractionRatio: 0.98,
            reflectivity: 0.7,
            flatShading: true
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
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
            (Math.random()*5 - 2.5) * 0.005,
            (Math.random()*5 - 2.5) * 0.005,
            (Math.random()*5 - 2.5) * 0.005
        );
        
        // Store initial speeds for reference
        this.initialRotationSpeed = this.rotationSpeed.clone().multiplyScalar(2);
        // Create slower base speed for when not scrolling
        this.baseRotationSpeed = this.rotationSpeed.clone().multiplyScalar(0.2);
        
        // Set current rotation speed to initial speed for falling animation
        this.currentRotationSpeed = this.initialRotationSpeed.clone();
        
        // Add scroll tracking
        this.lastScrollY = window.pageYOffset;
        
        // Add direction tracking
        this.rotationDirection = 1;
        
        // Movement
        this.velocity = new THREE.Vector3(0, -0.5, 0);
        this.targetY = window.innerHeight * 0.25 / 40  + yOffset;
        this.falling = true;
        
        // Add splash particles array to Cube class
        this.splashParticles = [];
        this.hasSplashed = false;
        
        // Add initial and final scale
        this.initialScale = scale/3;
        this.finalScale = 1.5/3;
        this.mesh.scale.set(this.initialScale, this.initialScale, this.initialScale);
        
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

    createSplash() {
        for(let i = 0; i < 20; i++) {
            this.splashParticles.push(new SplashParticle(this.mesh.position));
        }
        this.hasSplashed = true;
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
            const bottomOfScreen = -(window.innerHeight * 1.2) / 40;
            const targetY = THREE.MathUtils.lerp(this.targetY, bottomOfScreen, scrollRatio);
            
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

// Create cubes
const cubes = [
    new Cube('left', -0.1, 0, 3),
    new Cube('left', -1.5, -1, 3),
    new Cube('left', -0.75, 5, 2.3),
    new Cube('right', 0, -1, 2.5),
    new Cube('right', 1.4, 3, 3)
];

// Animation loop
function animate() {
    cubes.forEach(cube => cube.update());
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

// Enhanced smooth scroll for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        const navHeight = document.querySelector('nav').offsetHeight;
        
        window.scrollTo({
            top: targetSection.offsetTop - navHeight,
            behavior: 'smooth'
        });
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