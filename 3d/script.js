// UTILS
function getRandomInt(min, max) {return Math.floor(Math.random() * (max - min)) + min;}
function l(id){return document.getElementById(id);}

// GAME
var Game={};
Game.Loader = new THREE.TextureLoader();
Game.init=function(){
	Game.T=0;
	Game.fps=30;
	Game.drawT=0;
	
	Game.deltaT=0;
	Game.lastUpdated=0;
	
	// constants
	Game.AU = 149597870700;
	Game.G = 6e-11;
	Game.SolarMass = 1.988e30;
	Game.EarthMass = 5.972e24;
	Game.JupiterMass = 1.898e27;
	Game.EarthRadius = 6.37e6;
	
	// settings
	Game.scale = Game.AU/100;
	Game.timeScale = 1;
	
	// scene+camera
	Game.Scene = new THREE.Scene();
	Game.Camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);
	Game.Camera.position.x = 5;
	window.addEventListener('resize',function(){
		Game.Camera.aspect = window.innerWidth / window.innerHeight;
		Game.Camera.updateProjectionMatrix();
		Game.Renderer.setSize( window.innerWidth, window.innerHeight );
	});
	
	Game.Renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
	Game.Renderer.setSize( window.innerWidth, window.innerHeight );
	l('wrapper').appendChild( Game.Renderer.domElement );
	
	// controls
	Game.Control = new THREE.OrbitControls(Game.Camera, Game.Renderer.domElement);
	Game.Control.enableDamping = true;
	Game.Control.dampingFactor = 0.25;
	
	// init solar system
	Game.initSolarSystem();
	
	// events
	Game.Raycaster = new THREE.Raycaster();
	Game.Intersects = [];
	Game.doIntersect = true;
	Game.Mouse = new THREE.Vector2();
	//Game.mouseDown = false;
	function onmousemove(event){
		Game.Mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		Game.Mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	}
	function ondblclick(event){
		if(Game.Intersects[0] && Game.Intersects[0].object && Game.doIntersect) {
			Game.doIntersect = false;
			Game.select(Game.Intersects[0].object);
		}
	}
	function onclick(event){}
	
	window.addEventListener('mousemove', onmousemove);
	window.addEventListener('click', onclick);
	window.addEventListener('dblclick', ondblclick);
	//window.addEventListener('mousedown', function (){Game.mouseDown=true;});
	//window.addEventListener('mouseup', function (){Game.mouseDown=false;});
	
	// update
	Game.draw();
	Game.logic();
};
// INIT SOLAR SYSTEM
Game.initSolarSystem = function(){
	// NOTE: obliquity is relative to sun's orbital plane, use (90-deg)/180*Math.PI
	var sun = new Game.Object(1.9e30,695000000,new THREE.MeshBasicMaterial({
		map: Game.Loader.load('img/sun.jpg')
	}));
	sun.rotation.x = 7.25/180*Math.PI;
	sun.aV = 4.6e-7;
	// TODO: directly implement this to Game.Object
	var sunlight = new THREE.PointLight(0xffffff);
	sunlight.position.copy(sun.P);
	Game.Scene.add(sunlight);
	
	var mercury = new Game.Object(3.3e23,2440000,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/mercury.png'),
		bumpMap: Game.Loader.load('img/mercury-height.jpg'),
		bumpScale: 0.01,
	}),{
		parent: sun,
		a: Game.AU*.38,
		e: 0.2,
		i: 3.38/180*Math.PI
	});
	mercury.rotation.x = (90-2.11)/180*Math.PI;
	mercury.aV = 1.97e-7;
	
	var venus = new Game.Object(4.8e24,6052000,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/venus.jpg'),
		bumpMap: Game.Loader.load('img/venus-height.jpg'),
		bumpScale: 0.01
	}),{
		parent: sun,
		a: Game.AU*.72,
		e: 0.006,
		i: 3.86/180*Math.PI
	});
	venus.rotation.x = (90-177)/180*Math.PI;
	venus.aV = 4.76e-8;
	
	var earth = new Game.Object(5.9e24,Game.EarthRadius,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/earth.jpg'),
		bumpMap: Game.Loader.load('img/earth-height.jpg'),
		bumpScale: 0.01
	}),{
		parent: sun,
		a: Game.AU*1,
		e: 0.02,
		i: 7.15/180*Math.PI
	});
	earth.rotation.x = (90-23.5)/180*Math.PI;
	earth.aV = 7.29e-5; // http://hpiers.obspm.fr/eop-pc/models/constants.html
	
	var mars = new Game.Object(6.41e23,3397000,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/mars.jpg'),
		bumpMap: Game.Loader.load('img/mars-height.jpg'),
		bumpScale: 0.005
	}),{
		parent:sun,
		a:Game.AU*1.52,
		e:0.09,
		i:5.65/180*Math.PI
	});
	mars.rotation.x = (90-25)/180*Math.PI;
	mars.aV = 1.12e-5;
	
	var jupiter = new Game.Object(1.89e27,71492000,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/jupiter.jpg')
	}),{
		parent:sun,
		a:Game.AU*5.5,
		e:0.05,
		i:6.09/180*Math.PI
	});
	jupiter.rotation.x = (90-3.13)/180*Math.PI;
	jupiter.aV = 2.79e-5;
	
	Game.focus = sun.sphere.position;
};
// LOGIC
Game.draw=function(){
	Game.Camera.lookAt(Game.focus);
	Game.Control.goto(Game.focus);
	Game.Control.update();
	
	Game.Renderer.render(Game.Scene, Game.Camera);
	
	Game.drawT++;
	requestAnimationFrame(Game.draw);
};
Game.logic=function(){
	Game.deltaT=(Date.now()-Game.lastUpdated)/Game.fps;
	for(var i in Game.Objects){
		Game.Objects[i].update();
	}
	
	if(Game.doIntersect) {
		Game.Raycaster.setFromCamera(Game.Mouse, Game.Camera);
		Game.Intersects = Game.Raycaster.intersectObjects(Game.Scene.children);
	}
	
	Game.lastUpdated=Date.now();
	
	Game.T++;
	setTimeout(Game.logic,1/Game.fps);
};
// OBJECTS
Game.Objects=[];
Game.ObjectsById = {};
Game.ObjectsN=0;
Game.Object=function(m,r,material,orbit){
	this.id = Game.ObjectsN++;
	// ORBITS
	this.m = m;
	this.r = r;
	if(orbit){
		this.parent = orbit.parent;
		this.parent.child.push(this);
		this.orbit = new Game.Orbit(orbit);
	}
	this.child = [];
	this.P = new THREE.Vector3(0,0,0); // position
	this.V = new THREE.Vector3(0,0,0); // velocity

	this.rotation = new THREE.Euler();
	this.aV = 0; // angular velocity
	
	// METHODS
	this.remove=function(){
		delete Game.Objects[this.id];
	}
	
	this.update=function(){
		if(this.parent){
			this.orbit.update();
			this.P.copy(this.orbit.P);
			this.V.copy(this.orbit.V);
		}
		this.rotation.y += this.aV * Game.deltaT*Game.timeScale;
		this.sphere.position.copy(this.P).divideScalar(Game.scale);
		this.sphere.rotation.copy(this.rotation);
	}
	
	// PROPERTIES
	Object.defineProperties(this, {
		// PHYSICAL CHARACTERISTICS
		d: function(){ // density
			return this.mass / (this.r*this.r*this.r);
		},
		c: function(){ // circumference
			return this.r*this.r;
		},
		a: function(){ // surface area
			return 4*Math.PI*this.r*this.r;
		},
		v: function(){ // volume
			return (4/3)*Math.PI*this.r*this.r*this.r;
		},
		g: function(){ // surface gravity
			return (Game.G*this.m)/(this.r*this.r);
		}
	});
	
	// DRAW
	var geometry = new THREE.SphereGeometry(Math.log(this.r)/Math.log(Game.EarthRadius),64,64);
	if(!material) var material = new THREE.MeshBasicMaterial();
	
	this.sphere = new THREE.Mesh(geometry, material);
	Game.Scene.add(this.sphere);
	
	// TODO: orbits
	this.drawEllipse = function(){
		if(!this.orbit || this.ellipse) return false;
		var geometry = new THREE.Geometry();
		var orbit = this.orbit.clone();
		var incr = orbit.T / 360;
		for(var i = 0; i < 361; i++){ // TODO: fix for 360 gap
			geometry.vertices.push(orbit.update(i*incr).P.clone().divideScalar(Game.scale));
		}
		var material = new THREE.LineBasicMaterial({ color: 0xffffff });
		this.ellipse = new THREE.Line( geometry, material );
		Game.Scene.add(this.ellipse);
	}
	this.drawEllipse();
	
	// ADD TO ARRAY
	Game.Objects.push(this);
	Game.ObjectsById[this.sphere.id] = this;
	Game.ObjectsN++;
	return this;
}

