var x, y;
        document.onmousemove = function(e){
            x = e.pageX;
            y = e.pageY;
            }
            var count = 0;

            var dt = 1/240, R = 0.2;

            var clothMass = 1;  // 1 kg in total
            var clothSize = 1.5; // 1 meter
            var Nx = 30;
            var Ny = 23;
            var mass = clothMass / Nx*Ny;

            var restDistance = clothSize/Nx;

            var ballSize = 0.12;

            var clothFunction = plane(restDistance * Nx, restDistance * Ny);

            function plane(width, height) {
                return function(u, v) {
                    var x = (u-0.5) * width;
                    var y = (v+0.5) * height;
                    var z = 0;
                    return new THREE.Vector3(x, y, z);
                };
            }

            if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

            var container, stats;
            var camera, scene, renderer;

            var clothGeometry;
            var sphereMesh, sphereBody;
            var object;
            var particles = [];
            var world;

            function initCannon(){
                        var DEBUG = false;
if(!DEBUG){
    if(!window.console) window.console = {};
    var methods = ["log", "debug", "warn", "info","dir", "dirxml", "trace", "profile"];
    for(var i=0;i<methods.length;i++){
        console[methods[i]] = function(){};
    }
}
                world = new CANNON.World();
                world.broadphase = new CANNON.NaiveBroadphase();
                world.gravity.set(0,-9.82,0);
                world.solver.iterations = 20;

                // Materials
                var clothMaterial = new CANNON.Material();
                var sphereMaterial = new CANNON.Material();
                var clothSphereContactMaterial = new CANNON.ContactMaterial(  clothMaterial,
                                                                              sphereMaterial,
                                                                              0.0, // friction coefficient
                                                                              0.0  // restitution
                                                                              );
                // Adjust constraint equation parameters for ground/ground contact
                clothSphereContactMaterial.contactEquationStiffness = 1e9;
                clothSphereContactMaterial.contactEquationRelaxation = 1;

                // Add contact material to the world
                world.addContactMaterial(clothSphereContactMaterial);

                // Create sphere
                var sphereShape = new CANNON.Sphere(ballSize*1.3);
                sphereBody = new CANNON.Body({
                    mass: 0
                });
                sphereBody.addShape(sphereShape);
                sphereBody.position.set(0,0,0);
                world.addBody(sphereBody);

                // Create cannon particles
                for ( var i = 0, il = Nx+1; i !== il; i++ ) {
                    particles.push([]);
                    for ( var j = 0, jl = Ny+1; j !== jl; j++ ) {
                        var idx = j*(Nx+1) + i;
                        var p = clothFunction(i/(Nx+1), j/(Ny+1));
                        var particle = new CANNON.Body({
                            mass: j==Ny ? 0 : mass
                        });
                        particle.addShape(new CANNON.Particle());
                        particle.linearDamping = 0.5;
                        particle.position.set(
                            p.x,
                            p.y-Ny * 0.9 * restDistance,
                            p.z
                        );
                        particles[i].push(particle);
                        world.addBody(particle);
                        particle.velocity.set(0,0,-0.01*(Ny-j));
                    }
                }
                function connect(i1,j1,i2,j2){
                    world.addConstraint( new CANNON.DistanceConstraint(particles[i1][j1],particles[i2][j2],restDistance) );
                }
                for(var i=0; i<Nx+1; i++){
                    for(var j=0; j<Ny+1; j++){
                        if(i<Nx) connect(i,j,i+1,j);
                        if(j<Ny) connect(i,j,i,j+1);
                    }
                }
                init();
            }

            function init() {


                container = document.getElementById( 'fh5co-main' );
                document.body.appendChild( container );

                // scene

                scene = new THREE.Scene();

                // camera

                camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.5, 10000 );

                camera.position.set(0,
                                    0,
                                    Math.sin( Math.PI/4 ) * 3);

                scene.add( camera );

                // cloth material

                var clothTexture = THREE.ImageUtils.loadTexture( 'images/text4.jpg' );
                clothTexture.anisotropy = 16;


                var clothMaterial = new THREE.MeshBasicMaterial( {
                   color: 0xffffff,
                    // alphaTest: 0.5,
                    // ambient: 0xffffff,
                    // color: 0xffffff,
                    // specular: 0x969696,
                    // emissive: 0x7c7c7c,
                    //shininess: 5,
                    map: clothTexture,
                    // side: THREE.DoubleSide
                } );

                // cloth geometry
                clothGeometry = new THREE.ParametricGeometry( clothFunction, Nx, Ny, true );
                clothGeometry.dynamic = true;
                clothGeometry.computeFaceNormals();

                // cloth mesh
                object = new THREE.Mesh(clothGeometry, clothMaterial);
                object.position.set(-0.15, -0.05, 0);
                object.castShadow = true;
                //object.receiveShadow = true;
                scene.add( object );

                // sphere
                var ballGeo = new THREE.SphereGeometry( ballSize, 20, 20 );
                var ballMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, opacity : 0} );

                sphereMesh = new THREE.Mesh( ballGeo, ballMaterial );
                sphereMesh.visible = false;
                sphereMesh.castShadow = true;
                //sphereMesh.receiveShadow = true;
                scene.add( sphereMesh );


                renderer = new THREE.WebGLRenderer( { antialias: true } );
                renderer.setSize( window.innerWidth, window.innerHeight );
                renderer.setClearColor( 0xffffff );

                container.appendChild( renderer.domElement );

                renderer.gammaInput = true;
                renderer.gammaOutput = true;
                renderer.physicallyBasedShading = true;

                window.addEventListener( 'resize', onWindowResize, false );

                camera.lookAt( sphereMesh.position );
                animate();

            }

            //

            function onWindowResize() {

                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();

                renderer.setSize( window.innerWidth, window.innerHeight );

            }

            function animate() {
                requestAnimationFrame( animate );
                world.step(dt);
                var t = world.time;
                // sphereBody.position.set(x/window.innerWidth-0.3, -y/window.innerHeight+0.45, -0.03);
                sphereBody.position.set((x / window.innerWidth ) * 2 - 1, - ( y / window.innerHeight ) * 2 + 1, -0.03);
                render();
                // console.log(x, y);
                // getCor();
            }

            function render() {

                for ( var i = 0, il = Nx+1; i !== il; i++ ) {
                    for ( var j = 0, jl = Ny+1; j !== jl; j++ ) {
                        var idx = j*(Nx+1) + i;
                        clothGeometry.vertices[idx].copy(particles[i][j].position);
                    }
                }

                clothGeometry.computeFaceNormals();
                clothGeometry.computeVertexNormals();

                clothGeometry.normalsNeedUpdate = true;
                clothGeometry.verticesNeedUpdate = true;

                sphereMesh.position.copy(sphereBody.position);

                renderer.render( scene, camera );

            }

            window.addEventListener( 'load', function(){
              initCannon();
            });