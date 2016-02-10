//(function(){
	
	/**********************************
	DRAW
	**********************************/
	function l(id){return document.getElementById(id)}
	//http://www.paulirish.com/2009/random-hex-color-code-snippets/
	function randColor(){return'#'+Math.floor(Math.random()*16777215).toString(16);}
	function rand(max){return Math.floor(Math.random() * max);}
	
	/**********************************
	DRAW
	**********************************/
	var Game={};
	Game.box=l('canvas');
	var ctx=Game.box.getContext('2d');
	Game.init=function(){
		Game.T=0;
		Game.fps=30;
		
		// events
		Game.windowW=window.innerWidth;
		Game.windowH=window.innerHeight;
		
		window.addEventListener('resize',function(){
			Game.windowW=window.innerWidth;
			Game.windowH=window.innerHeight;
		});
		
		Game.touchEvents=false;
		if('ontouchstart' in window && (navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0)) Game.touchEvents=true;
		
		Game.cursorX=0;
		Game.cursorY=0;
		Game.mouseDown=0;
		
		if(Game.touchEvents){
			window.addEventListener('touchmove',function(e){
				e.preventDefault();
				var touchobj=e.changedTouches[0];
				Game.cursorX=touchobj.pageX;
				Game.cursorY=touchobj.pageY;
			});
		} else{
			window.addEventListener('mousemove',function(e){
				e.preventDefault();
				Game.cursorX=e.pageX;
				Game.cursorY=e.pageY;
			});
		}
		window.addEventListener('mousedown',function(){Game.mouseDown=1;});
		window.addEventListener('mouseup',function(){Game.mouseDown=0;});
		
		// roads
		Game.generateRoads(4);
		
		// stats
		Game.started=Date.now();
		Game.state=0; // 0: playable, 1: lost, 2: paused
		Game.colorblind = 0;//colorblind mode for sexy beast
		
		// player
		Game.Player.calcSpawnRate();
		
		Game.start();
	}
	
	/**********************************
	START GAME
	**********************************/
	Game.start=function(){
		Game.state=2
		alert('Welcome to tt! (prototype)\n' +
			'How to play:\n'+
			'-Collect black dots for points\n' +
			'-Collect purple dots to slow time down (a bit)\n'+
			'-Avoid red dots as they add to your width, and blue dots as they subtract your width\n' +
			'-Black rows have double effects ie. black dots for 2 points and red dots for -15 width\n'+
			'-You lose if your width is zero or maximum');
		Game.state=0;
		Game.loop();
	}
	
	/**********************************
	LOSE GAME
	**********************************/
	Game.lost=function(){
		if(confirm('You have lost the game!\nScore: '+Game.Player.score+'\nPlay again?')){
			Game.state=0;
			Game.reset();
			Game.loop();
		}
	}
	
	/**********************************
	DRAW
	**********************************/
	Game.draw=function(){
		if(Game.state===1) return Game.lost();
		
		var box=Game.box;
		box.width=Game.windowW;
		box.height=Game.windowH;
		
		// roads
		for (var i in Game.Roads){
			var me=Game.Roads[i];
			me.draw();
		}
		
		// player
		Game.Player.draw();
		
		// score
		var score=Game.Player.score;
		ctx.strokeStyle = "#000";
		ctx.font = "bold 48px Arial";
		ctx.lineWidth = 6;
		ctx.strokeText(score,10,48)
		
		ctx.fillStyle='#fff';
		ctx.fillText(score,10,48)
		
	}
	
	/**********************************
	LOGIC
	**********************************/
	Game.logic=function(){
		// roads
		for (var i in Game.Roads){
			var me=Game.Roads[i];
			me.refresh();
		}
		Game.activeRoad.refresh();
		
		// player
		Game.Player.move(Game.cursorX);
		Game.Player.refresh();
		
		// lost
		if(Game.Player.width>=Game.windowW||Game.Player.width<=0||Game.Player.score<=-10) Game.state=1;
		
	}
	
	/**********************************
	LOOP
	**********************************/
	Game.loop=function(){
		Game.logic();
		Game.draw();
		if(Game.state!==0) return;
		
		Game.T++;
		setTimeout(Game.loop, 1000/Game.fps);
	}
	
	/**********************************
	ACTIVE ROAD
	**********************************/
	Game.activeRoad={
		cooldownTime:Game.fps,
		count:0,
		life:0,
		maxLife:0,
		current:-1,
		last:-1
	};
	Game.activeRoad.refresh=function(){
		if(this.life>0){
			this.life--;
			if(this.life<=0){
				this.maxLife=0;
				this.current=-1;
				this.cooldownTime=this.calcCooldownTime();
			}
		} else if(this.cooldownTime>=0){
			if(this.cooldownTime<=0) {
				this.life=this.maxLife=15*Game.fps;
				while(this.current===this.last) this.current=rand(Game.RoadsN);
				this.last=this.current;
			}
			else this.cooldownTime--;
		}else{
			this.count++;
			this.cooldownTime=this.calcCooldownTime();
		}
	}
	Game.activeRoad.calcCooldownTime=function(){
		return Math.floor(Game.fps*5*Math.pow(1.15,this.count));
	}
	
	/**********************************
	PLAYER
	**********************************/
	Game.Player={
		x:0,
		width:80,height:25,
		score:0,
		slowdown:1,slowdownTime:0,
		color:'green'
	}
	
	Game.Player.move=function(x){
		this.x=Math.min(x,Game.windowW-this.width);
		this.y=Game.windowH-this.height;
	}
	
	// draw
	Game.Player.draw=function(){
		ctx.fillStyle=this.color;
		ctx.fillRect(this.x,this.y,this.width,this.height);
	}
	
	// refresh
	Game.Player.refresh=function(){
		this.color='green';
		
		if(this.slowdown&&this.slowdownTime>0){
			this.color='purple';
			this.slowdownTime--;
			if(this.slowdownTime<=0) this.slowdown=1;
		}
		
		if(this.width<=10) this.color='blue';
		else if(this.width>Game.windowW*0.5) this.color='red';
	}
	
	// spawn rate
	Game.Player.particlesPerSec=100;
	Game.Player.particlesPerRoad=0;
	Game.Player.calcSpawnRate=function(){
		//Game.particlesPerSec = Game.Player.score<=0?1:Math.ceil(Math.pow(Game.Player.score, 1.15));
		Game.Player.particlesPerSec = 100;
		Game.Player.particlesPerRoad = Game.Player.particlesPerSec / Game.RoadsN;
	}
	
	/**********************************
	SCORE
	**********************************/
	Game.reset=function(){
		Game.Player.width=80;
		Game.Player.height=25;
		
		Game.Player.score=0;
		Game.Player.calcSpawnRate();
		
		Game.slowdown=1;
		Game.slowdownTime=0;	
		
		for(var i in Game.Roads){
			var me=Game.Roads[i];
			me.clearParticles();
		}
	}
	
	/**********************************
	BOXES
	**********************************/
	Game.Roads=[];
	Game.RoadsN=0;
	Game.Road=function(){
		this.id=Game.RoadsN++;
		
		this.x=0;
		this.y=0;
		
		this.width=0;
		this.height=0;
		
		this.color='#fff';
		this.active=false;
		
		// draw
		this.draw=function(){
			ctx.fillStyle=this.color;
			ctx.fillRect(this.x,this.y,this.width,this.height);
			
			for(var i in this.particles){
				var me=this.particles[i];
				if(this.active&&me.color==='black') ctx.fillStyle='#fff';
				else ctx.fillStyle=me.color;
				ctx.fillRect(me.x,me.y,me.width,me.height);
			}
		}
		
		this.refresh=function(){
			// dimensions + position
			this.width=Math.floor(Game.windowW/Game.RoadsN);
			this.height=Game.windowH;
			this.x=this.id*this.width;
			
			// active roads
			if(Game.activeRoad.current===this.id){
				this.active=true;
				this.color='rgba(0,0,0,'+(Game.activeRoad.life/Game.activeRoad.maxLife)+')';
			}
			else {
				this.active=false;
				this.color='#fff';
			}
			
			// particle spawner
			if(this.active) this.spawnParticles(2*Game.Player.particlesPerRoad/Game.fps);
			else this.spawnParticles(Game.Player.particlesPerRoad/Game.fps);
			
			// refresh particles
			var player=Game.Player, i, me, collided,
				speed = this.active?15:7;
			speed*=player.slowdown+1;
			
			// collision detection
			for(i in this.particles){
				me=this.particles[i];
				collided=(player.x < me.x + me.width && player.x + player.width > me.x &&
					player.y < me.y + me.height && player.height + player.y > me.y);
				me.y+=speed;
				if(collided||me.y>this.height-me.height){
					if(collided) {
						if(typeof me.collisionFn==='function') {
							me.collisionFn(this.active);
						}
						player.calcSpawnRate();
					}
					delete this.particles[i];
				}
			}
		}
		
		// particles
		this.particles=[];
		this.addParticle=function(width,height,color,collisionFn){
			this.particles.push({
				x:Math.min(this.x+rand(this.width),this.x+this.width-width),
				y:0,
				width:width,
				height:height,
				color:color,
				collisionFn:collisionFn
			});
		}
		
		this.spawnParticle=function(){
			var player=Game.Player;
			var random = Math.random();
			var active=this.active;
			var color,collisionFn;
			if(random<0.2){ // red 20% chance
				color='red';
				collisionFn=function(active){
					if (active){
						player.score-=2;
						player.width+=10;
					}
					else {
						player.score--;
						player.width+=5;
					}
				}
			} else if(random<0.4){ // blue 20% chance
				color='blue';
				collisionFn=function(active){
					if (active){
						player.score-=2;
						player.width-=15;
					}
					else {
						player.score--;
						player.width-=10;
					}
				}
			} else if(random<0.425){ // purple 2.5%
				color='purple';
				collisionFn=function(active){
					if(active){
						player.score-=2;
						player.slowdown=0.8;
						player.slowdownTime=Game.fps*1.5;
					}else{
						player.score--;
						player.slowdown=0.85;
						player.slowdownTime=Game.fps*1;
					}
				}
			} else{
				color='black';
				collisionFn=function(active){
					if (active) player.score+=2;
					else player.score++;
				}
			}
			this.addParticle(10,10,color,collisionFn);
		}
		
		this.spawnParticles=function(particles){
			var i;
			for(i=0;i<perRoad;i++){
				this.spawnParticle();
			}
		}
		
		this.clearParticles=function(){
			this.particles=[];
		}
		
		Game.Roads.push(this);
	}
	
	Game.generateRoads=function(n){
		Game.RoadsN=0;
		for(var i=0;i<n;i++){
			new Game.Road();
		}
	}
	
	/**********************************
	INIT
	**********************************/
	Game.init();
	window.Game=Game;

//})();
