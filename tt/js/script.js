(function(){
	
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
		
		Game.cursorX=0;
		Game.cursorY=0;
		Game.mouseDown=0;
		window.addEventListener('mousemove',function(e){
			Game.cursorX=e.pageX;
			Game.cursorY=e.pageY;
		});
		window.addEventListener('mousedown',function(){Game.mouseDown=1;});
		window.addEventListener('mouseup',function(){Game.mouseDown=0;});
		
		// roads
		Game.generateRoads(4);
		
		// dates
		Game.started=Date.now();
		
		// states
		Game.lost=0;
		Game.paused=0;
		
		Game.draw();
		Game.loop();
	}
	
	/**********************************
	DRAW
	**********************************/
	Game.draw=function(){
		if(Game.lost) return alert('You have lost the game!\nScore: '+Game.Player.score);
		
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
		var spawnRate=Game.Player.spawnRate;
		
		// roads
		for (var i in Game.Roads){
			var me=Game.Roads[i];
			me.refresh();
			if(Game.T%spawnRate===0)me.spawnParticle();
		}
		Game.activeRoad.refresh();
		
		// player
		Game.Player.move(Game.cursorX, Infinity);
		
		// lost
		if(Game.Player.width>=Game.windowW||Game.Player.width<=0||Game.Player.score<=-10) Game.lost=1;
		
	}
	
	/**********************************
	LOOP
	**********************************/
	Game.loop=function(){
		Game.logic();
		Game.draw();
		if(Game.lost||Game.paused) return;
		
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
		x:0,y:0,
		width:80,height:25,
		score:0,
		color:'green'
	}
	
	Game.Player.move=function(x,y){
		this.x=Math.min(x,Game.windowW-this.width);
		this.y=Math.min(y,Game.windowH-this.height);
	}
	
	// draw
	Game.Player.draw=function(){
		ctx.fillStyle=this.color;
		ctx.fillRect(this.x,this.y,this.width,this.height);
	}
	
	// spawn rate
	Game.Player.spawnRate=7;
	Game.Player.calcSpawnRate=function(){
		return Game.Player.spawnRate = Game.Player.score<=1?7:Math.max(Math.floor(Math.log(Game.Player.score)/Math.log(0.1)) + 4,1);
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
				if(this.active)ctx.fillStyle=me.color[1];
				else ctx.fillStyle=me.color[0];
				ctx.fillRect(me.x,me.y,me.width,me.height);
			}
		}
		
		this.refresh=function(){
			this.width=Math.floor(Game.windowW/Game.RoadsN);
			this.height=Game.windowH;
			
			this.x=this.id*this.width;
			
			if(Game.activeRoad.current===this.id){
				this.active=true;
				this.color='rgba(0,0,0,'+(Game.activeRoad.life/Game.activeRoad.maxLife)+')';
			}
			else {
				this.active=false;
				this.color='#fff';
			}
			
			var player=Game.Player;
			for(var i in this.particles){
				var me=this.particles[i];
				var collided=(player.x < me.x + me.width && player.x + player.width > me.x &&
					player.y < me.y + me.height && player.height + player.y > me.y);
				var speed=10;
				if(this.active) speed=20;
				me.y+=speed;
				if(collided||me.y>this.height-me.height){
					if(collided) {
						if(typeof me.collisionFn==='function') {
							if(this.active) me.collisionFn(1);
							else me.collisionFn();
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
			if(typeof color==='string')color=[color,color];
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
			if(random<0.3){
				color='red';
				collisionFn=function(active){
					if (active){
						player.score-=2;
						player.width+=15;
					}
					else {
						player.score--;
						player.width+=10;
					}
				}
			} else if(random<0.6){
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
			} else{
				color=['#000','#fff'];
				collisionFn=function(active){
					if (active) player.score+=2;
					else player.score++;
				}
			}
			this.addParticle(10,10,color,collisionFn);
		}
		this.spawnParticles=function(n){
			for(var i=0;i<n;i++){
				this.spawnParticle();
			}
		}
		this.clearParticle=function(){
			this.particles=[];
		}
		
		Game.Roads.push(this);
	}
	
	Game.generateRoads=function(n){
		for(var i=0;i<n;i++){
			new Game.Road();
		}
	}
	
	/**********************************
	INIT
	**********************************/
	Game.init();
	window.Game=Game;

})();