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
	
	Game.t=0;
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
	Game.timeScale = 60;
	
	// scene+camera
	Game.Scene = new THREE.Scene();
	Game.Camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000);
	Game.Camera.position.x = 1.7;
	Game.Camera.position.y = -33.3;
	Game.Camera.position.z = -86.8;
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
	Game.Control.dampingFactor = 0.5;
	
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
	// NOTE: obliquity is relative to sun's orbital plane, use (deg-90)/180*Math.PI
	var sun = new Game.Object(1.9e30,695000000,new THREE.MeshBasicMaterial({
		map: Game.Loader.load('img/sun.jpg')
	}), false);
	sun.rotation.x = 7.25/180*Math.PI;
	sun.aV = 4.6e-7;
	sun.doAtmosphere = true;
	sun.atmosphere.color = [253, 184, 19];
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
	mercury.rotation.x = (2.11-90)/180*Math.PI;
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
	venus.rotation.x = (177-90)/180*Math.PI;
	venus.aV = 4.76e-8;
	venus.doAtmosphere = true;
	venus.atmosphere.color = [255, 165, 0];
	
	var earth = new Game.Object(5.9e24,Game.EarthRadius,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/earth.jpg'),
		bumpMap: Game.Loader.load('img/earth-height.jpg'),
		bumpScale: 0.02,
		specularMap: Game.Loader.load('img/earth-specular.jpg'),
		specular: new THREE.Color('grey'),
		shininess: 5
	}),{
		parent: sun,
		a: Game.AU*1,
		e: 0.02,
		i: 7.15/180*Math.PI
	});
	earth.rotation.x = (23.5-90)/180*Math.PI;
	earth.aV = 7.29e-5; // http://hpiers.obspm.fr/eop-pc/models/constants.html
	earth.doAtmosphere = true;
	earth.atmosphere.color = [135, 206, 225];
	
	/*
	var moon = new Game.Object(0.073e24,1738100,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/moon.jpg')
	}),{
		parent: earth,
		a: 3.844e8,
		e: 0.0554,
		i: 5.14/180*Math.PI
	});
	Game.scale = Game.AU/50000;
	*/
	
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
	mars.rotation.x = (25-90)/180*Math.PI;
	mars.aV = 1.12e-5;
	mars.doAtmosphere = true;
	mars.atmosphere.color = [200, 148, 64];
	
	var jupiter = new Game.Object(1.89e27,71492000,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/jupiter.jpg')
	}),{
		parent:sun,
		a:Game.AU*5.5,
		e:0.05,
		i:6.09/180*Math.PI
	});
	jupiter.rotation.x = (3.13-90)/180*Math.PI;
	jupiter.aV = 2.79e-5;
	
	var jupiter = new Game.Object(1.89e27,71492000,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/jupiter.jpg')
	}),{
		parent:sun,
		a:Game.AU*5.5,
		e:0.05,
		i:6.09/180*Math.PI
	});
	jupiter.rotation.x = (3.13-90)/180*Math.PI;
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
	Game.deltaT=((Date.now()-Game.lastUpdated)/Game.fps)*Game.timeScale;
	
	Game.calcGForces();
	for(var i = 0; i < Game.Objects.length; i++){
		Game.Objects[i].update();
	}
	
	if(Game.doIntersect) {
		Game.Raycaster.setFromCamera(Game.Mouse, Game.Camera);
		Game.Intersects = Game.Raycaster.intersectObjects(Game.Scene.children);
	}
	
	Game.T++;
	Game.lastUpdated=Date.now();
	Game.t = Game.T / Game.timeScale;
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
	this.drawR = Math.log(this.r)/Math.log(Game.EarthRadius);
	this.child = [];
	this.P = new THREE.Vector3(0,0,0); // position
	this.V = new THREE.Vector3(0,0,0); // velocity
	this.force = new THREE.Vector3(0,0,0); // velocity
	
	if(orbit){
		this.parent = orbit.parent;
		this.parent.child.push(this);
		this.orbit = new Game.Orbit(orbit);
		
		this.orbit.update();
		this.P.copy(this.orbit.P);
		this.V.copy(this.orbit.V);
	} else {
		this.moveable = !!orbit;
	}

	this.rotation = new THREE.Euler();
	this.aV = 0; // angular velocity
	
	// METHODS
	this.remove=function(){
		delete Game.Objects[this.id];
	}
	
	this.update=function(){
		if(this.orbit){
			this.orbit.update();
			//this.P.copy(this.orbit.P);
		}
		this.doForces();
		
		// rotation
		this.rotation.y += this.aV * Game.deltaT;
		
		// display
		this.sphere.position.copy(this.P).divideScalar(Game.scale);
		this.sphere.rotation.copy(this.rotation);
		if(this.doAtmosphere) this.atmosphere.update();
	}
	
	// GRAVITY
	var beginPos = new THREE.Vector3();
	this.doForces = function(){
		if(!this.orbit) return false;
		if(this.prevP){
			beginPos.copy(this.P);
			this.force.divideScalar(this.m);
			this.force.multiplyScalar(Game.deltaT);
			var vel = this.orbit.P.clone().sub(this.prevP);
			this.P.add(vel);
			this.P.add(this.force);
			this.prevP.copy(this.P);
		} else {
			this.prevP = this.P.clone();
			this.force.divideScalar(this.m);
			this.force.multiplyScalar(Game.deltaT);
			this.V.add(this.force);
			var vel = this.orbit.V;
			//vel.multiplyScalar(Game.deltaT);
			this.P.add(vel);
		}
		this.force.x = this.force.y = this.force.z = 0;
	};
	
	// PROPERTIES
	Object.defineProperties(this, {
		// PHYSICAL CHARACTERISTICS
		d: {
			get: function(){ // density
				return this.m / (this.r*this.r*this.r);
			}
		},
		c: {
			get: function(){ // circumference
				return this.r*2;
			},
		},
		a: {
			get: function(){ // surface area
				return 4*Math.PI*this.r*this.r;
			},
		},
		v: {
			get: function(){ // volume
				return (4/3)*Math.PI*this.r*this.r*this.r;
			},
		},
		g: {
			get: function(){ // surface gravity
				return (Game.G*this.m)/(this.r*this.r);
			},
		},
		rot: {
			get: function(){ // rotational period
				return 2*Math.PI/this.aV;
			}
		}
	});
	
	// DRAW
	var geometry = new THREE.SphereGeometry(this.drawR,64,64);
	if(!material) var material = new THREE.MeshBasicMaterial();
	
	this.sphere = new THREE.Mesh(geometry, material);
	Game.Scene.add(this.sphere);
	
	// DRAW HALO
	this.doAtmosphere = false;
	this.atmosphere = new Game.HaloObject(this);
	
	// DRAW ORBITS
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
		if(this.parent) this.ellipse.position.add(this.parent.P).divideScalar(Game.scale);
		Game.Scene.add(this.ellipse);
	}
	this.drawEllipse();
	
	// ADD TO ARRAY
	Game.Objects.push(this);
	Game.ObjectsById[this.sphere.id] = this;
	Game.ObjectsN++;
	return this;
};
// HALO OBJECTS
Game.HaloObject = function(parent){
	this.parent = parent;
	this.color = [135, 206, 225];
	
	// DRAW
	var shader = THREE.HaloShader;
	var uniforms = 
		{
			"uColor": { type: "v4", value: new THREE.Vector4() },
			"c": { type: "f", value: 0.5 },
			"p": { type: "f", value: 1.5 }
		};
	var geometry = new THREE.SphereGeometry(this.parent.drawR,64,64);
	var material = new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader,
		side: THREE.DoubleSide,
		transparent: true
	});
	
	this.sphere = new THREE.Mesh(geometry, material);
	this.sphere.scale.multiplyScalar(1.05);
	this.sphere.flipSided = true;
	Game.Scene.add(this.sphere);
	
	this.changed = true;
	this.update = function(){
		//console.log(this.sphere.position);
		this.sphere.position.copy(this.parent.P).divideScalar(Game.scale);
		this.sphere.rotation.copy(this.parent.rotation);
		if(this.changed) {
			var color = new THREE.Vector4(this.color[0]/255, this.color[1]/255, this.color[2]/255, 1);
			uniforms['uColor'].value = color;
			this.changed = false;
		}
	};
	
	return this;
};
THREE.HaloShader = {

	vertexShader: [
		'varying vec3 vNormal;',
		
		'void main() ',
		'{',
			'vec3 vNormal = normalize( normalMatrix * normal );',
			'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}',
	].join("\n"),

	fragmentShader: [
		'uniform float c;',
		'uniform float p;',
		'uniform vec4 uColor;',
		'varying vec3 vNormal;',
		'void main() ',
		'{',
			'float intensity = pow( c - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), p );',
			'gl_FragColor = uColor * intensity;',
		'}',
	].join("\n")

};
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
	this.parent = options.parent;
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
		else this.M += Game.deltaT*Math.sqrt((Game.G*this.mp)/(this.a*this.a*this.a));
		
		var target = this.e>0.8 ? Math.PI : this.M, prev;
		var error = target - this.e*Math.sin(target) - this.M;
		var maxError = 10e-15;
		var maxItr = 15;
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
		this.P.copy(this.toBodycentric(op));
		this.P.add(this.parent.P);
		
		// vis viva
		this.Vs = Game.G * this.mp * (2/this.d - 1/this.a);
		
		return this;
	},
	toBodycentric:function(op){
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
// GRAVITY
Game.calcGForces = function(){
	//for(var i = 0; i < Game.Objects.length; i++) {Game.Objects[i].force.set(0,0,0);}
	for(var i = 0; i < Game.Objects.length; i++) {
		Game.Objects[i].force.x = Game.Objects[i].force.y = Game.Objects[i].force.z = 0;
		for(var j = 0; j < Game.Objects.length; j++) {
			if(i === j) continue;
			var vect = Game.calcGForce(Game.Objects[i], Game.Objects[j]);
			Game.Objects[j].force.sub(vect);
			Game.Objects[i].force.add(vect);
		}
	}
}
Game.calcGForce = function(body1, body2){
	var vect = new THREE.Vector3();
	vect.copy(body1.P).sub(body2.P);
	var len = vect.lengthSq();
	vect.normalize();
	vect.multiplyScalar((Game.G * body1.m * body2.m) / len);
	return vect;
}
// OBJECT SELECTOR
Game.select = function(sphere){
	Game.focus = sphere.position;
	Game.Control.target.copy(Game.focus);
	Game.doIntersect = true;
	Game.Control.redolly();
};
Game.init();