// KEPLER ORBITAL ELEMENTS
Game.Orbit = function(options){
	// https://downloads.rene-schwarz.com/download/M001-Keplerian_Orbit_Elements_to_Cartesian_State_Vectors.pdf
	this.a = options.a || 0; // semi major axis
	this.e = options.e || 0; // eccentricity
	this.i = options.i || 0; // inclination
	this.o = 0; // Longitude of the ascending node
	this.w = 0; // argument of periapsis
	this.v = 0; // true anomaly
	this.M = 0; // mean anomaly
	this.E = 0; // eccentric anomaly
	this.P = new THREE.Vector3(); // position
	this.V = new THREE.Vector3(); // velocity
	this.Vs = 0; // speed scalar
	this.m = options.m || 0; // mass
	this.mp = options.parent.m || 0; // parent mass
	this.d = 0; // distnce from
	this.options = options;
};

Game.Orbit.prototype = {
	clone: function(){
		return new Game.Orbit(this.options);
	},
	update: function(t){
		if (t) this.M = t*Math.sqrt((Game.G*this.mp)/(this.a*this.a*this.a));
		else this.M += Game.deltaT*Game.timeScale*Math.sqrt((Game.G*this.mp)/(this.a*this.a*this.a));
		
		var target = this.e>0.8 ? Math.PI : this.M, prev;
		var error = target - this.e*Math.sin(target) - this.M;
		var maxError = 10e-15;
		var maxItr = 150;
		for(var i = 0; i < maxItr; i++){
			prev = target;
			target = prev - error/(1-this.e*Math.cos(prev));
			error = target - this.e*Math.sin(target) - this.M;
			if (Math.abs(error) < maxError) break;
		}
		this.E = target;
		
		this.v = 2*Math.atan2(Math.sqrt(1+this.e)*Math.sin(this.E/2),Math.sqrt(1+this.e)*Math.cos(this.E/2));
		
		this.d = this.a * (1-this.e*Math.cos(this.E));
		
		var op = new THREE.Vector3(Math.cos(this.v), Math.sin(this.v), 0);
		op.multiplyScalar(this.d);
		this.P.copy(this.toInertialFrame(op));
		
		var ov = new THREE.Vector3(-Math.sin(this.E), Math.sqrt(1-this.e*this.e)*Math.cos(this.E), 0);
		ov.multiplyScalar(Math.sqrt(Game.G*this.mp*this.a)/this.d);
		this.V.copy(this.toInertialFrame(ov));
		
		// vis viva
		this.Vs = Game.G * this.mp * (2/this.d - 1/this.a);
		
		return this;
	},
	toInertialFrame:function(op){
		var v = new THREE.Vector3();
		v.x = op.x*(Math.cos(this.w)*Math.cos(this.o) - Math.sin(this.w)*Math.cos(this.i)*Math.sin(this.o)) - op.y*(Math.sin(this.w)*Math.cos(this.o) + Math.cos(this.w)*Math.cos(this.i)*Math.sin(this.o))
		v.y = op.x*(Math.cos(this.w)*Math.sin(this.o) + Math.sin(this.w)*Math.cos(this.i)*Math.cos(this.o)) + op.y*(Math.cos(this.w)*Math.cos(this.i)*Math.cos(this.o) + Math.sin(this.w)*Math.sin(this.o))
		v.z = op.x*(Math.sin(this.w)*Math.sin(this.i)) + op.y*(Math.cos(this.w)*Math.sin(this.i))
		return v;
	},
	
	// GETTERS
	// semi minor axis
	get b(){
		return this.a * Math.sqrt(1-this.e*this.e);
	},
	// orbital period
	get T(){
		return 2*Math.PI*Math.sqrt((this.a*this.a*this.a)/(Game.G*this.mp));
	}
};
// OBJECT SELECTOR
Game.select = function(sphere){
	Game.focus = sphere.position;
	Game.Control.target.copy(Game.focus);
	Game.doIntersect = true;
	Game.Control.reset();
};
Game.init();