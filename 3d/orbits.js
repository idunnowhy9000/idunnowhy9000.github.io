(function(Game, THREE){

var G = 6e-11;
var Orbit = function(m){
	this.a = 0; // semi major axis
	this.e = 0; // eccentricity
	this.i = 0; // inclination
	this.o = 0; // Longitude of the ascending node
	this.w = 0; // argument of periapsis
	this.v = 0; // true anomaly
	this.M = 0; // mean anomaly
	this.E = 0; // eccentric anomaly
	this.P = new THREE.Vector3(); // position
	this.V = new THREE.Vector3(); // velocity
	this.m = m; // mass
	this.d = 0; // distnce from
};

Orbit.prototype = {
	update: function(t){
		var n = Math.sqrt((G*this.m)/(this.a*this.a*this.a));
		this.M = n*t;
		
		var maxError = 10e-13;
		var target = this.e>0.8 ? Math.PI : this.M, prev;
		var error = target - this.e*Math.sin(target) - this.M;
		var itr = 0, maxItr = 150;
		while(Math.abs(error) < maxError || itr++ < maxItr){
			prev = target;
			target = prev - error/(1-this.e*Math.cos(prev));
			error = target - this.e*Math.sin(target) - this.M;
		}
		this.E = target;
		
		this.v = 2*Math.atan2(1+this.e*Math.sin(this.E/2),1-this.e*Math.cos(this.E/2));
		
		this.d = this.a * (1-this.e*Math.cos(this.E));
		
		var op = new THREE.Vector3(Math.cos(this.v), Math.sin(this.v), 0);
		op.multiplyScalar(this.d);
		this.P.x = op.x*(Math.cos(this.w)*Math.cos(this.o) - Math.sin(this.w)*Math.cos(this.i)*Math.sin(this.o)) - op.y*(Math.sin(this.w)*Math.cos(this.o) + Math.cos(this.w)*Math.cos(this.i)*Math.sin(this.o))
		this.P.y = op.x*(Math.cos(this.w)*Math.sin(this.o) + Math.sin(this.w)*Math.cos(this.i)*Math.cos(this.o)) + op.y*(Math.cos(this.w)*Math.cos(this.i)*Math.cos(this.o) + Math.sin(this.w)*Math.sin(this.o))
		this.P.z = op.x*(Math.sin(this.w)*Math.sin(this.i)) + op.y*(Math.cos(this.w)*Math.sin(this.i))
		
		var ov = new THREE.Vector3(-Math.sin(this.E), Math.sqrt(1-this.e*this.e)*Math.cos(this.E), 0);
		ov.multiplyScalar(Math.sqrt(G*this.m)/this.d);
		this.P.x = ov.x*(Math.cos(this.w)*Math.cos(this.o) - Math.sin(this.w)*Math.cos(this.i)*Math.sin(this.o)) - ov.y*(Math.sin(this.w)*Math.cos(this.o) + Math.cos(this.w)*Math.cos(this.i)*Math.sin(this.o))
		this.P.y = ov.x*(Math.cos(this.w)*Math.sin(this.o) + Math.sin(this.w)*Math.cos(this.i)*Math.cos(this.o)) + ov.y*(Math.cos(this.w)*Math.cos(this.i)*Math.cos(this.o) + Math.sin(this.w)*Math.sin(this.o))
		this.P.z = ov.x*(Math.sin(this.w)*Math.sin(this.i)) + ov.y*(Math.cos(this.w)*Math.sin(this.i))
	}
};

Game.Orbit = Orbit;

})(window.Game || window.Game = {}, window.THREE);