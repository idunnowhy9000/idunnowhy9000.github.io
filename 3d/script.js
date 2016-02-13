(function(){

// UTILS
function getRandomInt(min, max) {return Math.floor(Math.random() * (max - min)) + min;}
function $(id){return document.getElementById(id);}
function _(el,text,attr){
	el = document.createElement(el);
	if(text) el.textContent = text;
	if(attr){for(var i in attr) el.setAttribute(i, attr[i]);}
	return el;
}
function clearEl(el){
	while (el.firstChild) {
		el.removeChild(el.firstChild);
	}
}

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
	Game.G = 6e-11;
	Game.StefBoltz = 5.67e-8;
	Game.AU = 149597870700;
	
	Game.SolarMass = 1.988e30;
	Game.EarthMass = 5.97219e24;
	Game.JupiterMass = 1.898e27;
	
	Game.SolarRadius = 695000000;
	Game.EarthRadius = 6.371e6;
	
	Game.SolarLuminosity = 3.82e26;
	
	Game.SolarLifetime = 1e11 * 3.154e+7;
	
	// to: n * convert[type][unit]
	// from: n / convert[type][unit]
	// if type == temp -> subtract x from n
	Game.convert = {
		mass:{
			'kg': 1,
			'solar mass': 1/Game.SolarMass,
			'earth mass': 1/Game.EarthMass,
		},
		density:{
			'kg/m3': 1,
			'g/cm3': 0.001,
		},
		distance:{
			'm': 1,
			'km': 0.001,
			'AU': 1/Game.AU,
			'solar radius': 1/Game.SolarRadius,
			'earth radius': 1/Game.EarthRadius,
		},
		area:{
			'm2': 1,
			'km2': 1e-6
		},
		volume:{
			'm3': 1,
			'km3': 1e-9
		},
		acceleration:{
			'm/s2': 1,
			'km/h2': 12960
		},
		time:{
			'sec': 1,
			'minutes': 1/60,
			'hour': 1/1200,
			'days': 1/86400,
			'month': 1/2.628e6,
			'year': 1/3.154e+7,
			'Gy': 1/3.1556926e16
		},
		power:{
			'W': 1,
			'solar luminosity': 1/Game.SolarLuminosity
		},
		temp:{
			'K': 1,
			'C': -273.15,
			'F': -255.37
		}
	};
	
	// settings
	Game.scale = Game.AU/100;
	Game.timeScale = 60;
	Game.showLabels = true;
	
	// DOM
	Game.$props = $('props');
	Game.$table = $('info');
	Game.$name = $('name');
	Game.$close = $('close');
	Game.$close.addEventListener('click', Game.unselect);
	
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
		Game.LabelRenderer.setSize( window.innerWidth, window.innerHeight );
	});
	
	Game.Renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
	Game.Renderer.setSize( window.innerWidth, window.innerHeight );
	$('wrapper').appendChild( Game.Renderer.domElement );
	
	// controls
	Game.Control = new THREE.OrbitControls(Game.Camera, Game.Renderer.domElement);
	Game.Control.enableDamping = true;
	Game.Control.dampingFactor = 0.5;
	
	// tooltip
	Game.LabelRenderer = new THREE.CSS2DRenderer();
	Game.LabelRenderer.setSize( window.innerWidth, window.innerHeight );
	Game.LabelRenderer.domElement.id = 'tooltip';
	$('wrapper').appendChild(Game.LabelRenderer.domElement);
	
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
			Game.focusOn(Game.Intersects[0].object);
		}
	}
	function onclick(event){
		if(Game.Intersects[0] && Game.Intersects[0].object && Game.doIntersect) {
			Game.doIntersect = false;
			Game.select(Game.Intersects[0].object);
		}
	}
	
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
	var sun = new Game.Object('Sun', Game.SolarMass,Game.SolarRadius,new THREE.MeshBasicMaterial({
		map: Game.Loader.load('img/sun.jpg')
	}));
	sun.rotation.x = 67.23/180*Math.PI;
	sun.aV = 4.6e-7;
	// TODO: directly implement this to Game.Object
	var sunlight = new THREE.PointLight(0xffffff, 1, 0, 100);
	sunlight.position.set(0,0,0);
	Game.Scene.add(sunlight);
	
	var mercury = new Game.Object('Mercury', 3.3e23,2440000,new THREE.MeshPhongMaterial({
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
	mercury.set('albedo', 0.06);
	
	var venus = new Game.Object('Venus', 4.8e24,6052000,new THREE.MeshPhongMaterial({
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
	venus.doAtmosphere = true;
	venus.atmosphere.color = [255, 165, 0];
	venus.set('albedo', 0.9);
	venus.set('temperatureAdjustment', 553);
	
	var earth = new Game.Object('Earth', Game.EarthMass,Game.EarthRadius,new THREE.MeshPhongMaterial({
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
	earth.rotation.x = (90-23.5)/180*Math.PI;
	earth.aV = 7.29e-5; // http://hpiers.obspm.fr/eop-pc/models/constants.html
	earth.doAtmosphere = true;
	earth.atmosphere.color = [135, 206, 225];
	earth.set('albedo', 0.3);
	earth.set('temperatureAdjustment', 33);
	
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
	
	var mars = new Game.Object('Mars', 6.41e23,3397000,new THREE.MeshPhongMaterial({
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
	mars.doAtmosphere = true;
	mars.atmosphere.color = [200, 148, 64];
	mars.set('albedo', 0.17);
	//mars.set('', )
	
	var jupiter = new Game.Object('Jupiter', 1.89e27,71492000,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/jupiter.jpg')
	}),{
		parent:sun,
		a:Game.AU*5.5,
		e:0.05,
		i:6.09/180*Math.PI
	});
	jupiter.rotation.x = (90-3.13)/180*Math.PI;
	jupiter.aV = 2.79e-5;
	
	var saturn = new Game.Object('Saturn', 5.68e26,60268000,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/saturn.jpg')
	}),{
		parent:sun,
		a:Game.AU*9.53,
		e:0.054,
		i:5.51/180*Math.PI
	});
	saturn.rotation.x = (90-3.13)/180*Math.PI;
	saturn.aV = 2.606e-5;
	
	var uranus /* (insert joke here) */ = new Game.Object('Uranus', 8.68e25,25559000,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/uranus.jpg')
	}),{
		parent:sun,
		a:Game.AU*19.218,
		e:0.046,
		i:6.48/180*Math.PI
	});
	uranus.rotation.x = (90-97.7)/180*Math.PI;
	uranus.aV = 1.6112e-5;
	
	var neptune = new Game.Object('Neptune', 5.68e26,60268000,new THREE.MeshPhongMaterial({
		map: Game.Loader.load('img/neptune.jpg')
	}),{
		parent:sun,
		a:Game.AU*30.1103,
		e:0.009,
		i:6.43/180*Math.PI
	});
	neptune.rotation.x = (90-28.32)/180*Math.PI;
	neptune.aV = 1.724e-5;
	
	Game.focus = sun.sphere.position;
};
// LOGIC
Game.draw=function(){
	Game.refreshSelection();
	
	Game.Camera.lookAt(Game.focus);
	Game.Control.goto(Game.focus);
	Game.Control.update();
	
	Game.Renderer.render(Game.Scene, Game.Camera);
	if(Game.showLabels) Game.LabelRenderer.render(Game.Scene, Game.Camera);
	
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
		Game.Intersects = Game.Raycaster.intersectObjects(Game.Scene.children, true);
	}
	
	Game.T++;
	Game.lastUpdated=Date.now();
	Game.t = Game.T / Game.timeScale;
	setTimeout(Game.logic,1/Game.fps);
};
// OBJECTS
Game.Objects=[];
Game.ObjectsN=0;
Game.Object=function(name,m,r,material,orbit){
	this.id = Game.ObjectsN++;
	this.name = name;
	
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
		
		// properties
		this.recalc('temperature');
		
		// display
		this.sphere.position.copy(this.P).divideScalar(Game.scale);
		this.sphere.rotation.copy(this.rotation);
		if(this.doAtmosphere) this.atmosphere.update();
		if(Game.showLabels) this.label.position.copy(this.sphere.position);
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
	var self = this;
	this.cache = {};
	this.changed = true;
	this._cache = function(prop) {
		if(this.cache[prop]) return this.cache[prop];
		if(this.props[prop].get) return this.cache[prop] = this.props[prop].get();
		return this.cache[prop] = this.props[prop].value;
	}
	
	this.recalc = function(prop){
		delete this.cache[prop];
		return this._cache(prop);
	}
	
	this.props = {
		// PHYSICAL CHARACTERISTICS
		mass: {
			set: function(m){
				return self.m = m;
			},
			get: function(){
				return self.m;
			},
			value: self.m,
			type: 'mass'
		},
		radius: {
			set: function(r){
				return self.r = r;
			},
			get: function(){
				return self.r;
			},
			value: self.r,
			type: 'distance'
		},
		density: {
			get: function(){
				return self.m / self.get('volume');
			},
			type: 'density'
		},
		circumference: {
			get: function(){
				return self.r*2;
			},
			type: 'distance'
		},
		surfaceArea: {
			get: function(){
				return 4*Math.PI*self.r*self.r;
			},
			type: 'area'
		},
		volume: {
			get: function(){
				return (4/3)*Math.PI*self.r*self.r*self.r;
			},
			type: 'volume'
		},
		gravity: {
			get: function(){
				return (Game.G*self.m)/(self.r*self.r);
			},
			type: 'acceleration'
		},
		rotperiod: {
			get: function(){
				return 2*Math.PI/self.aV;
			},
			type: 'time'
		},
		type: {
			get: function(){
				var sm = self.m / Game.SolarMass;
				if(sm > .08) return 1;
				return 0;
			}
		},
		// STELLAR CHARACTERISTICS
		r: {
			get: function(){
				var sm = self.m / Game.SolarMass;
				if(sm > .08 && sm < 20) return Math.pow(self.m, 0.8) * Game.SolarRadius;
				return r;
			},
			type: 'distance',
			hide: true
		},
		luminosity: {
			get: function(){
				var sm = self.m / Game.SolarMass, l;
				if(sm < .43) l = .23 * Math.pow(sm, 2.3);
				else if(sm < 2) l = Math.pow(sm, 4);
				else if(sm < 20) l = 1.5 * Math.pow(sm, 3.5);
				else l = 3200 * sm;
				return l * Game.SolarLuminosity;
			},
			type: 'power'
		},
		lifetime: {
			get: function(){
				return (self.get('luminosity') / Game.SolarLuminosity) * Math.pow(self.m / Game.SolarMass, 3.5) * Game.SolarLifetime;
			},
			type: 'time'
		},
		// PLANETARY CHARACTERISTICS
		parentStar: {
			get: function(){
				var min = Infinity, obj;
				for(var i = 0; i < Game.Objects.length; i++) {
					var me = Game.Objects[i];
					if(me.id === self.id || me.get('type') !== 1) continue;
					if(self.P.distanceTo(me.P) < min) {
						obj = me;
						min = self.P.distanceTo(me.P)
					}
				}
				return obj;
			},
			hide: true
		},
		albedo: {
			value: 0,
			type: 'slider'
		},
		temperatureAdjustment: {
			value: 0,
			type: 'temp'
		},
		// GENERAL
		temperature: {
			get: function(){
				if (self.get('type') === 1) { // stars
					return Math.pow(self.get('luminosity') / (self.get('surfaceArea') * Game.StefBoltz), 1/4);
				} else { // planets
					//console.log(self.parentStar);
					var parent = self.get('parentStar');
					var d = parent.P.distanceTo(self.P);
					return Math.pow(((parent.get('luminosity') * (1 - self.get('albedo'))) / (16 * Math.PI * Game.StefBoltz * d*d)), 1/4) + self.get('temperatureAdjustment');
				}
			},
			type: 'temp'
		},
	};
	
	this.get = function(prop) {
		return this._cache(prop);
	};
	
	this.set = function(prop, val) {
		if(this.props[prop].set) val = this.props[prop].set(val);
		this.props[prop].value = val;
		if(this.cache[prop]) this.cache[prop].value = val;
		return val;
	};
	
	// DRAW
	var geometry = new THREE.SphereGeometry(this.drawR,64,64);
	if(!material) var material = new THREE.MeshBasicMaterial();
	
	this.sphere = new THREE.Mesh(geometry, material);
	this.sphere.userData.id = this.id;
	Game.Scene.add(this.sphere);
	
	// DRAW HALO
	this.doAtmosphere = false;
	this.atmosphere = new Game.HaloObject(this);
	
	// DRAW CLOUDS
	this.doClouds = false;
	var geometry = new THREE.SphereGeometry(this.drawR,64,64);
	if(!material) var material = new THREE.MeshBasicMaterial();
	
	this.cloud = new THREE.Mesh(geometry, material);
	Game.Scene.add(this.cloud);
	
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
	
	// DRAW TOOLTIP
	var el = _('div', this.name);
	el.addEventListener('click', function(){ Game.focusOn(self.sphere); });
	this.label = new THREE.CSS2DObject(el);
	Game.Scene.add(this.label);
	
	// ADD TO ARRAY
	Game.Objects.push(this);
	return this;
};
// HALO OBJECTS
Game.HaloObject = function(parent){
	this.parent = parent;
	this.color = [135, 206, 225];
	
	// DRAW
	var shader = THREE.HaloShader;
	var uniforms = THREE.UniformsUtils.merge(
		[THREE.UniformsLib['lights'],
		{
			"uColor": { type: "v4", value: new THREE.Vector4() },
			"intensity": { type: "f", value: 0.5 }
		}]);
	var geometry = new THREE.SphereGeometry(this.parent.drawR,64,64);
	var material = new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader,
		side: THREE.BackSide,
		transparent: true,
		depthWrite: false,
		lights: true
	});
	
	this.sphere = new THREE.Mesh(geometry, material);
	this.sphere.userData.id = this.parent.id;
	this.sphere.scale.multiplyScalar(1.05);
	this.sphere.flipSided = true;
	this.sphere.visible = parent.visible;
	Game.Scene.add(this.sphere);
	
	this.changed = true;
	this.update = function(){
		//console.log(this.sphere.position);
		this.sphere.position.copy(this.parent.sphere.position);
		this.sphere.rotation.copy(this.parent.rotation);
		if(this.changed) {
			this.sphere.visible = parent.visible;
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
		'varying vec3 vPos;',
		//'varying float intensity;',
		
		'void main() ',
		'{',
			'vPos = (modelMatrix * vec4(position, 1.0 )).xyz;',
			'vNormal = normalize( normalMatrix * normal );',
			'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}',
	].join("\n"),

	fragmentShader: [
		'uniform vec4 uColor;',
		'varying vec3 vPos;',
		'varying vec3 vNormal;',
		'uniform float intensity;',
		
		'uniform vec3 pointLightColor[MAX_POINT_LIGHTS];',
		'uniform vec3 pointLightPosition[MAX_POINT_LIGHTS];',
		'uniform float pointLightDistance[MAX_POINT_LIGHTS];',

		'void main() {',
			'vec4 addedLights = vec4(0.0,0.0,0.0, 1.0);',
			'for(int l = 0; l < MAX_POINT_LIGHTS; l++) {',
				'vec3 lightDirection = normalize(vPos - pointLightPosition[l]);',
				'addedLights.rgb += clamp(dot(-lightDirection, vNormal), 0.0, 1.0) * pointLightColor[l] ;',
			'}',
			'gl_FragColor = mix(uColor, addedLights, addedLights) * intensity;',
			//'gl_FragColor = mix(uColor, vec4(1.0,1.0,1.0,1.0), (gl_FragCoord.xy / resolution.y));',
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
// COVNERSION (base unit -> unit)
Game.convertTo = function(n, type, unit) {
	if(!Game.convert[type] || !(unit in Game.convert[type])) return n;
	if(type === 'temp' && unit !== 'K') return n + Game.convert[type][unit];
	return n * Game.convert[type][unit];
};
Game.convertFrom = function(n, type, unit) {
	if(!Game.convert[type] || !(unit in Game.convert[type])) return n;
	if(type === 'temp' && unit !== 'K') return n + Game.convert[type][unit];
	return n / Game.convert[type][unit];
};
// OBJECT SELECTOR
Game.select = function(sphere){
	Game.doIntersect = true;
	if(!Game.Objects[sphere.userData.id]) return;
	Game.selection = Game.Objects[sphere.userData.id];
	
	// DISPLAY PROPS
	$('name').textContent = Game.selection.name;
	clearEl(Game.$table);
	for(var i in Game.selection.props) {
		var prop = Game.selection.props[i];
		var val = Game.selection.get(i);
		if(val === undefined || prop.hide) continue;

		var el = _('tr');
		el.appendChild(_('td', i));
		var td = _('td');
		td.appendChild(Game.drawUnit(i, val, prop.type));
		el.appendChild(td);
		
		Game.$table.appendChild(el);
	}
	Game.$props.style.display = 'block';
};
Game.unselect = function(){
	Game.$props.style.display = 'none';
};
Game.drawUnit = function(id, val, type){
	var div = _('div');
	var input = _('input', null, {
		type: 'number',
		value: val,
		id: ('select-' + id),
		'data-type': type
	});
	div.appendChild(input);
	
	if(type && type !== 'slider') {
		var select = _('select', null, { id: 'select-selector' });
		for(var i in Game.convert[type]) {
			var option = _('option', i, { value: i });
			select.appendChild(option);
		}
		select.addEventListener('change', function(){
			var selected = select.options[select.selectedIndex];
			input.setAttribute('value', Game.convertTo(val, type, selected.value));
			input.setAttribute('data-unit', selected.value);
		});
		div.appendChild(select);
	}
	return div;
};
Game.refreshSelection = function(){
	if(!Game.selection) return;
	for(var i in Game.selection.props) {
		var prop = Game.selection.props[i];
		var val = Game.selection.get(i);
		if(val === undefined || prop.hide || prop.value !== undefined) continue;
		if(prop.type && prop.type !== 'slider') {
			var el = $('select-' + i), select = $('select-selector'),
			selected = select.options[select.selectedIndex];
			el.setAttribute('value', Game.convertTo(val, el.dataset.type, el.dataset.unit));
		}
	}
};
// FOCUS ON OBJECT
Game.focusOn = function(sphere){
	Game.doIntersect = true;
	Game.focus = sphere.position;
	Game.Control.target.copy(Game.focus);
	Game.Control.redolly();
};

Game.init();
window.Game = Game;

})();